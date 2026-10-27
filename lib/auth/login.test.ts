import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { findSession } from "@/lib/auth/session";
import { verifyDummyPassword } from "@/lib/auth/password";
import { throttleKey } from "@/lib/auth/throttle";
import {
  changeTeacherPassword,
  loginStudent,
  loginTeacher,
  logout,
} from "@/lib/auth/login";
import { makeClass, makeStudent, makeTeacher } from "../../tests/factories";

// ESM bindings can't be spied on; wrap the real function so calls are observable.
vi.mock("@/lib/auth/password", async (orig) => {
  const m = await orig<typeof import("@/lib/auth/password")>();
  return { ...m, verifyDummyPassword: vi.fn(m.verifyDummyPassword) };
});

const INVALID = { ok: false, error: "INVALID" };
const ip = "203.0.113.7";

beforeEach(() => {
  vi.mocked(verifyDummyPassword).mockClear();
});

const activeSessions = (userId: string) =>
  prisma.session.count({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
  });

describe("loginStudent", () => {
  it("logs in by NIS, by messy name, and with a spaced lowercase code", async () => {
    const c = await makeClass({ code: "ABCDEF" });
    const s = await makeStudent(c.id, {
      loginName: "budi santoso",
      nis: "12345",
    });

    const byNis = await loginStudent({ classCode: "ABCDEF", identity: "12345", ip });
    expect(byNis).toMatchObject({ ok: true, mustChangePassword: false });

    const byName = await loginStudent({
      classCode: " abc def ",
      identity: "  BUDI   santoso ",
      ip,
    });
    expect(byName.ok).toBe(true);
    if (!byName.ok) return;
    expect(byName.expiresAt).toBeInstanceOf(Date);
    const found = await findSession(byName.token);
    expect(found.status === "ok" && found.user.id).toBe(s.id);
  });

  it("rejects a right NIS or name with another class's code", async () => {
    const a = await makeClass();
    const b = await makeClass();
    await makeStudent(a.id, { loginName: "budi santoso", nis: "12345" });

    expect(await loginStudent({ classCode: b.code, identity: "12345", ip })).toEqual(INVALID);
    expect(
      await loginStudent({ classCode: b.code, identity: "Budi Santoso", ip }),
    ).toEqual(INVALID);
  });

  it("returns the identical INVALID shape for every failure kind", async () => {
    const inactiveClass = await makeClass({ isActive: false });
    await makeStudent(inactiveClass.id, { loginName: "ani" });
    const c = await makeClass();
    await makeStudent(c.id, { loginName: "dewi", isActive: false });
    await makeStudent(c.id, { loginName: "budi" });

    const results = await Promise.all([
      loginStudent({ classCode: inactiveClass.code, identity: "ani", ip }),
      loginStudent({ classCode: c.code, identity: "dewi", ip }),
      loginStudent({ classCode: "ZZZZZZ", identity: "budi", ip }),
      loginStudent({ classCode: c.code, identity: "bukan budi", ip }),
    ]);
    for (const r of results) expect(r).toEqual(INVALID);
  });

  it("second login replaces the first session and audits it", async () => {
    const c = await makeClass();
    const s = await makeStudent(c.id, { loginName: "budi" });

    const first = await loginStudent({ classCode: c.code, identity: "budi", ip });
    const second = await loginStudent({ classCode: c.code, identity: "budi", ip });
    if (!first.ok || !second.ok) throw new Error("login failed");

    expect(await findSession(first.token)).toEqual({
      status: "revoked",
      reason: "REPLACED",
    });
    expect((await findSession(second.token)).status).toBe("ok");
    expect(await activeSessions(s.id)).toBe(1);

    const audits = await prisma.auditLog.findMany({
      where: { action: "STUDENT_SESSION_REPLACED" },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      actorUserId: s.id,
      entityType: "User",
      entityId: s.id,
      metadata: { revoked: 1 },
    });
  });

  it("first login writes no replacement audit; old revoked rows are cleaned up", async () => {
    const c = await makeClass();
    const s = await makeStudent(c.id, { loginName: "budi" });
    const login = () => loginStudent({ classCode: c.code, identity: "budi", ip });

    await login();
    expect(await prisma.auditLog.count()).toBe(0);
    await login();
    await login();
    // Third login deletes the row revoked by the second; only last two remain.
    expect(await prisma.session.count({ where: { userId: s.id } })).toBe(2);
  });

  it("two parallel logins leave exactly one active session, the loser REPLACED", async () => {
    const c = await makeClass();
    const s = await makeStudent(c.id, { loginName: "budi" });
    const login = () => loginStudent({ classCode: c.code, identity: "budi", ip });

    const [r1, r2] = await Promise.all([login(), login()]);
    if (!r1.ok || !r2.ok) throw new Error("login failed");

    expect(await activeSessions(s.id)).toBe(1);
    const statuses = [await findSession(r1.token), await findSession(r2.token)];
    expect(statuses.filter((x) => x.status === "ok")).toHaveLength(1);
    expect(statuses).toContainEqual({ status: "revoked", reason: "REPLACED" });
  });

  it("throttles after 10 attempts on one code+identity", async () => {
    const c = await makeClass();
    await makeStudent(c.id, { loginName: "budi" });
    for (let i = 0; i < 10; i++) {
      await loginStudent({ classCode: c.code, identity: "salah", ip });
    }
    expect(await loginStudent({ classCode: c.code, identity: "salah", ip })).toEqual({
      ok: false,
      error: "THROTTLED",
    });
  });
});

