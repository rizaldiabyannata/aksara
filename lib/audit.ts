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
  | "TEACHER_PASSWORD_CHANGED"
  | "MATERIAL_STATUS_CHANGED"
  | "MATERIAL_UPDATED"
  | "MATERIAL_DELETED"
  | "IMAGE_ADDED"
  | "IMAGE_REMOVED"
  | "QUESTION_STATUS_CHANGED"
  | "QUESTION_UPDATED"
  | "QUESTION_DELETED"
  | "QUIZ_PUBLISHED"
  | "QUIZ_UNPUBLISHED"
  | "QUIZ_SCORING_CHANGED"
  | "ATTEMPT_REPLACEMENT_GRANTED"
  | "MANUAL_SCORE_SET"
  | "RESULTS_RELEASED"
  | "RESULTS_UNRELEASED"
  | "EXPORT_DOWNLOADED";

/** Thin insert. Callers must never put secrets (passwords, tokens, class codes) in metadata. */
export async function writeAudit(
  tx: Prisma.TransactionClient | typeof prisma,
  e: {
    actorUserId: string;
    action: AuditAction;
    entityType: "User" | "Class" | "Material" | "Image" | "Question" | "Quiz" | "QuizAttempt";
    entityId: string;
    metadata?: Record<string, string | number | boolean | string[] | null>;
  },
): Promise<void> {
  await tx.auditLog.create({ data: e });
}
