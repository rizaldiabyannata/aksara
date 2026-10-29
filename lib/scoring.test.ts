import { describe, expect, it } from "vitest";
import { attemptScore, computeRecap, retakeOpen, type ScoredAttempt, type ScoringQuiz } from "@/lib/scoring";

const att = (slot: number, score: number, o: Partial<ScoredAttempt> = {}): ScoredAttempt => ({
  slot, replaced: false, status: "SUBMITTED", gradingStatus: "FINAL", maxPoints: 100, earnedCenti: score * 100, ...o,
});
const released = new Date("2030-01-01T00:00:00Z");
const REM: ScoringQuiz = { scoringPolicy: "REMEDIAL", kkm: 75, resultsReleasedAt: released };
const HI: ScoringQuiz = { scoringPolicy: "HIGHEST", kkm: 75, resultsReleasedAt: released };

describe("attemptScore", () => {
  it("36/40 → 90, 2/3 → 66.67, 1/3 → 33.33, 2.5/4 → 62.5", () => {
    expect(attemptScore(3600, 40)).toBe(90);
    expect(attemptScore(200, 3)).toBe(66.67);
    expect(attemptScore(100, 3)).toBe(33.33);
    expect(attemptScore(250, 4)).toBe(62.5);
  });
  it("rounds half up: 1/8 → 12.5, 1/16 → 6.25, 1/32 → 3.13", () => {
    expect(attemptScore(100, 8)).toBe(12.5);
    expect(attemptScore(100, 16)).toBe(6.25);
    expect(attemptScore(100, 32)).toBe(3.13);
  });
});

describe("computeRecap REMEDIAL (PRD §7.7 table, KKM 75)", () => {
  it.each([
    ["passed first time", [82], 82, true],
    ["remedial above KKM is capped", [60, 90], 75, true],
    ["remedial up but not passed", [60, 70], 70, false],
    ["worse remedial never lowers", [60, 55], 60, false],
    ["two remedials", [60, 68, 88], 75, true],
  ] as const)("%s", (_, scores, recap, passed) => {
    const r = computeRecap(scores.map((s, i) => att(i + 1, s)), REM);
    expect(r).toMatchObject({ recap, passed, primary: scores[0], highest: Math.max(...scores), final: true });
  });

  it("basis is the attempt that set the recap", () => {
    const rem = att(2, 90);
    expect(computeRecap([att(1, 60), rem], REM).basis).toBe(rem);
    const first = att(1, 60);
    expect(computeRecap([first, att(2, 55)], REM).basis).toBe(first);
  });
});

describe("computeRecap", () => {
  it("same data under HIGHEST, then a lower KKM", () => {
    const as = [att(1, 60), att(2, 90)];
    expect(computeRecap(as, HI)).toMatchObject({ recap: 90, passed: true });
    expect(computeRecap(as, { ...REM, kkm: 50 })).toMatchObject({ recap: 60, passed: true });
    expect(computeRecap(as, { ...HI, kkm: null })).toMatchObject({ recap: 90, passed: null });
  });

  it("replaced and in-progress attempts are not counted", () => {
    const r = computeRecap([att(1, 100, { replaced: true }), att(1, 40), att(2, 0, { status: "IN_PROGRESS" })], HI);
    expect(r).toMatchObject({ recap: 40, primary: 40, highest: 40 });
  });

  it("a pending attempt makes the recap provisional", () => {
    expect(computeRecap([att(1, 80), att(2, 50, { gradingStatus: "PENDING_MANUAL_GRADING" })], HI))
      .toMatchObject({ recap: 80, final: false });
  });

  it("no submitted attempt → nothing", () => {
    expect(computeRecap([], REM)).toEqual({ primary: null, highest: null, recap: null, basis: null, final: false, passed: null });
  });
});

describe("retakeOpen", () => {
  it("HIGHEST: open until release", () => {
    expect(retakeOpen([att(1, 50)], { ...HI, resultsReleasedAt: null })).toBe(true);
    expect(retakeOpen([att(1, 50)], HI)).toBe(false);
  });

  it("REMEDIAL: only after release, all final, recap below KKM", () => {
    expect(retakeOpen([att(1, 60)], { ...REM, resultsReleasedAt: null })).toBe(false);
    expect(retakeOpen([att(1, 60)], REM)).toBe(true);
    expect(retakeOpen([att(1, 80)], REM)).toBe(false);
    expect(retakeOpen([att(1, 60), att(2, 70)], REM)).toBe(true);
    expect(retakeOpen([att(1, 60), att(2, 75)], REM)).toBe(false);
    expect(retakeOpen([att(1, 60, { gradingStatus: "PENDING_MANUAL_GRADING" })], REM)).toBe(false);
  });
});
