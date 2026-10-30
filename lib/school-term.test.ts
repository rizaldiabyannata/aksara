import { describe, expect, it } from "vitest";
import { schoolTerm } from "@/lib/school-term";

const t = (iso: string) => schoolTerm(new Date(iso)).label;

describe("schoolTerm (WITA)", () => {
  it("Ganjil from 1 July", () => {
    expect(t("2026-07-01T00:00:00+08:00")).toBe("T.A 2026/2027 · Semester Ganjil");
    expect(t("2026-10-30T10:00:00+08:00")).toBe("T.A 2026/2027 · Semester Ganjil");
  });
  it("Genap until 30 June", () => {
    expect(t("2026-06-30T23:59:59+08:00")).toBe("T.A 2025/2026 · Semester Genap");
    expect(t("2026-03-01T10:00:00+08:00")).toBe("T.A 2025/2026 · Semester Genap");
  });
  it("year rolls over on 1 January", () => {
    expect(t("2026-12-31T23:59:59+08:00")).toBe("T.A 2026/2027 · Semester Ganjil");
    expect(t("2027-01-01T00:00:00+08:00")).toBe("T.A 2026/2027 · Semester Genap");
  });
  it("uses WITA, not UTC", () => {
    // 16:00 UTC on 31 Dec is already 1 Jan in WITA.
    expect(t("2026-12-31T16:00:00Z")).toBe("T.A 2026/2027 · Semester Genap");
    expect(t("2026-06-30T16:00:00Z")).toBe("T.A 2026/2027 · Semester Ganjil");
  });
  it("returns parts", () => {
    expect(schoolTerm(new Date("2026-10-30T00:00:00Z"))).toMatchObject({ year: "2026/2027", semester: "Ganjil" });
  });
});
