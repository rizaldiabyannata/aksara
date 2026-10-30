import type { StatusTone } from "@/components/status";
import type { CognitiveLevel, Difficulty, QuestionStatus, QuestionType } from "@/lib/generated/prisma/enums";

export const TYPE_LABEL: Record<QuestionType, string> = {
  SINGLE_CHOICE: "Pilihan ganda",
  TRUE_FALSE: "Benar/salah",
  MULTIPLE_SELECT: "Pilihan ganda kompleks",
  SHORT_ANSWER: "Jawaban singkat",
  ESSAY: "Uraian",
  CATEGORY: "Pilihan ganda kompleks (kategori)",
};

export const STATUS_LABEL: Record<QuestionStatus, string> = { DRAFT: "Draf", ACTIVE: "Aktif" };

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  EASY: "Mudah",
  MEDIUM: "Sedang",
  HARD: "Sulit",
};

export const LEVEL_LABEL: Record<CognitiveLevel, string> = {
  PEMAHAMAN: "Pemahaman",
  APLIKASI: "Aplikasi",
  PENALARAN: "Penalaran",
};

export const STATUS_TONE: Record<QuestionStatus, StatusTone> = { DRAFT: "neutral", ACTIVE: "success" };
