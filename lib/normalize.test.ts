import { describe, expect, it } from "vitest";
import {
  isNis,
  normalizeClassCode,
  normalizeIdentity,
  normalizeUsername,
} from "@/lib/normalize";

describe("normalizeIdentity", () => {
  it("collapses whitespace, trims, and lowercases", () => {
    expect(normalizeIdentity("  Budi \t  Santoso ")).toBe("budi santoso");
    expect(normalizeIdentity("Budi Santoso")).toBe("budi santoso");
  });

  it("applies NFKC so fullwidth letters and digits fold to ASCII", () => {
    expect(normalizeIdentity("ＢＵＤＩ")).toBe("budi");
    expect(normalizeIdentity("１２３４")).toBe("1234");
  });
});

describe("isNis", () => {
  it("accepts digits only", () => {
    expect(isNis("0012345")).toBe(true);
    expect(isNis("budi 2")).toBe(false);
    expect(isNis("")).toBe(false);
  });
});

describe("normalizeUsername", () => {
  it("trims and lowercases", () => {
    expect(normalizeUsername(" Bu.Guru_1 ")).toBe("bu.guru_1");
  });
});

describe("normalizeClassCode", () => {
  it("removes all whitespace and uppercases, since codes are shown in groups", () => {
    expect(normalizeClassCode(" abc def ")).toBe("ABCDEF");
  });
});
