import type { CognitiveLevel, Difficulty, QuestionType } from "@/lib/generated/prisma/enums";

// Flat string defaults, same shape as the `values` echo, so one reader serves both.
export type Defaults = Record<string, string>;

/** Defaults for the edit form, derived from a QuestionDetail-like object. */
export function toDefaults(q: {
  type: QuestionType;
  chapterId: string;
  subchapterId: string | null;
  prompt: string;
  explanation: string | null;
  defaultPoints: number;
  difficulty: Difficulty;
  cognitiveLevel: CognitiveLevel | null;
  categoryLabels: string[];
  sourceReference: string | null;
  verificationNote: string | null;
  options: { id: string; text: string }[] | null;
  answerKey: Record<string, unknown>;
}): Defaults {
  const d: Defaults = {
    chapterId: q.chapterId,
    subchapterId: q.subchapterId ?? "",
    prompt: q.prompt,
    explanation: q.explanation ?? "",
    defaultPoints: String(q.defaultPoints),
    difficulty: q.difficulty,
    cognitiveLevel: q.cognitiveLevel ?? "",
    sourceReference: q.sourceReference ?? "",
    verificationNote: q.verificationNote ?? "",
  };
  for (const o of q.options ?? []) d[`option_${o.id}`] = o.text;
  const k = q.answerKey;
  if (q.type === "SINGLE_CHOICE") d.correct = String(k.optionId);
  if (q.type === "TRUE_FALSE") d.correct = String(k.value);
  if (q.type === "MULTIPLE_SELECT") d.correct = (k.optionIds as string[]).join(",");
  if (q.type === "SHORT_ANSWER") {
    d.accepted = (k.accepted as string[]).join("\n");
    if (k.caseSensitive) d.caseSensitive = "on";
  }
  if (q.type === "CATEGORY") {
    for (const [id, val] of Object.entries(k.values as Record<string, boolean>)) d[`key_${id}`] = String(val);
    [d.labelTrue, d.labelFalse] = q.categoryLabels.length === 2 ? q.categoryLabels : ["Benar", "Salah"];
  }
  if (q.type === "ESSAY") d.rubric = String(k.rubric ?? "");
  return d;
}
