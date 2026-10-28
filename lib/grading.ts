// Pure objective grading: no DB, no Prisma. Answers come from the client, so
// every shape is parsed with Zod and anything malformed scores 0.
import { z } from "zod";
import { normalizeIdentity } from "@/lib/normalize";

export type ObjectiveQuestion =
  | { type: "SINGLE_CHOICE"; answerKey: { optionId: string } }
  | { type: "TRUE_FALSE"; answerKey: { value: boolean } }
  | { type: "MULTIPLE_SELECT"; answerKey: { optionIds: string[] } }
  | { type: "SHORT_ANSWER"; answerKey: { accepted: string[]; caseSensitive: boolean } };

const singleChoiceAnswer = z.object({ optionId: z.string() });
const trueFalseAnswer = z.object({ value: z.boolean() });
const multipleSelectAnswer = z.object({ optionIds: z.array(z.string()) });
const shortAnswer = z.object({
  text: z.string().refine((t) => [...t].length <= 200),
});

// Case-sensitive keeps casing but still folds width and whitespace.
export function normalizeShortAnswer(s: string, caseSensitive: boolean): string {
  if (!caseSensitive) return normalizeIdentity(s);
  return s.normalize("NFKC").replace(/\s+/gu, " ").trim();
}

export function gradeObjective(q: ObjectiveQuestion, answer: unknown, points: number): number {
  return isCorrect(q, answer) ? points : 0;
}

function isCorrect(q: ObjectiveQuestion, answer: unknown): boolean {
  switch (q.type) {
    case "SINGLE_CHOICE": {
      const a = singleChoiceAnswer.safeParse(answer);
      return a.success && a.data.optionId === q.answerKey.optionId;
    }
    case "TRUE_FALSE": {
      const a = trueFalseAnswer.safeParse(answer);
      return a.success && a.data.value === q.answerKey.value;
    }
    case "MULTIPLE_SELECT": {
      const a = multipleSelectAnswer.safeParse(answer);
      if (!a.success) return false;
      const ids = a.data.optionIds;
      // Empty answers never score (F08), even against an empty key.
      if (ids.length === 0) return false;
      // Duplicates are refused outright, so ["a","a","c"] can't pass for ["a","c"].
      if (new Set(ids).size !== ids.length) return false;
      const key = new Set(q.answerKey.optionIds);
      return key.size === ids.length && ids.every((id) => key.has(id));
    }
    case "SHORT_ANSWER": {
      const a = shortAnswer.safeParse(answer);
      if (!a.success) return false;
      const { accepted, caseSensitive } = q.answerKey;
      const given = normalizeShortAnswer(a.data.text, caseSensitive);
      // Empty answers never score (F08), even when a key normalizes to "".
      if (given === "") return false;
      return accepted.some((k) => normalizeShortAnswer(k, caseSensitive) === given);
    }
  }
}
