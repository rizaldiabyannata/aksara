import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { findSession } from "@/lib/auth/session";
import { loginStudent } from "@/lib/auth/login";
import {
  createStudent,
  listStudents,
  revokeStudentSessions,
  setStudentActive,
  updateStudent,
} from "@/lib/students";
import { makeClass, makeStudent, makeTeacher } from "../tests/factories";

const ip = "203.0.113.9";
const login = (classCode: string, identity: string) =>
  loginStudent({ classCode, identity, ip });
const audits = (entityId: string, action?: string) =>
  prisma.auditLog.findMany({ where: { entityId, ...(action ? { action: action as never } : {}) } });

async function setup() {
  const c = await makeClass();
  const t = (await makeTeacher()).user.id;
  return { c, t };
}

describe("createStudent", () => {
  it("lets a new student log in by name and by NIS; stores tidy name, normalized login", async () => {
    const { c, t } = await setup();
    const r = await createStudent(t, {
      displayName: "  Budi   Santoso ",
      nis: " 12345 ",
      classId: c.id,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const u = await prisma.user.findUniqueOrThrow({ where: { id: r.id } });
    expect(u).toMatchObject({
      role: "STUDENT",
      displayName: "Budi Santoso",
      loginName: "budi santoso",
      nis: "12345",
      classId: c.id,
    });
    expect((await login(c.code, "BUDI santoso")).ok).toBe(true);
    expect((await login(c.code, "12345")).ok).toBe(true);
    const a = await audits(r.id, "STUDENT_CREATED");
    expect(a).toHaveLength(1);
    expect(a[0].actorUserId).toBe(t);
  });

  it("empty or missing NIS becomes null (twice, no unique clash)", async () => {
    const { c, t } = await setup();
    const a = await createStudent(t, { displayName: "Ani", nis: "", classId: c.id });
    const b = await createStudent(t, { displayName: "Beni", classId: c.id });
    expect(a.ok && b.ok).toBe(true);
    expect(await prisma.user.count({ where: { nis: null, role: "STUDENT" } })).toBe(2);
  });

  it("same name in the same class is NAME_TAKEN (case/space-insensitive) with className; other class is ok", async () => {
    const { c, t } = await setup();
    const other = await makeClass();
    expect((await createStudent(t, { displayName: "Budi", classId: c.id })).ok).toBe(true);
    expect(await createStudent(t, { displayName: "budi ", classId: c.id })).toEqual({
      ok: false,
      error: "NAME_TAKEN",
      className: c.name,
    });
    expect((await createStudent(t, { displayName: "budi", classId: other.id })).ok).toBe(true);
  });

  it("rejects digits-only name, bad NIS, long name with Indonesian fieldErrors", async () => {
    const { c, t } = await setup();
    const r = await createStudent(t, { displayName: "12345", classId: c.id });
    expect(r).toMatchObject({ ok: false, error: "INVALID" });
    expect(r.ok === false && "fieldErrors" in r && r.fieldErrors?.displayName).toBe(
      "Nama tidak boleh hanya angka.",
    );
    for (const nis of ["12a", "123", "1".repeat(21)]) {
      const x = await createStudent(t, { displayName: "Ani", nis, classId: c.id });
      expect(x).toMatchObject({ ok: false, error: "INVALID" });
      expect(x.ok === false && "fieldErrors" in x && x.fieldErrors?.nis).toBe(
        "NIS harus 4–20 angka.",
      );
    }
    for (const name of ["", "   ", "a".repeat(61)]) {
      expect(await createStudent(t, { displayName: name, classId: c.id })).toMatchObject({
        ok: false,
        error: "INVALID",
        fieldErrors: { displayName: expect.any(String) },
      });
    }
    expect(await prisma.user.count({ where: { role: "STUDENT" } })).toBe(0);
  });

  it("invalid shapes (null, string, missing, wrong types) are INVALID with messages", async () => {
    const { c, t } = await setup();
    for (const input of [null, "x", undefined, {}, { displayName: 5, classId: c.id }, { displayName: "A", nis: 1234, classId: c.id }, { displayName: "A" }]) {
      const r = await createStudent(t, input);
      expect(r).toMatchObject({ ok: false, error: "INVALID" });
      if (!r.ok && r.error === "INVALID") {
        expect(Object.values(r.fieldErrors).every((m) => m.length > 0)).toBe(true);
        expect(Object.keys(r.fieldErrors).length).toBeGreaterThan(0);
      }
    }
  });

  it("duplicate NIS is NIS_TAKEN, even across classes", async () => {
    const { c, t } = await setup();
    const other = await makeClass();
    await createStudent(t, { displayName: "Ani", nis: "9999", classId: c.id });
    expect(
      await createStudent(t, { displayName: "Beni", nis: "9999", classId: other.id }),
    ).toEqual({ ok: false, error: "NIS_TAKEN" });
  });

  it("unknown class is CLASS_NOT_FOUND; inactive class is allowed", async () => {
    const { t } = await setup();
    expect(await createStudent(t, { displayName: "Ani", classId: "nope" })).toEqual({
      ok: false,
      error: "CLASS_NOT_FOUND",
    });
    const off = await makeClass({ isActive: false });
    expect((await createStudent(t, { displayName: "Ani", classId: off.id })).ok).toBe(true);
  });

  it("ignores a role (and other extra keys) in the input", async () => {
    const { c, t } = await setup();
    const r = await createStudent(t, {
      displayName: "Ani",
      classId: c.id,
      role: "TEACHER",
      isActive: false,
      passwordHash: "x",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const u = await prisma.user.findUniqueOrThrow({ where: { id: r.id } });
    expect(u).toMatchObject({ role: "STUDENT", isActive: true, passwordHash: null });
  });
});

describe("updateStudent", () => {
  it("audits only the changed field names; no-op writes no audit", async () => {
    const { c, t } = await setup();
    const r = await createStudent(t, { displayName: "Ani", nis: "1111", classId: c.id });
    if (!r.ok) throw new Error("setup");
    expect(
      await updateStudent(t, r.id, { displayName: "Ani Lestari", nis: "1111", classId: c.id }),
    ).toEqual({ ok: true });
    const a = await audits(r.id, "STUDENT_UPDATED");
    expect(a).toHaveLength(1);
    expect(a[0].metadata).toEqual({ fields: ["displayName"] });
    expect(
      await updateStudent(t, r.id, { displayName: "  Ani   Lestari ", nis: "1111", classId: c.id }),
    ).toEqual({ ok: true });
    expect(await audits(r.id, "STUDENT_UPDATED")).toHaveLength(1);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: r.id } });
    expect(u.loginName).toBe("ani lestari");
  });

  it("can clear the NIS; NOT_FOUND for unknown id and for a teacher id", async () => {
    const { c, t } = await setup();
    const r = await createStudent(t, { displayName: "Ani", nis: "1111", classId: c.id });
    if (!r.ok) throw new Error("setup");
    await updateStudent(t, r.id, { displayName: "Ani", nis: "", classId: c.id });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: r.id } })).nis).toBeNull();
    const body = { displayName: "X", classId: c.id };
    expect(await updateStudent(t, "nope", body)).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(await updateStudent(t, t, body)).toEqual({ ok: false, error: "NOT_FOUND" });
  });

  it("reports NAME_TAKEN / NIS_TAKEN / CLASS_NOT_FOUND / INVALID", async () => {
    const { c, t } = await setup();
    const a = await createStudent(t, { displayName: "Ani", nis: "1111", classId: c.id });
    const b = await createStudent(t, { displayName: "Beni", nis: "2222", classId: c.id });
    if (!a.ok || !b.ok) throw new Error("setup");
    expect(
      await updateStudent(t, b.id, { displayName: "ANI", nis: "2222", classId: c.id }),
    ).toEqual({ ok: false, error: "NAME_TAKEN", className: c.name });
    expect(
      await updateStudent(t, b.id, { displayName: "Beni", nis: "1111", classId: c.id }),
    ).toEqual({ ok: false, error: "NIS_TAKEN" });
    expect(await updateStudent(t, b.id, { displayName: "Beni", classId: "nope" })).toEqual({
      ok: false,
      error: "CLASS_NOT_FOUND",
    });
    expect(await updateStudent(t, b.id, { displayName: "123456", classId: c.id })).toMatchObject({
      ok: false,
      error: "INVALID",
    });
  });

  it("moving class: old code+name stops working, new code works, session survives (D8); clash in target is NAME_TAKEN", async () => {
    const { c, t } = await setup();
    const dest = await makeClass();
    const r = await createStudent(t, { displayName: "Budi", classId: c.id });
    if (!r.ok) throw new Error("setup");
    const l = await login(c.code, "budi");
    if (!l.ok) throw new Error("login");

    expect(await updateStudent(t, r.id, { displayName: "Budi", classId: dest.id })).toEqual({
      ok: true,
    });
    expect(await login(c.code, "budi")).toMatchObject({ ok: false, error: "INVALID" });
    expect((await login(dest.code, "budi")).ok).toBe(true);
    const a = await audits(r.id, "STUDENT_UPDATED");
    expect(a[0].metadata).toEqual({ fields: ["classId"] });

    // the pre-move session was replaced only by the later login, not by the move itself
    const r2 = await createStudent(t, { displayName: "Cici", classId: c.id });
    if (!r2.ok) throw new Error("setup");
    const l2 = await login(c.code, "cici");
    if (!l2.ok) throw new Error("login");
    await updateStudent(t, r2.id, { displayName: "Cici", classId: dest.id });
    expect((await findSession(l2.token)).status).toBe("ok");

    await createStudent(t, { displayName: "Dodi", classId: c.id });
    await createStudent(t, { displayName: "dodi", classId: dest.id });
    const d = await prisma.user.findFirstOrThrow({ where: { classId: c.id, loginName: "dodi" } });
    expect(await updateStudent(t, d.id, { displayName: "Dodi", classId: dest.id })).toEqual({
      ok: false,
      error: "NAME_TAKEN",
      className: dest.name,
    });
  });
});

