import { describe, expect, it } from "vitest";
import {
  gradeObjective,
  normalizeShortAnswer,
  parseAnswer,
  type ObjectiveQuestion,
} from "@/lib/grading";

const INVALID = { ok: false, error: "INVALID", fieldErrors: { answer: "Jawaban tidak valid." } };
const opts = [
  { id: "a", text: "A" },
  { id: "b", text: "B" },
];

describe("normalizeShortAnswer", () => {
  it("trims, collapses whitespace, and lowercases when case-insensitive", () => {
    expect(normalizeShortAnswer(" Kota  Jakarta ", false)).toBe("kota jakarta");
  });

  it("keeps case when case-sensitive, but still trims and collapses whitespace", () => {
    expect(normalizeShortAnswer(" Kota  Jakarta ", true)).toBe("Kota Jakarta");
  });

  it("applies NFKC so fullwidth letters fold to ASCII", () => {
    expect(normalizeShortAnswer("ｊａｋａｒｔａ", false)).toBe("jakarta");
  });
});

describe("gradeObjective", () => {
  describe("SINGLE_CHOICE", () => {
    const q: ObjectiveQuestion = { type: "SINGLE_CHOICE", answerKey: { optionId: "b" } };

    it("gives full points for the right option", () => {
      expect(gradeObjective(q, { optionId: "b" }, 5)).toBe(5);
    });

    it("gives 0 for a wrong option", () => {
      expect(gradeObjective(q, { optionId: "a" }, 5)).toBe(0);
    });
  });

  describe("TRUE_FALSE", () => {
    const q: ObjectiveQuestion = { type: "TRUE_FALSE", answerKey: { value: true } };

    it("gives full points for the right value", () => {
      expect(gradeObjective(q, { value: true }, 2)).toBe(2);
    });

    it("gives 0 for the wrong value", () => {
      expect(gradeObjective(q, { value: false }, 2)).toBe(0);
    });
  });

  describe("MULTIPLE_SELECT", () => {
    const q: ObjectiveQuestion = {
      type: "MULTIPLE_SELECT",
      answerKey: { optionIds: ["c", "a"] },
    };

    it("gives full points when the set matches exactly, regardless of order", () => {
      expect(gradeObjective(q, { optionIds: ["a", "c"] }, 4)).toBe(4);
    });

    it("gives 0 when one correct option is missing", () => {
      expect(gradeObjective(q, { optionIds: ["a"] }, 4)).toBe(0);
    });

    it("gives 0 when one extra wrong option is added", () => {
      expect(gradeObjective(q, { optionIds: ["a", "b", "c"] }, 4)).toBe(0);
    });

    it("gives 0 for an empty selection even against an empty key", () => {
      const none: ObjectiveQuestion = { type: "MULTIPLE_SELECT", answerKey: { optionIds: [] } };
      expect(gradeObjective(none, { optionIds: [] }, 4)).toBe(0);
    });

    it("gives 0 for duplicate ids even if they cover the key", () => {
      expect(gradeObjective(q, { optionIds: ["a", "a", "c"] }, 4)).toBe(0);
    });
  });

  describe("SHORT_ANSWER", () => {
    const ci: ObjectiveQuestion = {
      type: "SHORT_ANSWER",
      answerKey: { accepted: ["jakarta"], caseSensitive: false },
    };
    const cs: ObjectiveQuestion = {
      type: "SHORT_ANSWER",
      answerKey: { accepted: ["Jakarta"], caseSensitive: true },
    };

    it("ignores surrounding spaces and case when case-insensitive", () => {
      expect(gradeObjective(ci, { text: " Jakarta " }, 3)).toBe(3);
    });

    it("rejects a case mismatch when case-sensitive", () => {
      expect(gradeObjective(cs, { text: "jakarta" }, 3)).toBe(0);
    });

    it("collapses inner whitespace before comparing", () => {
      const kota: ObjectiveQuestion = {
        type: "SHORT_ANSWER",
        answerKey: { accepted: ["kota jakarta"], caseSensitive: false },
      };
      expect(gradeObjective(kota, { text: "Kota  Jakarta" }, 3)).toBe(3);
    });

    it("matches NFKC-equivalent text", () => {
      expect(gradeObjective(ci, { text: "ｊａｋａｒｔａ" }, 3)).toBe(3);
    });

    it("does no fuzzy matching", () => {
      expect(gradeObjective(ci, { text: "Jakartaa" }, 3)).toBe(0);
    });

    it("scores a 200-character answer that matches the key", () => {
      const long: ObjectiveQuestion = {
        type: "SHORT_ANSWER",
        answerKey: { accepted: ["a".repeat(200)], caseSensitive: false },
      };
      expect(gradeObjective(long, { text: "a".repeat(200) }, 3)).toBe(3);
    });

    it("scores 0 for a 201-character answer even when it matches the key exactly", () => {
      // Key is also 201 chars, so only the length cap can produce 0.
      const long: ObjectiveQuestion = {
        type: "SHORT_ANSWER",
        answerKey: { accepted: ["a".repeat(201)], caseSensitive: false },
      };
      expect(gradeObjective(long, { text: "a".repeat(201) }, 3)).toBe(0);
    });

    it("scores 0 for an empty answer even when a key normalizes to empty", () => {
      const empty: ObjectiveQuestion = {
        type: "SHORT_ANSWER",
        answerKey: { accepted: ["   "], caseSensitive: false },
      };
      expect(gradeObjective(empty, { text: "  " }, 3)).toBe(0);
    });
  });

  describe("malformed answers never throw and score 0", () => {
    const q: ObjectiveQuestion = { type: "SINGLE_CHOICE", answerKey: { optionId: "a" } };
    const bad: unknown[] = [null, undefined, {}, "a", 1, { optionId: 1 }, ["a"]];

    it.each(bad)("SINGLE_CHOICE rejects %j", (answer) => {
      expect(gradeObjective(q, answer, 5)).toBe(0);
    });

    it("TRUE_FALSE rejects a string instead of a boolean", () => {
      const tf: ObjectiveQuestion = { type: "TRUE_FALSE", answerKey: { value: true } };
      expect(gradeObjective(tf, { value: "true" }, 2)).toBe(0);
    });

    it("MULTIPLE_SELECT rejects a non-array", () => {
      const ms: ObjectiveQuestion = { type: "MULTIPLE_SELECT", answerKey: { optionIds: ["a"] } };
      expect(gradeObjective(ms, { optionIds: "a" }, 4)).toBe(0);
    });

    it("SHORT_ANSWER rejects a non-string text", () => {
      const sa: ObjectiveQuestion = {
        type: "SHORT_ANSWER",
        answerKey: { accepted: ["a"], caseSensitive: false },
      };
      expect(gradeObjective(sa, { text: 1 }, 3)).toBe(0);
    });
  });
});

