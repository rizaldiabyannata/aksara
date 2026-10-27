import type { Prisma } from "@/lib/generated/prisma/client";
import type { prisma } from "@/lib/db";

export type AuditAction =
  | "STUDENT_CREATED"
  | "STUDENT_UPDATED"
  | "STUDENT_SESSIONS_REVOKED"
  | "STUDENT_SESSION_REPLACED"
  | "STUDENT_DEACTIVATED"
  | "STUDENT_ACTIVATED"
  | "CLASS_CREATED"
  | "CLASS_UPDATED"
  | "CLASS_CODE_ROTATED"
  | "CLASS_SESSIONS_REVOKED"
  | "CLASS_DEACTIVATED"
  | "CLASS_ACTIVATED"
  | "TEACHER_PASSWORD_CHANGED";

/** Thin insert. Callers must never put secrets (passwords, tokens, class codes) in metadata. */
export async function writeAudit(
  tx: Prisma.TransactionClient | typeof prisma,
  e: {
    actorUserId: string;
    action: AuditAction;
    entityType: "User" | "Class";
    entityId: string;
    metadata?: Record<string, string | number | boolean | string[]>;
  },
): Promise<void> {
  await tx.auditLog.create({ data: e });
}
