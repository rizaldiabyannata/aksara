import { describe, expect, it } from "vitest";
import { formatWita, parseWitaInput, toWitaInput } from "./format";

it("shows a UTC instant in WITA (UTC+8)", () => {
  const out = formatWita(new Date("2026-10-27T02:15:00Z"));
  expect(out).toContain("27 Okt 2026");
  expect(out).toContain("10.15"); // 02:15 UTC + 8h
});

describe("WITA input", () => {
  it("parses a WITA wall-clock value to UTC", () => {
    expect(parseWitaInput("2026-11-01T08:00")?.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("rejects malformed and rolled-over values", () => {
    for (const s of ["2026-13-01T08:00", "2026-02-30T08:00", "2026-11-01T25:00", "", "abc"]) {
      expect(parseWitaInput(s)).toBeNull();
    }
  });

  it("formats a Date as WITA input", () => {
    expect(toWitaInput(new Date("2026-11-01T00:00:00Z"))).toBe("2026-11-01T08:00");
  });
});