describe("parseAnswer", () => {
  const single = { type: "SINGLE_CHOICE" as const, options: opts };
  const multi = { type: "MULTIPLE_SELECT" as const, options: opts };
  const tf = { type: "TRUE_FALSE" as const, options: null };
  const short = { type: "SHORT_ANSWER" as const, options: null };
  const essay = { type: "ESSAY" as const, options: null };

  it("accepts a valid answer for every type", () => {
    expect(parseAnswer(single, { optionId: "a" })).toEqual({ ok: true, answer: { optionId: "a" } });
    expect(parseAnswer(tf, { value: false })).toEqual({ ok: true, answer: { value: false } });
    expect(parseAnswer(multi, { optionIds: ["b", "a"] })).toEqual({
      ok: true,
      answer: { optionIds: ["b", "a"] },
    });
    expect(parseAnswer(short, { text: "Jakarta" })).toEqual({
      ok: true,
      answer: { text: "Jakarta" },
    });
    expect(parseAnswer(essay, { text: "Uraian" })).toEqual({ ok: true, answer: { text: "Uraian" } });
  });

  it("refuses an optionId that is not in the snapshot options", () => {
    expect(parseAnswer(single, { optionId: "z" })).toEqual(INVALID);
  });

  it("refuses duplicate or unknown optionIds", () => {
    expect(parseAnswer(multi, { optionIds: ["a", "a"] })).toEqual(INVALID);
    expect(parseAnswer(multi, { optionIds: ["a", "z"] })).toEqual(INVALID);
  });

  it("treats an empty selection as null", () => {
    expect(parseAnswer(multi, { optionIds: [] })).toEqual({ ok: true, answer: null });
  });

  it("treats whitespace-only text as null", () => {
    expect(parseAnswer(short, { text: "   " })).toEqual({ ok: true, answer: null });
    expect(parseAnswer(essay, { text: "   " })).toEqual({ ok: true, answer: null });
  });

  it("gives the short-answer message for 201 code points, and accepts 200", () => {
    expect(parseAnswer(short, { text: "😀".repeat(201) })).toEqual({
      ok: false,
      error: "INVALID",
      fieldErrors: { answer: "Jawaban paling banyak 200 huruf." },
    });
    expect(parseAnswer(short, { text: "😀".repeat(200) })).toEqual({
      ok: true,
      answer: { text: "😀".repeat(200) },
    });
  });

  it("gives the essay message for 5.001 code points, and accepts 5.000", () => {
    expect(parseAnswer(essay, { text: "a".repeat(5001) })).toEqual({
      ok: false,
      error: "INVALID",
      fieldErrors: { answer: "Jawaban paling banyak 5.000 huruf." },
    });
    expect(parseAnswer(essay, { text: "a".repeat(5000) })).toEqual({
      ok: true,
      answer: { text: "a".repeat(5000) },
    });
  });

  it("refuses a string where a boolean belongs", () => {
    expect(parseAnswer(tf, { value: "true" })).toEqual(INVALID);
  });

  it("refuses non-object raw values", () => {
    expect(parseAnswer(single, "a")).toEqual(INVALID);
    expect(parseAnswer(single, 42)).toEqual(INVALID);
  });

  it("drops extra keys from the stored answer", () => {
    expect(parseAnswer(single, { optionId: "a", extra: 1 })).toEqual({
      ok: true,
      answer: { optionId: "a" },
    });
  });

  it("treats raw null as an unanswered question", () => {
    expect(parseAnswer(single, null)).toEqual({ ok: true, answer: null });
  });

  it("does not check options for TRUE_FALSE", () => {
    expect(parseAnswer(tf, { value: true })).toEqual({ ok: true, answer: { value: true } });
  });
});

