import { describe, expect, it } from "vitest";
import { NO_CHAPTER, breakdown, itemAnalysis, tkaCategory, type ItemResult } from "@/lib/evaluation";

const it_ = (position: number, chapter: string | null, level: ItemResult["level"], earned: number, points = 1): ItemResult => ({
  position, chapter, level, type: "SINGLE_CHOICE", points, earned,
});

describe("breakdown", () => {
  const items = [it_(1, "Bilangan", "PEMAHAMAN", 1), it_(2, "Data", "APLIKASI", 0), it_(3, "Bilangan", null, 2, 3), it_(4, null, "APLIKASI", 1)];

  it("sums per chapter in quiz order; a missing chapter gets its own group", () => {
    expect(breakdown(items, "chapter")).toEqual([
      { key: "Bilangan", earned: 3, max: 4, pct: 75 },
      { key: "Data", earned: 0, max: 1, pct: 0 },
      { key: NO_CHAPTER, earned: 1, max: 1, pct: 100 },
    ]);
  });

  it("per level skips questions without a level", () => {
    expect(breakdown(items, "level")).toEqual([
      { key: "PEMAHAMAN", earned: 1, max: 1, pct: 100 },
      { key: "APLIKASI", earned: 1, max: 2, pct: 50 },
    ]);
  });

  it("empty input gives no groups", () => {
    expect(breakdown([], "chapter")).toEqual([]);
  });
});

describe("itemAnalysis", () => {
  it("counts full-point answers per position across students", () => {
    const a = [it_(1, "A", null, 1), it_(2, "A", null, 1, 2)];
    const b = [it_(1, "A", null, 0), it_(2, "A", null, 2, 2)];
    const c = [it_(1, "A", null, 1), it_(2, "A", null, 0, 2)];
    expect(itemAnalysis([a, b, c]).map((s) => [s.position, s.correct, s.total, s.pct])).toEqual([
      [1, 2, 3, 67],
      [2, 1, 3, 33],
    ]);
  });
});

describe("tkaCategory (D7)", () => {
  it.each([
    [100, "ISTIMEWA"], [80, "ISTIMEWA"], [79.99, "BAIK"], [60, "BAIK"],
    [59.99, "MEMADAI"], [40, "MEMADAI"], [39.99, "KURANG"], [0, "KURANG"],
  ] as const)("%s → %s", (score, cat) => {
    expect(tkaCategory(score)).toBe(cat);
  });
});
