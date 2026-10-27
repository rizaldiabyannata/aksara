import { z } from "zod";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import {
  hashPassword,
  verifyDummyPassword,
  verifyPassword,
} from "@/lib/auth/password";
import { createSession, deleteSession, revokeSessions } from "@/lib/auth/session";
import { releaseOnSuccess, reserveAttempt, throttleKey } from "@/lib/auth/throttle";
import {
  isNis,
  normalizeClassCode,
  normalizeIdentity,
  normalizeUsername,
} from "@/lib/normalize";

export type LoginResult =
  | { ok: true; token: string; expiresAt: Date; mustChangePassword: boolean }
  | { ok: false; error: "INVALID" | "THROTTLED" };

// Every non-throttled failure returns this exact shape, so callers can't tell accounts apart.
const INVALID = { ok: false, error: "INVALID" } as const;
const THROTTLED = { ok: false, error: "THROTTLED" } as const;

// A malformed stored hash makes argon2 throw; treat it as a wrong password, never a 500.
const verifySafe = (hash: string, pw: string) =>
  verifyPassword(hash, pw).catch(() => false);

export async function loginStudent(input: {
  classCode: string;
  identity: string;
  ip: string;
}): Promise<LoginResult> {
  const code = normalizeClassCode(input.classCode);
  const identity = normalizeIdentity(input.identity);
  const idKey = throttleKey.student(code, identity);
  const ipKey = throttleKey.ip(input.ip);
  if (!(await reserveAttempt([idKey, ipKey]))) return THROTTLED;

  const student = await prisma.user.findFirst({
    where: {
      role: "STUDENT",
      isActive: true,
      class: { code, isActive: true },
      ...(isNis(identity) ? { nis: identity } : { loginName: identity }),
    },
    select: { id: true },
  });
  if (!student) return INVALID;

  const session = await prisma.$transaction(async (tx) => {
    // Row lock serializes parallel logins of one student: last one wins, one active session.
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "User" WHERE id = ${student.id} AND "isActive" FOR UPDATE`;
    if (locked.length === 0) return null;
    await tx.session.deleteMany({
      where: {
        userId: student.id,
        OR: [{ revokedAt: { not: null } }, { expiresAt: { lte: new Date() } }],
      },
    });
    const revoked = await revokeSessions(tx, { userId: student.id }, "REPLACED");
    const created = await createSession(tx, { id: student.id, role: "STUDENT" });
    if (revoked > 0) {
      await writeAudit(tx, {
        actorUserId: student.id,
        action: "STUDENT_SESSION_REPLACED",
        entityType: "User",
        entityId: student.id,
        metadata: { revoked },
      });
    }
    return created;
  });
  if (!session) return INVALID;

  await releaseOnSuccess(idKey, ipKey);
  return { ok: true, ...session, mustChangePassword: false };
}

export async function loginTeacher(input: {
  username: string;
  password: string;
  ip: string;
}): Promise<LoginResult> {
  const username = normalizeUsername(input.username);
  const idKey = throttleKey.teacher(username);
  const ipKey = throttleKey.ip(input.ip);
  if (!(await reserveAttempt([idKey, ipKey]))) return THROTTLED;

  const teacher = await prisma.user.findFirst({
    where: { role: "TEACHER", isActive: true, username },
    select: { id: true, passwordHash: true, mustChangePassword: true },
  });
  if (!teacher?.passwordHash) {
    await verifyDummyPassword(input.password);
    return INVALID;
  }
  if (!(await verifySafe(teacher.passwordHash, input.password))) return INVALID;

  const session = await createSession(prisma, { id: teacher.id, role: "TEACHER" });
  await releaseOnSuccess(idKey, ipKey);
  return { ok: true, ...session, mustChangePassword: teacher.mustChangePassword };
}

const changePasswordSchema = z
  .object(
    {
      currentPassword: z
        .string({ error: "Kata sandi lama wajib diisi." })
        .min(1, "Kata sandi lama wajib diisi."),
      newPassword: z
        .string({ error: "Kata sandi baru wajib diisi." })
        .min(12, "Kata sandi baru minimal 12 karakter."),
      confirmPassword: z.string({ error: "Konfirmasi kata sandi wajib diisi." }),
    },
    { error: "Isi semua kolom kata sandi." },
  )
  .refine((d) => d.newPassword !== d.currentPassword, {
    path: ["newPassword"],
    message: "Kata sandi baru harus berbeda dari kata sandi lama.",
  })
  .refine((d) => d.confirmPassword === d.newPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi kata sandi tidak sama.",
  });

export async function changeTeacherPassword(
  userId: string,
  input: unknown,
): Promise<
  | { ok: true; token: string; expiresAt: Date }
  | {
      ok: false;
      error: "INVALID" | "WRONG_PASSWORD" | "THROTTLED";
      fieldErrors?: Record<string, string>;
    }
> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "form");
      fieldErrors[field] ??= issue.message;
    }
    return { ...INVALID, fieldErrors };
  }
  const { currentPassword, newPassword } = parsed.data;

  const teacher = await prisma.user.findFirst({
    where: { id: userId, role: "TEACHER", isActive: true },
    select: { username: true, passwordHash: true },
  });
  if (!teacher?.passwordHash || !teacher.username) return INVALID;
  // Same key as teacher login, so a stolen session can't brute-force the current password.
  const idKey = throttleKey.teacher(teacher.username);
  if (!(await reserveAttempt([idKey]))) return THROTTLED;
  if (!(await verifySafe(teacher.passwordHash, currentPassword))) {
    return { ok: false, error: "WRONG_PASSWORD" };
  }
  await prisma.loginThrottle.deleteMany({ where: { key: idKey.key } });

  const passwordHash = await hashPassword(newPassword);
  const session = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });
    await revokeSessions(tx, { userId }, "REVOKED");
    const created = await createSession(tx, { id: userId, role: "TEACHER" });
    await writeAudit(tx, {
      actorUserId: userId,
      action: "TEACHER_PASSWORD_CHANGED",
      entityType: "User",
      entityId: userId,
    });
    return created;
  });
  return { ok: true, ...session };
}

export async function logout(token: string): Promise<void> {
  await deleteSession(token);
}
