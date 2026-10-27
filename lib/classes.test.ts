import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { findSession } from "@/lib/auth/session";
import { loginStudent } from "@/lib/auth/login";
import {
  createClass,
  createClassWithCodes,
  generateClassCode,
  listClasses,
  renameClass,
  revokeClassSessions,
  rotateClassCode,
  setClassActive,
} from "@/lib/classes";
import { makeClass, makeStudent, makeTeacher } from "../tests/factories";

const ip = "203.0.113.9";
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

async function actor() {
  return (await makeTeacher()).user.id;
}
const audits = (entityId: string) =>
  prisma.auditLog.findMany({ where: { entityId } });
async function loginAs(code: string, nis: string) {
  const r = await loginStudent({ classCode: code, identity: nis, ip });
  if (!r.ok) throw new Error("login failed");
  return r.token;
}

describe("generateClassCode", () => {
  it("uses only the alphabet, length 6, and covers every character", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const c = generateClassCode();
      expect(c).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
      for (const ch of c) seen.add(ch);
    }
    expect([...seen].sort().join("")).toBe([...ALPHABET].sort().join(""));
  });
});

describe("createClass", () => {
  it("creates, trims the name, and writes exactly one audit without the code", async () => {
    const a = await actor();
    const r = await createClass(a, { name: "  VI A " });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const c = await prisma.class.findUniqueOrThrow({ where: { id: r.id } });
    expect(c.name).toBe("VI A");
    const rows = await audits(r.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: "CLASS_CREATED", actorUserId: a });
    expect(JSON.stringify(rows[0].metadata ?? null)).not.toContain(c.code);
  });

  it("rejects duplicate names with NAME_TAKEN and no extra audit", async () => {
    const a = await actor();
    await createClass(a, { name: "VI A" });
    const r = await createClass(a, { name: "VI A" });
    expect(r).toMatchObject({ ok: false, error: "NAME_TAKEN" });
    expect(await prisma.auditLog.count({ where: { action: "CLASS_CREATED" } })).toBe(1);
  });

  it.each([
    ["empty", { name: "" }],
    ["blank", { name: "   " }],
    ["31 chars", { name: "a".repeat(31) }],
    ["missing", {}],
    ["wrong type", { name: 5 }],
    ["not an object", "x"],
    ["null", null],
  ])("rejects %s as INVALID with Indonesian messages", async (_l, input) => {
    const r = await createClass(await actor(), input);
    expect(r).toMatchObject({ ok: false, error: "INVALID" });
    if (r.ok || r.error !== "INVALID") return;
    const msgs = Object.values(r.fieldErrors ?? {});
    expect(msgs.length).toBeGreaterThan(0);
    for (const m of msgs) expect(m).not.toMatch(/Invalid|Expected|Required|expected/);
  });

  it("accepts a 30-char name", async () => {
    expect((await createClass(await actor(), { name: "a".repeat(30) })).ok).toBe(true);
  });

  it("retries on a code collision", async () => {
    const a = await actor();
    await makeClass({ code: "AAAAAA" });
    const codes = ["AAAAAA", "AAAAAA", "BBBBBB"];
    const r = await createClassWithCodes(a, { name: "Baru" }, () => codes.shift()!);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect((await prisma.class.findUniqueOrThrow({ where: { id: r.id } })).code).toBe("BBBBBB");
    }
  });

  it("gives up after 5 code collisions", async () => {
    const a = await actor();
    await makeClass({ code: "AAAAAA" });
    let calls = 0;
    await expect(
      createClassWithCodes(a, { name: "Baru" }, () => (calls++, "AAAAAA")),
    ).rejects.toThrow();
    expect(calls).toBe(5);
  });
});

describe("renameClass", () => {
  it("renames with one audit; NAME_TAKEN, INVALID, NOT_FOUND", async () => {
    const a = await actor();
    const c1 = await makeClass({ name: "X1" });
    await makeClass({ name: "X2" });
    expect(await renameClass(a, c1.id, { name: " Y1 " })).toEqual({ ok: true });
    expect((await prisma.class.findUniqueOrThrow({ where: { id: c1.id } })).name).toBe("Y1");
    expect((await audits(c1.id)).map((r) => r.action)).toEqual(["CLASS_UPDATED"]);
    expect(await renameClass(a, c1.id, { name: "X2" })).toMatchObject({ error: "NAME_TAKEN" });
    expect(await renameClass(a, c1.id, { name: "" })).toMatchObject({ error: "INVALID" });
    expect(await renameClass(a, "nope", { name: "Z" })).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(await audits(c1.id)).toHaveLength(1);
  });
});