describe("shared-IP throttling", () => {
  const ipCount = async (key: { key: string }) =>
    (await prisma.loginThrottle.findUnique({ where: { key: key.key } }))?.failCount;

  it("a throttled student identity stops charging the IP key", async () => {
    const c = await makeClass();
    for (let i = 0; i < 30; i++) {
      await loginStudent({ classCode: c.code, identity: "salah", ip });
    }
    expect(await ipCount(throttleKey.ip(ip))).toBe(10);
  });

  it("100 failed student attempts from one IP don't throttle the teacher", async () => {
    const c = await makeClass();
    const { user, password } = await makeTeacher();
    for (let i = 0; i < 100; i++) {
      await loginStudent({ classCode: c.code, identity: `salah ${i}`, ip });
    }
    expect(await loginStudent({ classCode: c.code, identity: "baru", ip })).toEqual({
      ok: false,
      error: "THROTTLED",
    });
    expect(await loginTeacher({ username: user.username!, password, ip })).toMatchObject({
      ok: true,
    });
    expect(await ipCount(throttleKey.teacherIp(ip))).toBe(0);
  });
});

describe("loginTeacher", () => {
  it("logs in and reports mustChangePassword", async () => {
    const { user, password } = await makeTeacher();
    const r = await loginTeacher({ username: ` ${user.username!.toUpperCase()} `, password, ip });
    expect(r).toMatchObject({ ok: true, mustChangePassword: false });
    if (!r.ok) return;
    expect((await findSession(r.token)).status).toBe("ok");
  });

  it("new teacher → mustChangePassword: true", async () => {
    const { user, password } = await makeTeacher({ mustChangePassword: true });
    const r = await loginTeacher({ username: user.username!, password, ip });
    expect(r).toMatchObject({ ok: true, mustChangePassword: true });
  });

  it("teacher may hold several sessions", async () => {
    const { user, password } = await makeTeacher();
    await loginTeacher({ username: user.username!, password, ip });
    await loginTeacher({ username: user.username!, password, ip });
    expect(await activeSessions(user.id)).toBe(2);
  });

  it("5 wrong passwords then the right one → THROTTLED", async () => {
    const { user, password } = await makeTeacher();
    for (let i = 0; i < 5; i++) {
      expect(
        await loginTeacher({ username: user.username!, password: "salah-salah-salah", ip }),
      ).toEqual(INVALID);
    }
    expect(await loginTeacher({ username: user.username!, password, ip })).toEqual({
      ok: false,
      error: "THROTTLED",
    });
  });

  it("unknown username → INVALID after a dummy verify, 6th try THROTTLED", async () => {
    for (let i = 0; i < 5; i++) {
      expect(
        await loginTeacher({ username: "tidakada", password: "apa-saja-123", ip }),
      ).toEqual(INVALID);
    }
    expect(verifyDummyPassword).toHaveBeenCalledTimes(5);
    expect(
      await loginTeacher({ username: "tidakada", password: "apa-saja-123", ip }),
    ).toEqual({ ok: false, error: "THROTTLED" });
  });

  it("inactive teacher or a malformed hash → INVALID", async () => {
    const off = await makeTeacher({ isActive: false });
    const broken = await makeTeacher({ passwordHash: "bukan-hash" });
    expect(
      await loginTeacher({ username: off.user.username!, password: off.password, ip }),
    ).toEqual(INVALID);
    expect(
      await loginTeacher({ username: broken.user.username!, password: broken.password, ip }),
    ).toEqual(INVALID);
  });
});

