import { z } from "zod";
import { questionSchema, type QuestionInput } from "@/lib/question-input";

export const IMPORT_VERSION = "AKSARA-SOAL-1";
export const IMPORT_MAX = 100;
export const IMPORT_FILE_MAX = 5 * 1024 * 1024;
export const IMPORT_BODY_MAX = 900_000;
const common = ["Urutan", "Soal", "Bobot", "Kesulitan", "Pembahasan", "Sumber", "Level Kognitif"];
const letters = "ABCDEFGH".split("");
const options = (n: number) => letters.slice(0, n).map(l => `Opsi ${l}`);
export const IMPORT_SHEETS = [
  { name: "Pilihan Ganda", type: "SINGLE_CHOICE", headers: [...common, ...options(6), "Kunci"] },
  { name: "Benar Salah", type: "TRUE_FALSE", headers: [...common, "Kunci"] },
  { name: "Pilihan Ganda Kompleks", type: "MULTIPLE_SELECT", headers: [...common, ...options(8), "Kunci"] },
  { name: "Jawaban Singkat", type: "SHORT_ANSWER", headers: [...common, "Jawaban Diterima", "Peka Huruf"] },
  { name: "Uraian", type: "ESSAY", headers: [...common, "Pedoman Penilaian"] },
  { name: "Kategori", type: "CATEGORY", headers: [...common, ...letters.slice(0, 6).map(l => `Pernyataan ${l}`), ...letters.slice(0, 6).map(l => `Kunci ${l}`), "Label 1", "Label 2"] },
] as const;

export const importRowSchema = z.object({
  sheet: z.string().max(40), row: z.number().int().min(2).max(10000),
  cells: z.record(z.string().max(40), z.string().max(10000)),
});
export type ImportRow = z.infer<typeof importRowSchema>;
export type ImportIssue = { sheet: string; row: number; column: string; message: string };
export type ImportedQuestion = { order: number; input: QuestionInput; sheet: string; row: number };
export type ImportPreview = { rows: ImportRow[]; issues: ImportIssue[] };
const difficulty: Record<string, string> = { mudah: "EASY", sedang: "MEDIUM", sulit: "HARD" };
const levels: Record<string, string> = { pemahaman: "PEMAHAMAN", aplikasi: "APLIKASI", penalaran: "PENALARAN" };
const columns: Record<string, string> = { prompt: "Soal", options: "Opsi", defaultPoints: "Bobot", difficulty: "Kesulitan", answerKey: "Kunci", explanation: "Pembahasan", sourceReference: "Sumber", categoryLabels: "Label 1 / Label 2", cognitiveLevel: "Level Kognitif" };

