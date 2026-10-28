import type { QuizStatus, ScoringPolicy } from "@/lib/generated/prisma/enums";

export const STATUS_LABEL: Record<QuizStatus, string> = { DRAFT: "Draf", PUBLISHED: "Terbit" };
export const POLICY_LABEL: Record<ScoringPolicy, string> = { HIGHEST: "Nilai tertinggi", REMEDIAL: "Remedial" };
