// Pure evaluation helpers (Tahap 10 D7–D8): per-chapter and per-level breakdowns, item analysis, the approximate TKA label.
import type { StatusTone } from "@/components/status";
import type { CognitiveLevel, QuestionType } from "@/lib/generated/prisma/enums";

/** One question of one counted attempt. chapter/level come from the publish snapshot. */
export type ItemResult = {
  position: number;
  chapter: string | null;
  level: CognitiveLevel | null;
  type: QuestionType;
  points: number;
  earned: number;
};
export type Group = { key: string; earned: number; max: number; pct: number };
export type ItemStat = {
  position: number; chapter: string | null; level: CognitiveLevel | null; type: QuestionType;
  correct: number; total: number; pct: number;
};

// Quizzes published before Tahap 10 have no chapter snapshot.
export const NO_CHAPTER = "Bab tidak tercatat";
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part * 100) / whole) : 0);

/** Sums earned/max per chapter or level, in quiz order. Questions without a level are left out of the level view. */
export function breakdown(items: ItemResult[], by: "chapter" | "level"): Group[] {
  const groups = new Map<string, { earned: number; max: number }>();
  for (const it of items) {
    const key = by === "chapter" ? (it.chapter ?? NO_CHAPTER) : it.level;
    if (!key) continue;
    const g = groups.get(key) ?? { earned: 0, max: 0 };
    g.earned += it.earned;
    g.max += it.points;
    groups.set(key, g);
  }
  return [...groups].map(([key, g]) => ({ key, earned: g.earned, max: g.max, pct: pct(g.earned, g.max) }));
}

/** Share of students with full points per question. `students` holds one ItemResult[] per student. */
export function itemAnalysis(students: ItemResult[][]): ItemStat[] {
  const byPos = new Map<number, ItemStat>();
  for (const items of students) {
    for (const it of items) {
      const s = byPos.get(it.position) ?? {
        position: it.position, chapter: it.chapter, level: it.level, type: it.type, correct: 0, total: 0, pct: 0,
      };
      s.total++;
      if (it.earned >= it.points) s.correct++;
      byPos.set(it.position, s);
    }
  }
  return [...byPos.values()].sort((a, b) => a.position - b.position).map((s) => ({ ...s, pct: pct(s.correct, s.total) }));
}

export type TkaCategory = "ISTIMEWA" | "BAIK" | "MEMADAI" | "KURANG";
export const TKA_CATEGORY_LABEL: Record<TkaCategory, string> = {
  ISTIMEWA: "Istimewa", BAIK: "Baik", MEMADAI: "Memadai", KURANG: "Kurang",
};
export const TKA_CATEGORY_TONE: Record<TkaCategory, StatusTone> = {
  ISTIMEWA: "success", BAIK: "info", MEMADAI: "warning", KURANG: "danger",
};
export const TKA_CATEGORY_NOTE = "Kategori perkiraan, bukan skala resmi TKA.";

/** D7 cut-offs (approximate; official SD ranges are unpublished, see docs/tka-sd-kisi-kisi.md). */
export function tkaCategory(score: number): TkaCategory {
  if (score >= 80) return "ISTIMEWA";
  if (score >= 60) return "BAIK";
  if (score >= 40) return "MEMADAI";
  return "KURANG";
}