export function validateImportRows(raw: unknown, chapterId: string): { questions: ImportedQuestion[]; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];
  const questions: ImportedQuestion[] = [];
  const rows = z.array(importRowSchema).min(1).max(IMPORT_MAX).safeParse(raw);
  if (!rows.success) return { questions, issues: [{ sheet: "Berkas", row: 0, column: "Soal", message: `Isi 1 sampai ${IMPORT_MAX} soal dengan format template yang benar.` }] };
  const orders = new Set<number>();
  const positions = new Set<string>();
  for (const row of rows.data) {
    const issue = (column: string, message: string) => issues.push({ sheet: row.sheet, row: row.row, column, message });
    const def = IMPORT_SHEETS.find(d => d.name === row.sheet);
    if (!def) { issue("Lembar", "Nama lembar tidak dikenali."); continue; }
    const get = (key: string) => (row.cells[key] ?? "").trim();
    if (Object.keys(row.cells).some(k => !def.headers.includes(k) && get(k))) issue("Kolom", "Ada kolom terisi di luar template.");
    const position = `${row.sheet}:${row.row}`;
    if (positions.has(position)) issue("Baris", "Baris dikirim lebih dari sekali.");
    positions.add(position);
    const order = Number(get("Urutan"));
    if (!/^\d+$/.test(get("Urutan")) || !Number.isSafeInteger(order) || order < 1) issue("Urutan", "Isi nomor urutan bilangan bulat positif.");
    else if (orders.has(order)) issue("Urutan", "Urutan harus unik di seluruh lembar.");
    orders.add(order);
    const d: Record<string, unknown> = {
      chapterId, type: def.type, prompt: get("Soal"), defaultPoints: get("Bobot") || "1",
      difficulty: difficulty[(get("Kesulitan") || "Sedang").toLowerCase()] ?? "INVALID",
      cognitiveLevel: get("Level Kognitif") ? levels[get("Level Kognitif").toLowerCase()] ?? "INVALID" : undefined,
      explanation: get("Pembahasan"), sourceReference: get("Sumber"),
    };
    if (["SINGLE_CHOICE", "MULTIPLE_SELECT", "CATEGORY"].includes(def.type)) {
      const n = def.type === "MULTIPLE_SELECT" ? 8 : 6;
      const prefix = def.type === "CATEGORY" ? "Pernyataan" : "Opsi";
      const opts = letters.slice(0, n).map(l => ({ id: l.toLowerCase(), text: get(`${prefix} ${l}`) }));
      const count = opts.filter(o => o.text).length;
      if (opts.slice(0, count).some(o => !o.text)) issue(prefix === "Opsi" ? "Opsi" : "Pernyataan", "Isi berurutan dari A tanpa kolom kosong di tengah.");
      d.options = opts.filter(o => o.text);
      if (def.type === "CATEGORY") {
        const values: Record<string, boolean> = {};
        for (const [i, opt] of opts.entries()) {
          const key = get(`Kunci ${letters[i]}`);
          if (opt.text && !["1", "2"].includes(key)) issue(`Kunci ${letters[i]}`, "Isi 1 atau 2 sesuai label.");
          if (!opt.text && key) issue(`Kunci ${letters[i]}`, "Kunci tidak memiliki pernyataan.");
          if (opt.text) values[opt.id] = key === "1";
        }
        d.answerKey = { values };
        d.categoryLabels = [get("Label 1") || "Benar", get("Label 2") || "Salah"];
      } else if (def.type === "SINGLE_CHOICE") d.answerKey = { optionId: get("Kunci").toLowerCase() };
      else {
        const ids = get("Kunci").split(";").map(k => k.trim().toLowerCase());
        if (new Set(ids).size !== ids.length) issue("Kunci", "Kunci tidak boleh berulang.");
        d.answerKey = { optionIds: ids };
      }
    } else if (def.type === "TRUE_FALSE") {
      const key = get("Kunci").toLowerCase();
      d.answerKey = { value: key === "benar" ? true : key === "salah" ? false : undefined };
    } else if (def.type === "SHORT_ANSWER") {
      const sensitive = get("Peka Huruf").toLowerCase();
      if (sensitive && !["ya", "tidak"].includes(sensitive)) issue("Peka Huruf", "Pilih Ya atau Tidak.");
      d.answerKey = { accepted: get("Jawaban Diterima").split(/\r?\n/), caseSensitive: sensitive === "ya" };
    } else d.answerKey = { rubric: get("Pedoman Penilaian") };
    const parsed = questionSchema.safeParse(d);
    if (!parsed.success) for (const err of parsed.error.issues) {
      const field = String(err.path[0]);
      const column = field === "answerKey" && def.type === "SHORT_ANSWER" ? "Jawaban Diterima"
        : field === "answerKey" && def.type === "ESSAY" ? "Pedoman Penilaian"
        : field === "options" && def.type === "CATEGORY" ? "Pernyataan"
        : columns[field] ?? field;
      issue(column, err.message);
    }
    else questions.push({ order, input: parsed.data, sheet: row.sheet, row: row.row });
  }
  return { questions: questions.sort((a, b) => a.order - b.order), issues };
}
