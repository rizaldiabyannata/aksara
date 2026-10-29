import { describe, expect, it } from "vitest";
import { readable, safeText } from "@/lib/export";
import type { QuestionSnapshot } from "@/lib/quizzes";

const snap = {
  type: "MULTIPLE_SELECT", prompt: "p",
  options: [{ id: "a", text: "Lihat ![x](aksara-image:img1)" }, { id: "b", text: "Dua" }],
  images: [{ id: "img1", altText: "segitiga siku-siku", caption: null, sourceReference: null, width: 1, height: 1 }],
} as QuestionSnapshot;

describe("export text", () => {
  it("answers and keys become readable text, images as [gambar: alt]", () => {
    expect(readable(snap, { optionIds: ["a", "b"] })).toBe("Lihat [gambar: segitiga siku-siku]; Dua");
    expect(readable(snap, { value: false })).toBe("Salah");
    expect(readable(snap, { accepted: ["Jakarta", "DKI"] })).toBe("Jakarta; DKI");
    expect(readable(snap, { rubric: null })).toBe("");
    expect(readable(snap, null)).toBe("(kosong)");
  });

  it("safeText prefixes formula starters only", () => {
    for (const s of ["=1+1", "+62", "-5", "@x", "\tA", "\rA"]) expect(safeText(s)).toBe(`'${s}`);
    expect(safeText("Budi = pintar")).toBe("Budi = pintar");
  });
});
