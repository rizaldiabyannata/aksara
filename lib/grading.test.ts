import { describe, expect, it } from "vitest";
import { gradeObjective, normalizeShortAnswer, type ObjectiveQuestion } from "@/lib/grading";

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

    it("rejects text longer than 200 characters", () => {
      expect(gradeObjective(ci, { text: "a".repeat(201) }, 3)).toBe(0);
    });

    it("accepts text of exactly 200 characters, which then fails to match", () => {
      // Length passes the parse, so the comparison runs and simply does not match.
      expect(gradeObjective(ci, { text: "a".repeat(200) }, 3)).toBe(0);
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
