import { expect, it } from "vitest";
import { formatWita } from "./format";

it("shows a UTC instant in WITA (UTC+8)", () => {
  const out = formatWita(new Date("2026-10-27T02:15:00Z"));
  expect(out).toContain("27 Okt 2026");
  expect(out).toContain("10.15"); // 02:15 UTC + 8h
});