describe("revokeStudentSessions", () => {
  it("makes the next request report revoked, audits the count; NOT_FOUND otherwise", async () => {
    const { c, t } = await setup();
    const s = await makeStudent(c.id, { loginName: "ani" });
    const l = await login(c.code, "ani");
    if (!l.ok) throw new Error("login");
    expect(await revokeStudentSessions(t, s.id)).toEqual({ ok: true, revoked: 1 });
    expect(await findSession(l.token)).toEqual({ status: "revoked", reason: "REVOKED" });
    const a = await audits(s.id, "STUDENT_SESSIONS_REVOKED");
    expect(a[0].metadata).toEqual({ revoked: 1 });
    expect(await revokeStudentSessions(t, "nope")).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(await revokeStudentSessions(t, t)).toEqual({ ok: false, error: "NOT_FOUND" });
  });
});

describe("setStudentActive", () => {
  it("deactivating blocks login and rejects the old session; reactivating does not revive the cookie (D12)", async () => {
    const { c, t } = await setup();
    const s = await makeStudent(c.id, { loginName: "ani" });
    const l = await login(c.code, "ani");
    if (!l.ok) throw new Error("login");

    expect(await setStudentActive(t, s.id, false)).toEqual({ ok: true });
    expect(await login(c.code, "ani")).toMatchObject({ ok: false, error: "INVALID" });
    expect((await findSession(l.token)).status).not.toBe("ok");
    const d = await audits(s.id, "STUDENT_DEACTIVATED");
    expect(d).toHaveLength(1);
    expect(d[0].metadata).toEqual({ revoked: 1 });

    expect(await setStudentActive(t, s.id, true)).toEqual({ ok: true });
    expect((await findSession(l.token)).status).not.toBe("ok");
    expect(await audits(s.id, "STUDENT_ACTIVATED")).toHaveLength(1);
    expect((await login(c.code, "ani")).ok).toBe(true);
  });

  it("same state is a no-op without audit; NOT_FOUND for unknown/teacher", async () => {
    const { c, t } = await setup();
    const s = await makeStudent(c.id);
    expect(await setStudentActive(t, s.id, true)).toEqual({ ok: true });
    expect(await audits(s.id)).toHaveLength(0);
    expect(await setStudentActive(t, "nope", false)).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(await setStudentActive(t, t, false)).toEqual({ ok: false, error: "NOT_FOUND" });
  });
});

