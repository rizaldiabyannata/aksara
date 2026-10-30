import { describe, expect, it } from "vitest";
import { TIPS, isoWeek, tipOfWeek } from "./tips";

describe("tipOfWeek", () => {
  it("computes ISO weeks, including year edges", () => {
    expect(isoWeek(new Date("2026-01-01T00:00:00Z"))).toBe(1);
    expect(isoWeek(new Date("2026-12-31T00:00:00Z"))).toBe(53);
    expect(isoWeek(new Date("2027-01-03T00:00:00Z"))).toBe(53);
    expect(isoWeek(new Date("2027-01-04T00:00:00Z"))).toBe(1);
  });
  it("is stable within a week and rotates across weeks", () => {
    expect(tipOfWeek(new Date("2026-10-26T01:00:00Z"))).toBe(tipOfWeek(new Date("2026-11-01T20:00:00Z")));
    expect(tipOfWeek(new Date("2026-10-26T01:00:00Z"))).not.toBe(tipOfWeek(new Date("2026-11-02T01:00:00Z")));
    expect(TIPS).toContain(tipOfWeek(new Date()));
  });
});
