import { describe, expect, it } from "vitest";
import { extractPageRange } from "./pdf-text";

const doc = {
  numPages: 3,
  getPage: async (n: number) => ({
    getTextContent: async () => ({ items: n === 2
      ? [{ str: "Bab Pecahan", hasEOL: true }, { str: "Satu per dua" }]
      : [{ str: `Halaman ${n}` }] }),
  }),
};

describe("extractPageRange", () => {
  it("takes only the selected pages and keeps paragraph breaks", async () => {
    expect(await extractPageRange(doc, 2, 3)).toBe("Bab Pecahan\nSatu per dua\n\nHalaman 3");
  });

  it("rejects invalid ranges and image-only pages", async () => {
    await expect(extractPageRange(doc, 0, 2)).rejects.toThrow("Rentang halaman tidak valid");
    await expect(extractPageRange(doc, 2, 4)).rejects.toThrow("Rentang halaman tidak valid");
    await expect(extractPageRange({ numPages: 1, getPage: async () => ({ getTextContent: async () => ({ items: [] }) }) }, 1, 1))
      .rejects.toThrow("tidak memiliki teks");
  });

  it("does not silently truncate long material", async () => {
    const long = { numPages: 1, getPage: async () => ({ getTextContent: async () => ({ items: [{ str: "a".repeat(50001) }] }) }) };
    await expect(extractPageRange(long, 1, 1)).rejects.toThrow("50.000");
  });
});
