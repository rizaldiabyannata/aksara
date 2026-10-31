import "server-only";
import { z } from "zod";
import { prisma } from "./db";
import { parse, type Invalid, type NotFound } from "./validation";
import { BULK_ID_MAX, questionFilterSchema, questionWhere } from "./question-filter";
import { QuestionStatus } from "./generated/prisma/enums";

const ids = z.array(z.string().trim().min(1).max(100)).max(BULK_ID_MAX);
const selectionSchema = z.discriminatedUnion("mode", [
  z.strictObject({ mode: z.literal("ids"), ids: ids.min(1) }),
  z.strictObject({ mode: z.literal("filter"), filter: questionFilterSchema, excludedIds: ids }),
]);
export type BulkQuestionSelection = z.infer<typeof selectionSchema>;
const schema = z.strictObject({ to: z.enum(QuestionStatus), selection: selectionSchema });
export type BulkQuestionResult = { ok: true; matched: number; changed: number; unchanged: number } | Invalid | NotFound;

export async function bulkSetQuestionStatus(actorId: string, input: unknown): Promise<BulkQuestionResult> {
  const parsed = parse(schema, input);
  if (!parsed.ok) return { ...parsed, fieldErrors: { form: "Lakukan pilihan ulang. Maksimal 1.000 ID atau pengecualian; status dan filter harus valid." } };
  const { to, selection } = parsed.data;
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(async tx => {
        const teacher = await tx.user.findFirst({ where: { id: actorId, role: "TEACHER", isActive: true }, select: { id: true } });
        if (!teacher) return { ok: false, error: "NOT_FOUND" } as const;
        const explicit = selection.mode === "ids" ? [...new Set(selection.ids)] : null;
        const where = explicit ? { id: { in: explicit } } : {
          AND: [questionWhere(selection.mode === "filter" ? selection.filter : {}), { id: { notIn: selection.mode === "filter" ? selection.excludedIds : [] } }],
        };
        const rows = await tx.question.findMany({ where, select: { id: true, status: true } });
        if (explicit && rows.length !== explicit.length) return { ok: false, error: "NOT_FOUND" } as const;
        const changed = rows.filter(row => row.status !== to);
        // Batch writes, one transaction: status and audit always commit together.
        for (let offset = 0; offset < changed.length; offset += 500) {
          const batch = changed.slice(offset, offset + 500);
          await tx.question.updateMany({ where: { id: { in: batch.map(row => row.id) } }, data: { status: to, updatedById: actorId } });
          await tx.auditLog.createMany({ data: batch.map(row => ({
            actorUserId: actorId, action: "QUESTION_STATUS_CHANGED", entityType: "Question", entityId: row.id,
            metadata: { from: row.status, to },
          })) });
        }
        return { ok: true, matched: rows.length, changed: changed.length, unchanged: rows.length - changed.length } as const;
      }, { isolationLevel: "Serializable", timeout: 30_000 });
    } catch (error) {
      if (attempt < 2 && typeof error === "object" && error !== null && "code" in error && error.code === "P2034") continue;
      throw error;
    }
  }
}
