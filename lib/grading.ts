// Pure objective grading: no DB, no Prisma. Answers come from the client, so
// every shape is parsed with Zod and anything malformed scores 0.
import { z } from "zod";
import { normalizeIdentity } from "@/lib/normalize";
import type { Option } from "@/lib/questions";
import type { QuestionType } from "@/lib/generated/prisma/enums";
import type { Invalid } from "@/lib/validation";

export type ObjectiveQuestion =
  | { type: "SINGLE_CHOICE"; answerKey: { optionId: string } }
  | { type: "TRUE_FALSE"; answerKey: { value: boolean } }
  | { type: "MULTIPLE_SELECT"; answerKey: { optionIds: string[] } }
  | { type: "SHORT_ANSWER"; answerKey: { accepted: string[]; caseSensitive: boolean } }
  | { type: "CATEGORY"; answerKey: { values: Record<string, boolean> } };

const singleChoiceAnswer = z.object({ optionId: z.string() });
const trueFalseAnswer = z.object({ value: z.boolean() });
const multipleSelectAnswer = z.object({ optionIds: z.array(z.string()) });
const categoryAnswer = z.object({ values: z.record(z.string(), z.boolean()) });
const shortAnswer = z.object({
  text: z.string().refine((t) => [...t].length <= 200),
});
const essayAnswer = z.object({
  text: z.string().refine((t) => [...t].length <= 5000),
});

export type StoredAnswer =
  | { optionId: string }
  | { value: boolean }
  | { optionIds: string[] }
  | { values: Record<string, boolean> }
  | { text: string };

const INVALID = "Jawaban tidak valid.";
const SHORT_TOO_LONG = "Jawaban paling banyak 200 huruf.";
const ESSAY_TOO_LONG = "Jawaban paling banyak 5.000 huruf.";

// Validates a student answer against the snapshot and rebuilds it, so extra keys are never stored.
// Empty answers come back as null; the caller stores them as DbNull.
export function parseAnswer(
  q: { type: QuestionType; options: Option[] | null },
  raw: unknown,
): { ok: true; answer: StoredAnswer | null } | Invalid {
  if (raw === null) return { ok: true, answer: null };
  const fail = (message: string): Invalid => ({
    ok: false,
    error: "INVALID",
    fieldErrors: { answer: message },
  });
  const hasOption = (id: string) => q.options?.some((o) => o.id === id) ?? false;

  switch (q.type) {
    case "SINGLE_CHOICE": {
      const a = singleChoiceAnswer.safeParse(raw);
      if (!a.success || !hasOption(a.data.optionId)) return fail(INVALID);
      return { ok: true, answer: { optionId: a.data.optionId } };
    }
    case "TRUE_FALSE": {
      const a = trueFalseAnswer.safeParse(raw);
      if (!a.success) return fail(INVALID);
      return { ok: true, answer: { value: a.data.value } };
    }
    case "MULTIPLE_SELECT": {
      const a = multipleSelectAnswer.safeParse(raw);
      if (!a.success) return fail(INVALID);
      const ids = a.data.optionIds;
      if (ids.length === 0) return { ok: true, answer: null };
      if (new Set(ids).size !== ids.length || !ids.every(hasOption)) return fail(INVALID);
      return { ok: true, answer: { optionIds: ids } };
    }
    case "CATEGORY": {
      const a = categoryAnswer.safeParse(raw);
      if (!a.success) return fail(INVALID);
      const ids = Object.keys(a.data.values);
      if (!ids.every((id) => Object.hasOwn(a.data.values, id) && hasOption(id))) return fail(INVALID);
      if (ids.length === 0) return { ok: true, answer: null };
      // Rebuilt from known ids only: a partial answer is kept so autosave can fill it in statement by statement.
      return { ok: true, answer: { values: Object.fromEntries(ids.map((id) => [id, a.data.values[id]])) } };
    }
    case "SHORT_ANSWER":
      return parseText(raw, shortAnswer, SHORT_TOO_LONG);
    case "ESSAY":
      return parseText(raw, essayAnswer, ESSAY_TOO_LONG);
    default:
      return fail(INVALID);
  }

  function parseText(
    input: unknown,
    schema: typeof shortAnswer | typeof essayAnswer,
    tooLong: string,
  ): { ok: true; answer: StoredAnswer | null } | Invalid {
    const a = schema.safeParse(input);
    if (!a.success) {
      // Only a well-formed text that failed the length refine gets the length message.
      return fail(z.object({ text: z.string() }).safeParse(input).success ? tooLong : INVALID);
    }
    if (a.data.text.trim() === "") return { ok: true, answer: null };
    return { ok: true, answer: { text: a.data.text } };
  }
}

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
    case "CATEGORY": {
      const a = categoryAnswer.safeParse(answer);
      if (!a.success) return false;
      // All-or-nothing (D4): every statement answered and matching, nothing extra.
      const key = Object.entries(q.answerKey.values);
      const given = a.data.values;
      return key.length > 0 && Object.keys(given).length === key.length && key.every(([id, v]) => Object.hasOwn(given, id) && given[id] === v);
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
