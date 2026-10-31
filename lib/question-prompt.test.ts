import { describe, expect, it } from "vitest";
import { IMPORT_MAX, IMPORT_SHEETS, IMPORT_VERSION } from "./question-import-format";
import { buildQuestionPrompt, type QuestionPromptConfig } from "./question-prompt";

const config: QuestionPromptConfig = {
  subject: "Matematika", chapter: "Pecahan", subchapters: ["Pecahan senilai"], kind: "REGULAR", context: "Gunakan konteks pasar.",
  composition: [{ type: "SINGLE_CHOICE", difficulty: "Sedang", level: "Pemahaman", count: 10, points: 1 }],
};

function prompt(input: QuestionPromptConfig = config) {
  const result = buildQuestionPrompt(input);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.issues.join(" "));
  return result.prompt;
}

describe("prompt ChatGPT untuk Excel Aksara", () => {
  it("uses the selected context and the shared workbook contract", () => {
    const text = prompt();
    for (const value of [config.subject, config.chapter, ...config.subchapters, config.context, IMPORT_VERSION]) expect(text).toContain(value);
    for (const sheet of IMPORT_SHEETS) {
      expect(text).toContain(sheet.name);
      expect(text).toContain(sheet.headers.join(" | "));
    }
    expect(text).toContain("10 soal");
    expect(text).toContain(".xlsx");
    expect(text).toContain("900000");
    const different = prompt({ ...config, subject: "IPAS", chapter: "Ekosistem", subchapters: ["Rantai makanan"] });
    expect(different).toContain("Ekosistem");
    expect(different).not.toContain("Pecahan");
  });
  it("preserves exact mixed counts, difficulty, HOTS and points independently", () => {
    const text = prompt({ ...config, composition: [
      { type: "CATEGORY", difficulty: "Mudah", level: "Penalaran", count: 3, points: 2 },
      { type: "ESSAY", difficulty: "Sulit", level: "Aplikasi", count: 2, points: 5 },
    ] });
    expect(text).toContain("Total tepat 5 soal");
    expect(text).toContain("3 soal; Kategori; Mudah; Penalaran/HOTS; bobot 2");
    expect(text).toContain("2 soal; Uraian; Sulit; Aplikasi; bobot 5");
    expect(text).toContain("Sulit tidak otomatis HOTS");
  });
  it.each([0, -1, 1.5, NaN, IMPORT_MAX + 1])("rejects invalid count %s", count => {
    expect(buildQuestionPrompt({ ...config, composition: [{ ...config.composition[0], count }] }).ok).toBe(false);
  });
  it("rejects empty composition/context, invalid enums, weights and combined overflow", () => {
    for (const change of [{ composition: [] }, { subject: "" }, { chapter: "" }, { context: "x".repeat(5001) },
      { composition: [{ ...config.composition[0], points: 0 }] },
      { composition: [{ ...config.composition[0], type: "INVALID" }] },
      { composition: [{ ...config.composition[0], count: 60 }, { ...config.composition[0], count: 60 }] },
    ]) expect(buildQuestionPrompt({ ...config, ...change } as QuestionPromptConfig).ok).toBe(false);
    expect(buildQuestionPrompt({ ...config, composition: [{ ...config.composition[0], count: 100 }] }).ok).toBe(true);
  });
  it("supports both TKA subjects, blocks unsupported subjects and retains invalid composition for correction", () => {
    const tka = { ...config, kind: "TRYOUT_TKA" as const, subject: "TKA Matematika" };
    expect(prompt(tka)).toContain("Pemahaman, Aplikasi, atau Penalaran");
    const bi = prompt({ ...tka, subject: "TKA Bahasa Indonesia", chapter: "Evaluasi dan Apresiasi", composition: [{ ...config.composition[0], level: "Penalaran" }] });
    expect(bi).toContain("Level Kognitif harus kosong");
    expect(bi).toContain("teks fiksi atau teks informasi");
    expect(bi).toContain("Penalaran/HOTS");
    expect(buildQuestionPrompt({ ...tka, subject: "IPAS" }).ok).toBe(false);
    const composition = [{ ...config.composition[0], type: "ESSAY" as const }];
    expect(buildQuestionPrompt({ ...tka, composition }).ok).toBe(false);
    expect(composition[0].type).toBe("ESSAY");
    expect(prompt(tka)).toContain("bukan soal resmi");
  });
});