describe("changeTeacherPassword", () => {
  const NEW = "kata-sandi-baru-456";

  it("wrong current password → WRONG_PASSWORD", async () => {
    const { user } = await makeTeacher();
    expect(
      await changeTeacherPassword(user.id, {
        currentPassword: "bukan-yang-lama",
        newPassword: NEW,
        confirmPassword: NEW,
      }),
    ).toEqual({ ok: false, error: "WRONG_PASSWORD" });
  });

  it("validates fields with Indonesian messages", async () => {
    const { user, password } = await makeTeacher();
    const short = await changeTeacherPassword(user.id, {
      currentPassword: password,
      newPassword: "pendek",
      confirmPassword: "pendek",
    });
    expect(short).toMatchObject({ ok: false, error: "INVALID" });
    expect(!short.ok && short.fieldErrors?.newPassword).toBe(
      "Kata sandi baru minimal 12 karakter.",
    );

    const mismatch = await changeTeacherPassword(user.id, {
      currentPassword: password,
      newPassword: NEW,
      confirmPassword: NEW + "x",
    });
    expect(!mismatch.ok && mismatch.fieldErrors?.confirmPassword).toBe(
      "Konfirmasi kata sandi tidak sama.",
    );

    const same = await changeTeacherPassword(user.id, {
      currentPassword: password,
      newPassword: password,
      confirmPassword: password,
    });
    expect(!same.ok && same.fieldErrors?.newPassword).toBeTruthy();

    expect(await changeTeacherPassword(user.id, null)).toMatchObject(INVALID);
  });

  it("missing fields and non-object input give only Indonesian messages", async () => {
    const { user } = await makeTeacher();
    const empty = await changeTeacherPassword(user.id, {});
    const nul = await changeTeacherPassword(user.id, null);
    expect(!empty.ok && empty.fieldErrors).toEqual({
      currentPassword: "Kata sandi lama wajib diisi.",
      newPassword: "Kata sandi baru wajib diisi.",
      confirmPassword: "Konfirmasi kata sandi wajib diisi.",
    });
    expect(!nul.ok && nul.fieldErrors).toEqual({ form: "Isi semua kolom kata sandi." });
  });

  it("5 wrong current passwords then the right one → THROTTLED", async () => {
    const { user, password } = await makeTeacher();
    const attempt = (currentPassword: string) =>
      changeTeacherPassword(user.id, {
        currentPassword,
        newPassword: NEW,
        confirmPassword: NEW,
      });
    for (let i = 0; i < 5; i++) {
      expect(await attempt("bukan-yang-lama")).toEqual({
        ok: false,
        error: "WRONG_PASSWORD",
      });
    }
    expect(await attempt(password)).toEqual({ ok: false, error: "THROTTLED" });
  });

  it("success clears the teacher throttle key", async () => {
    const { user, password } = await makeTeacher();
    const body = (currentPassword: string) => ({
      currentPassword,
      newPassword: NEW,
      confirmPassword: NEW,
    });
    await changeTeacherPassword(user.id, body("bukan-yang-lama"));
    const key = throttleKey.teacher(user.username!).key;
    expect(await prisma.loginThrottle.count({ where: { key } })).toBe(1);
    expect((await changeTeacherPassword(user.id, body(password))).ok).toBe(true);
    expect(await prisma.loginThrottle.count({ where: { key } })).toBe(0);
  });

  it("refuses non-teacher or inactive ids", async () => {
    const s = await makeStudent((await makeClass()).id);
    const off = await makeTeacher({ isActive: false });
    for (const id of [s.id, off.user.id, "tidak-ada"]) {
      expect(
        await changeTeacherPassword(id, {
          currentPassword: off.password,
          newPassword: NEW,
          confirmPassword: NEW,
        }),
      ).toEqual(INVALID);
    }
  });

  it("success rotates sessions, clears the flag, and audits", async () => {
    const { user, password } = await makeTeacher({ mustChangePassword: true });
    const old = await loginTeacher({ username: user.username!, password, ip });
    if (!old.ok) throw new Error("login failed");

    const r = await changeTeacherPassword(user.id, {
      currentPassword: password,
      newPassword: NEW,
      confirmPassword: NEW,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(await findSession(old.token)).toEqual({ status: "revoked", reason: "REVOKED" });
    expect((await findSession(r.token)).status).toBe("ok");
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.mustChangePassword).toBe(false);

    expect(await loginTeacher({ username: user.username!, password, ip })).toEqual(INVALID);
    expect(await loginTeacher({ username: user.username!, password: NEW, ip })).toMatchObject({
      ok: true,
      mustChangePassword: false,
    });

    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { action: "TEACHER_PASSWORD_CHANGED" },
    });
    expect(audit).toMatchObject({ actorUserId: user.id, entityId: user.id, metadata: null });
  });
});

describe("logout", () => {
  it("deletes the session", async () => {
    const { user, password } = await makeTeacher();
    const r = await loginTeacher({ username: user.username!, password, ip });
    if (!r.ok) throw new Error("login failed");
    await logout(r.token);
    expect(await findSession(r.token)).toEqual({ status: "none" });
  });
});
