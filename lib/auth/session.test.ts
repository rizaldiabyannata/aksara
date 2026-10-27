import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import {
  createSession,
  deleteSession,
  findSession,
  revokeSessions,
} from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { makeClass, makeStudent, makeTeacher } from "../../tests/factories";

afterEach(() => {
  vi.useRealTimers();
});

const HOUR = 3600_000;

describe("sessions", () => {
  it("finds a new session with exactly the 5 SessionUser keys", async () => {
    const c = await makeClass();
    const s = await makeStudent(c.id);
    const { token } = await createSession(prisma, s);
    const r = await findSession(token);
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(Object.keys(r.user).sort()).toEqual(
      ["classId", "displayName", "id", "mustChangePassword", "role"].sort(),
    );
    expect(r.user.id).toBe(s.id);
  });

  it("stores only the hash of the token", async () => {
    const s = await makeStudent((await makeClass()).id);
    const { token } = await createSession(prisma, s);
    const row = await prisma.session.findFirstOrThrow();
    expect(row.tokenHash).not.toBe(token);
    expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("expires students after 8h but teachers last longer", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const s = await makeStudent((await makeClass()).id);
    const { user: t } = await makeTeacher();
    const a = await createSession(prisma, s);
    const b = await createSession(prisma, t);
    vi.setSystemTime(Date.now() + 8 * HOUR + 1000);
    expect((await findSession(a.token)).status).toBe("none");
    expect((await findSession(b.token)).status).toBe("ok");
  });

  it("returns none for inactive user, inactive class, unknown token", async () => {
    const c = await makeClass();
    const s = await makeStudent(c.id);
    const s2 = await makeStudent(c.id);
    const a = await createSession(prisma, s);
    const b = await createSession(prisma, s2);
    await prisma.user.update({ where: { id: s.id }, data: { isActive: false } });
    expect((await findSession(a.token)).status).toBe("none");
    await prisma.class.update({ where: { id: c.id }, data: { isActive: false } });
    expect((await findSession(b.token)).status).toBe("none");
    expect((await findSession("acak")).status).toBe("none");
  });

  it("soft-revokes by user with reason and returns the count", async () => {
    const s = await makeStudent((await makeClass()).id);
    const { token } = await createSession(prisma, s);
    expect(await revokeSessions(prisma, { userId: s.id }, "REPLACED")).toBe(1);
    expect(await findSession(token)).toEqual({
      status: "revoked",
      reason: "REPLACED",
    });
    expect(await revokeSessions(prisma, { userId: s.id }, "REVOKED")).toBe(0);
  });

  it("revokes by class only for students in that class", async () => {
    const c1 = await makeClass();
    const c2 = await makeClass();
    const a = await createSession(prisma, await makeStudent(c1.id));
    const b = await createSession(prisma, await makeStudent(c2.id));
    const { user: t } = await makeTeacher();
    const tt = await createSession(prisma, t);
    expect(await revokeSessions(prisma, { classId: c1.id }, "REVOKED")).toBe(1);
    expect((await findSession(a.token)).status).toBe("revoked");
    expect((await findSession(b.token)).status).toBe("ok");
    expect((await findSession(tt.token)).status).toBe("ok");
  });

  it("does not revoke expired sessions; expired reads as none", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const s = await makeStudent((await makeClass()).id);
    const { token } = await createSession(prisma, s);
    vi.setSystemTime(Date.now() + 9 * HOUR);
    expect(await revokeSessions(prisma, { userId: s.id }, "REVOKED")).toBe(0);
    expect((await findSession(token)).status).toBe("none");
  });

  it("works inside a transaction and deleteSession removes the row", async () => {
    const s = await makeStudent((await makeClass()).id);
    const { token } = await prisma.$transaction((tx) => createSession(tx, s));
    await deleteSession(token);
    expect((await findSession(token)).status).toBe("none");
    expect(await prisma.session.count()).toBe(0);
  });
});

describe("writeAudit", () => {
  it("inserts a row", async () => {
    const { user } = await makeTeacher();
    await writeAudit(prisma, {
      actorUserId: user.id,
      action: "CLASS_CREATED",
      entityType: "Class",
      entityId: "x",
      metadata: { ids: ["a"], n: 1 },
    });
    const row = await prisma.auditLog.findFirstOrThrow();
    expect(row.action).toBe("CLASS_CREATED");
    expect(row.metadata).toEqual({ ids: ["a"], n: 1 });
  });
});
