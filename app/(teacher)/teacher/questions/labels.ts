import type { StatusTone } from "@/components/status";
import type { Difficulty, QuestionStatus, QuestionType } from "@/lib/generated/prisma/enums";

export const TYPE_LABEL: Record<QuestionType, string> = {
  SINGLE_CHOICE: "Pilihan ganda",
  TRUE_FALSE: "Benar/salah",
  MULTIPLE_SELECT: "Pilihan ganda kompleks",
  SHORT_ANSWER: "Jawaban singkat",
  ESSAY: "Uraian",
};

export const STATUS_LABEL: Record<QuestionStatus, string> = { DRAFT: "Draf", ACTIVE: "Aktif" };

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  EASY: "Mudah",
  MEDIUM: "Sedang",
  HARD: "Sulit",
};

export const STATUS_TONE: Record<QuestionStatus, StatusTone> = { DRAFT: "neutral", ACTIVE: "success" };