describe("CATEGORY (PGK Kategori)", () => {
  const q: ObjectiveQuestion = { type: "CATEGORY", answerKey: { values: { a: true, b: false, c: true } } };
  const cat = { type: "CATEGORY" as const, options: [...opts, { id: "c", text: "C" }] };

  it("gives full points only when every statement matches", () => {
    expect(gradeObjective(q, { values: { a: true, b: false, c: true } }, 1)).toBe(1);
  });

  it("gives 0 when one statement is wrong (all-or-nothing)", () => {
    expect(gradeObjective(q, { values: { a: true, b: true, c: true } }, 1)).toBe(0);
  });

  it("gives 0 when one statement is unanswered", () => {
    expect(gradeObjective(q, { values: { a: true, b: false } }, 1)).toBe(0);
  });

  it("gives 0 for an extra unknown statement or a non-boolean value", () => {
    expect(gradeObjective(q, { values: { a: true, b: false, c: true, d: false } }, 1)).toBe(0);
    expect(gradeObjective(q, { values: { a: "true", b: false, c: true } }, 1)).toBe(0);
    expect(gradeObjective(q, { values: [true, false, true] }, 1)).toBe(0);
  });

  it("parseAnswer keeps a partial answer and refuses unknown statements", () => {
    expect(parseAnswer(cat, { values: { a: true } })).toEqual({ ok: true, answer: { values: { a: true } } });
    expect(parseAnswer(cat, { values: { z: true } })).toEqual(INVALID);
    expect(parseAnswer(cat, { values: { a: 1 } })).toEqual(INVALID);
  });

  it("parseAnswer treats no answered statement as unanswered", () => {
    expect(parseAnswer(cat, { values: {} })).toEqual({ ok: true, answer: null });
  });

  it("parseAnswer never stores a prototype key", () => {
    expect(parseAnswer(cat, JSON.parse('{"values":{"__proto__":true}}'))).toEqual({ ok: true, answer: null });
  });
});
