import { afterEach, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { changeTeacherPassword, loginStudent, loginTeacher } from "@/lib/auth/login";
import { rotateClassCode } from "@/lib/classes";
import { makeClass, makeStudent, makeTeacher } from "../../tests/factories";

const methods = ["log", "info", "warn", "error", "debug"] as const;

afterEach(() => vi.restoreAllMocks());

it("never writes tokens, passwords or class codes to the console or audit metadata", async () => {
  const spies = methods.map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
  const secrets: string[] = [];
  const ip = "10.0.0.1";

  const cls = await makeClass();
  secrets.push(cls.code);
  await makeStudent(cls.id, { displayName: "Budi", loginName: "budi" });

  // Student: success twice (second replaces the first, writing an audit row), failure, throttled.
  for (let i = 0; i < 2; i++) {
    const r = await loginStudent({ classCode: cls.code, identity: "Budi", ip });
    expect(r.ok).toBe(true);
    if (r.ok) secrets.push(r.token);
  }
  for (let i = 0; i < 11; i++) {
    await loginStudent({ classCode: cls.code, identity: "salah", ip });
  }
  expect(await loginStudent({ classCode: cls.code, identity: "salah", ip })).toEqual({
    ok: false,
    error: "THROTTLED",
  });

  // Teacher: failure, success, password change.
  const { user: teacher, password } = await makeTeacher();
  const newPassword = "kata-sandi-baru-yang-panjang";
  secrets.push(password, newPassword);
  await loginTeacher({ username: teacher.username!, password: "bukan-ini-123", ip });
  const t = await loginTeacher({ username: teacher.username!, password, ip });
  expect(t.ok).toBe(true);
  if (t.ok) secrets.push(t.token);
  const changed = await changeTeacherPassword(teacher.id, {
    currentPassword: password,
    newPassword,
    confirmPassword: newPassword,
  });
  expect(changed.ok).toBe(true);
  if (changed.ok) secrets.push(changed.token);

  // Class code rotation.
  expect((await rotateClassCode(teacher.id, cls.id)).ok).toBe(true);
  const rotated = await prisma.class.findUniqueOrThrow({ where: { id: cls.id } });
  secrets.push(rotated.code);

  const logged = spies.flatMap((s) => s.mock.calls.map((args) => JSON.stringify(args)));
  const audits = await prisma.auditLog.findMany({ select: { metadata: true } });
  expect(audits.length).toBeGreaterThan(0);
  const metadata = audits.map((a) => JSON.stringify(a.metadata ?? null));
  const tokenHashes = (await prisma.session.findMany({ select: { tokenHash: true } })).map(
    (s) => s.tokenHash,
  );

  for (const secret of secrets) {
    for (const line of [...logged, ...metadata]) expect(line).not.toContain(secret);
    expect(tokenHashes).not.toContain(secret);
  }
});
