import type { StatusTone } from "@/components/status";
import type { QuizKind, QuizStatus, ScoringPolicy } from "@/lib/generated/prisma/enums";

export const STATUS_LABEL: Record<QuizStatus, string> = { DRAFT: "Draf", PUBLISHED: "Terbit" };
export const POLICY_LABEL: Record<ScoringPolicy, string> = { HIGHEST: "Nilai tertinggi", REMEDIAL: "Remedial" };
export const KIND_LABEL: Record<QuizKind, string> = { REGULAR: "Ulangan biasa", TRYOUT_TKA: "Tryout TKA" };
export const STATUS_TONE: Record<QuizStatus, StatusTone> = { DRAFT: "neutral", PUBLISHED: "success" };