describe("rotateClassCode", () => {
  it("changes the code, old login INVALID, new ok, existing session survives", async () => {
    const a = await actor();
    const c = await makeClass({ code: "ABCDEF" });
    await makeStudent(c.id, { nis: "1111" });
    const token = await loginAs("ABCDEF", "1111");
    expect(await rotateClassCode(a, c.id)).toEqual({ ok: true });
    const after = await prisma.class.findUniqueOrThrow({ where: { id: c.id } });
    expect(after.code).not.toBe("ABCDEF");
    expect(after.codeRotatedAt.getTime()).toBeGreaterThan(c.codeRotatedAt.getTime());
    expect(await loginStudent({ classCode: "ABCDEF", identity: "1111", ip })).toMatchObject({
      ok: false,
      error: "INVALID",
    });
    // Check before the new login: a new login legitimately replaces the old session.
    expect((await findSession(token)).status).toBe("ok");
    expect((await loginStudent({ classCode: after.code, identity: "1111", ip })).ok).toBe(true);
    const rows = await audits(c.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe("CLASS_CODE_ROTATED");
    const s = JSON.stringify(rows[0].metadata ?? null);
    expect(s).not.toContain("ABCDEF");
    expect(s).not.toContain(after.code);
  });

  it("NOT_FOUND for unknown id", async () => {
    expect(await rotateClassCode(await actor(), "nope")).toEqual({ ok: false, error: "NOT_FOUND" });
  });
});

describe("revokeClassSessions", () => {
  it("revokes only that class's sessions", async () => {
    const a = await actor();
    const c1 = await makeClass();
    const c2 = await makeClass();
    await makeStudent(c1.id, { nis: "2001" });
    await makeStudent(c2.id, { nis: "2002" });
    const t1 = await loginAs(c1.code, "2001");
    const t2 = await loginAs(c2.code, "2002");
    expect(await revokeClassSessions(a, c1.id)).toEqual({ ok: true, revoked: 1 });
    expect(await findSession(t1)).toEqual({ status: "revoked", reason: "REVOKED" });
    expect((await findSession(t2)).status).toBe("ok");
    const rows = await audits(c1.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: "CLASS_SESSIONS_REVOKED", metadata: { revoked: 1 } });
    expect(await revokeClassSessions(a, "nope")).toEqual({ ok: false, error: "NOT_FOUND" });
  });
});

describe("setClassActive", () => {
  it("deactivate revokes sessions; reactivate keeps old cookie rejected", async () => {
    const a = await actor();
    const c = await makeClass();
    await makeStudent(c.id, { nis: "3001" });
    const old = await loginAs(c.code, "3001");

    expect(await setClassActive(a, c.id, false)).toEqual({ ok: true });
    expect(await loginStudent({ classCode: c.code, identity: "3001", ip })).toMatchObject({
      ok: false,
      error: "INVALID",
    });
    expect(await findSession(old)).toEqual({ status: "revoked", reason: "REVOKED" });

    expect(await setClassActive(a, c.id, true)).toEqual({ ok: true });
    expect(await findSession(old)).toEqual({ status: "revoked", reason: "REVOKED" });
    expect((await loginStudent({ classCode: c.code, identity: "3001", ip })).ok).toBe(true);

    const rows = await audits(c.id);
    expect(rows.map((r) => r.action).sort()).toEqual(["CLASS_ACTIVATED", "CLASS_DEACTIVATED"]);
    expect(rows.find((r) => r.action === "CLASS_DEACTIVATED")?.metadata).toEqual({ revoked: 1 });
    expect(JSON.stringify(rows.map((r) => r.metadata))).not.toContain(c.code);
  });

  it("is a no-op (ok, no audit) when already in that state; NOT_FOUND for unknown", async () => {
    const a = await actor();
    const c = await makeClass();
    expect(await setClassActive(a, c.id, true)).toEqual({ ok: true });
    expect(await audits(c.id)).toHaveLength(0);
    expect(await setClassActive(a, "nope", false)).toEqual({ ok: false, error: "NOT_FOUND" });
  });
});

describe("listClasses", () => {
  it("returns exactly the listed fields ordered by name, with studentCount", async () => {
    const b = await makeClass({ name: "B" });
    await makeClass({ name: "A" });
    await makeStudent(b.id);
    await makeStudent(b.id);
    const l = await listClasses();
    expect(l.map((x) => x.name)).toEqual(["A", "B"]);
    expect(Object.keys(l[1]).sort()).toEqual([
      "code",
      "codeRotatedAt",
      "id",
      "isActive",
      "name",
      "studentCount",
    ]);
    expect(l[1].studentCount).toBe(2);
    expect(l[0].studentCount).toBe(0);
  });
});