describe("listStudents", () => {
  it("counts a replaced session after 2 logins, exposes only the safe keys", async () => {
    const { c, t } = await setup();
    const s = await makeStudent(c.id, { loginName: "ani", displayName: "Ani" });
    const other = await makeStudent(c.id, { loginName: "beni", displayName: "Beni" });
    await login(c.code, "ani");
    await login(c.code, "ani");
    await login(c.code, "beni");
    const rows = await listStudents({ classId: c.id });
    const row = rows.find((r) => r.id === s.id)!;
    expect(row.replacedCount7d).toBe(1);
    expect(row.lastReplacedAt).toBeInstanceOf(Date);
    expect(rows.find((r) => r.id === other.id)!).toMatchObject({
      replacedCount7d: 0,
      lastReplacedAt: null,
    });
    for (const r of rows) {
      expect(Object.keys(r).sort()).toEqual(
        ["classId", "className", "displayName", "id", "isActive", "lastReplacedAt", "nis", "replacedCount7d"],
      );
    }
    expect(rows.some((r) => r.id === t)).toBe(false);
  });

  it("ignores replacements older than 7 days", async () => {
    const { c } = await setup();
    const s = await makeStudent(c.id);
    await prisma.auditLog.create({
      data: {
        actorUserId: s.id,
        action: "STUDENT_SESSION_REPLACED",
        entityType: "User",
        entityId: s.id,
        metadata: { revoked: 1 },
        createdAt: new Date(Date.now() - 8 * 86400_000),
      },
    });
    expect((await listStudents({ classId: c.id }))[0].replacedCount7d).toBe(0);
  });

  it("filters by class and q (name contains, NIS prefix); orders by class then name", async () => {
    const a = await makeClass({ name: "6A" });
    const b = await makeClass({ name: "6B" });
    await makeTeacher();
    const x = await makeStudent(b.id, { displayName: "Zed", loginName: "zed" });
    const y = await makeStudent(a.id, { displayName: "Budi Santoso", loginName: "budi santoso", nis: "123456" });
    const z = await makeStudent(a.id, { displayName: "Andi", loginName: "andi", nis: "999123" });
    expect((await listStudents({})).map((r) => r.id)).toEqual([z.id, y.id, x.id]);
    expect((await listStudents({ classId: b.id })).map((r) => r.id)).toEqual([x.id]);
    expect((await listStudents({ q: "SANTO" })).map((r) => r.id)).toEqual([y.id]);
    expect((await listStudents({ q: "123" })).map((r) => r.id)).toEqual([y.id]); // prefix, not contains
    expect((await listStudents({ q: "  " })).length).toBe(3);
  });
});
