import { z } from "zod";
import type { Prisma } from "./generated/prisma/client";
import { Difficulty, QuestionStatus, QuestionType } from "./generated/prisma/enums";

export const BULK_ID_MAX = 1000;

export const questionFilterSchema = z.strictObject({
  subjectId: z.string().trim().min(1).max(100).optional(),
  chapterId: z.string().trim().min(1).max(100).optional(),
  subchapterId: z.string().trim().min(1).max(100).optional(),
  type: z.enum(QuestionType).optional(), difficulty: z.enum(Difficulty).optional(),
  status: z.enum(QuestionStatus).optional(), q: z.string().trim().max(500).optional(),
});
export type QuestionScopeFilter = z.infer<typeof questionFilterSchema>;

export function questionWhere(f: QuestionScopeFilter): Prisma.QuestionWhereInput {
  return {
    chapterId: f.chapterId, subchapterId: f.subchapterId, type: f.type,
    difficulty: f.difficulty, status: f.status,
    ...(f.subjectId && { chapter: { subjectId: f.subjectId } }),
    ...(f.q?.trim() && { prompt: { contains: f.q.trim(), mode: "insensitive" } }),
  };
}
