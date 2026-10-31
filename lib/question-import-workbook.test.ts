import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { buildQuestionTemplate, parseQuestionWorkbook } from "./question-import-workbook";
import { IMPORT_SHEETS, validateImportRows } from "./question-import-format";

async function filled() {
  const book = await buildQuestionTemplate();
  const values = [
    { Urutan: "6", Soal: "Hasil 1 + 1?", "Opsi A": "2", "Opsi B": "3", Kunci: "A" },
    { Urutan: "5", Soal: "Dua bilangan genap.", Kunci: "Benar" },
    { Urutan: "4", Soal: "Pilih genap", "Opsi A": "2", "Opsi B": "4", "Opsi C": "5", Kunci: "A;B" },
    { Urutan: "3", Soal: "Ibu kota Indonesia?", "Jawaban Diterima": "Jakarta\nDKI Jakarta" },
    { Urutan: "2", Soal: "Jelaskan fotosintesis.", "Pedoman Penilaian": "Proses dan bahan" },
    { Urutan: "1", Soal: "Kelompokkan", "Pernyataan A": "2 genap", "Pernyataan B": "3 genap", "Kunci A": "1", "Kunci B": "2" },
  ];
  IMPORT_SHEETS.forEach((def, i) => { book.getWorksheet(def.name)!.getRow(2).values = def.headers.map(h => values[i][h as keyof typeof values[number]] ?? ""); });
  return book;
}

describe("template impor soal", () => {
  it("roundtrips six types, ignores examples and sorts across sheets", async () => {
    const book = await filled();
    const copy = new ExcelJS.Workbook();
    await copy.xlsx.load(await book.xlsx.writeBuffer());
    const preview = parseQuestionWorkbook(copy);
    expect(preview.issues).toEqual([]);
    expect(preview.rows).toHaveLength(6);
    const parsed = validateImportRows(preview.rows, "chapter");
    expect(parsed.issues).toEqual([]);
    expect(parsed.questions.map(q => q.input.type)).toEqual(["CATEGORY", "ESSAY", "SHORT_ANSWER", "MULTIPLE_SELECT", "TRUE_FALSE", "SINGLE_CHOICE"]);
    expect(parsed.questions[0].input).toMatchObject({ defaultPoints: 1, difficulty: "MEDIUM", categoryLabels: ["Benar", "Salah"], answerKey: { values: { a: true, b: false } } });
    expect(parsed.questions[3].input).toMatchObject({ answerKey: { optionIds: ["a", "b"] } });
  });
  it("has no examples on editable sheets", async () => {
    const book = await buildQuestionTemplate();
    expect(book.getWorksheet("Contoh")!.rowCount).toBeGreaterThan(6);
    expect(parseQuestionWorkbook(book).rows).toEqual([]);
    expect(validateImportRows([], "chapter").issues[0].message).toContain("Isi");
  });
  it("rejects cached formulas with exact location", async () => {
    const book = await filled();
    book.getWorksheet("Pilihan Ganda")!.getCell("B2").value = { formula: '"Soal"', result: "Soal" };
    expect(parseQuestionWorkbook(book).issues).toContainEqual(expect.objectContaining({ sheet: "Pilihan Ganda", row: 2, column: "Soal", message: expect.stringContaining("Rumus") }));
  });
  it("rejects header, version and unknown populated sheets", async () => {
    const book = await filled();
    book.getWorksheet("Petunjuk")!.getCell("B1").value = "old";
    book.getWorksheet("Uraian")!.getCell("A1").value = "Nomor";
    book.addWorksheet("Lain").addRow(["soal terselip"]);
    expect(parseQuestionWorkbook(book).issues.length).toBeGreaterThanOrEqual(3);
  });
  it("reports duplicate order, gaps, invalid keys and partial rows", async () => {
    const book = await filled();
    const ws = book.getWorksheet("Pilihan Ganda")!;
    ws.getCell("A2").value = "1";
    ws.getCell("H2").value = "4"; // Opsi A after seven common headers
    const preview = parseQuestionWorkbook(book);
    const result = validateImportRows(preview.rows, "chapter");
    expect(result.issues.some(i => i.column === "Urutan")).toBe(true);
    const row = { sheet: "Pilihan Ganda", row: 3, cells: { Urutan: "7", Soal: "X", "Opsi A": "a", "Opsi C": "c", Kunci: "Z" } };
    expect(validateImportRows([row], "chapter").issues.some(i => i.column === "Opsi")).toBe(true);
    expect(validateImportRows([{ ...row, cells: { Urutan: "7" } }], "chapter").issues.some(i => i.column === "Soal")).toBe(true);
  });
  it("rejects normalized duplicate short answers and >100 rows", () => {
    const row = { sheet: "Jawaban Singkat", row: 2, cells: { Urutan: "1", Soal: "X", "Jawaban Diterima": "Jakarta\n jakarta " } };
    expect(validateImportRows([row], "chapter").issues.some(i => i.column === "Jawaban Diterima")).toBe(true);
    expect(validateImportRows(Array.from({ length: 101 }, () => row), "chapter").issues[0].message).toContain("100");
  });
});
