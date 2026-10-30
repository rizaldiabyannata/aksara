import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import type {
  Prisma,
  Role,
  SessionRevokedReason,
} from "@/lib/generated/prisma/client";

export const SESSION_TTL_MS = { STUDENT: 8 * 3600_000, TEACHER: 12 * 3600_000 };

export type SessionUser = {
  id: string;
  role: Role;
  displayName: string;
  classId: string | null;
  mustChangePassword: boolean;
  nis: string | null;
  avatarImageId: string | null;
};

type Db = Prisma.TransactionClient | typeof prisma;

const sha256 = (raw: string) => createHash("sha256").update(raw).digest("hex");

export async function createSession(
  tx: Db,
  user: { id: string; role: Role },
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS[user.role]);
  await tx.session.create({
    data: { tokenHash: sha256(token), userId: user.id, expiresAt },
  });
  return { token, expiresAt };
}

// Expired sessions read as `none` even if revoked; only live revoked ones report a reason.
export async function findSession(
  token: string,
): Promise<
  | { status: "ok"; user: SessionUser }
  | { status: "revoked"; reason: SessionRevokedReason }
  | { status: "none" }
> {
  const s = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    select: {
      expiresAt: true,
      revokedAt: true,
      revokedReason: true,
      user: {
        select: {
          id: true,
          role: true,
          displayName: true,
          classId: true,
          mustChangePassword: true,
          nis: true,
          avatarImageId: true,
          isActive: true,
          class: { select: { isActive: true } },
        },
      },
    },
  });
  if (!s || s.expiresAt <= new Date()) return { status: "none" };
  if (s.revokedAt) {
    return s.revokedReason
      ? { status: "revoked", reason: s.revokedReason }
      : { status: "none" };
  }
  const { isActive, class: cls, ...user } = s.user;
  if (!isActive || (user.role === "STUDENT" && !cls?.isActive)) {
    return { status: "none" };
  }
  return { status: "ok", user };
}

export async function revokeSessions(
  tx: Db,
  scope: { userId: string } | { classId: string },
  reason: SessionRevokedReason,
): Promise<number> {
  const now = new Date();
  const { count } = await tx.session.updateMany({
    where: {
      revokedAt: null,
      expiresAt: { gt: now },
      user: "userId" in scope ? { id: scope.userId } : { classId: scope.classId },
    },
    data: { revokedAt: now, revokedReason: reason },
  });
  return count;
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
}
