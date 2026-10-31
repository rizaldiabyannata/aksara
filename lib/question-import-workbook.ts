import ExcelJS from "exceljs";
import { IMPORT_MAX, IMPORT_VERSION, IMPORT_SHEETS, type ImportPreview } from "./question-import-format";

const examples: Record<string, string>[] = [
  { Urutan: "1", Soal: "Hasil 12 dibagi 3 adalah ...", "Opsi A": "4", "Opsi B": "6", Kunci: "A" },
  { Urutan: "2", Soal: "Bilangan 8 adalah bilangan genap.", Kunci: "Benar" },
  { Urutan: "3", Soal: "Pilih semua bilangan genap.", "Opsi A": "2", "Opsi B": "4", "Opsi C": "5", Kunci: "A;B" },
  { Urutan: "4", Soal: "Apa nama ibu kota Provinsi Bali?", "Jawaban Diterima": "Denpasar\nKota Denpasar", "Peka Huruf": "Tidak" },
  { Urutan: "5", Soal: "Jelaskan cara menghemat air di rumah.", "Pedoman Penilaian": "Berikan poin untuk tindakan dan alasannya." },
  { Urutan: "6", Soal: "Tentukan kebenaran setiap pernyataan.", "Pernyataan A": "6 adalah bilangan genap.", "Pernyataan B": "9 adalah bilangan genap.", "Kunci A": "1", "Kunci B": "2", "Label 1": "Benar", "Label 2": "Salah" },
];
const notes: Record<string, string> = {
  Urutan: "Wajib. Bilangan bulat positif dan unik di semua lembar. Urutan pada ulangan mengikuti nomor ini.",
  Soal: "Wajib. Teks soal maksimal 5.000 karakter. Gambar ditambahkan setelah impor di Aksara.",
  Bobot: "Bilangan bulat 1–100. Kosong berarti 1.", Kesulitan: "Mudah, Sedang, atau Sulit. Kosong berarti Sedang.",
  Pembahasan: "Opsional, maksimal 5.000 karakter.", Sumber: "Opsional, maksimal 200 karakter. Jangan menganggap contoh sebagai soal dari buku.",
  "Level Kognitif": "Opsional: Pemahaman, Aplikasi, Penalaran.", Kunci: "PG: A. PG kompleks: A;C. Benar Salah: Benar atau Salah.",
  "Jawaban Diterima": "1–10 alternatif. Satu jawaban per baris dalam sel, gunakan Alt+Enter. Maksimal 200 karakter per jawaban.",
  "Peka Huruf": "Ya atau Tidak. Kosong berarti Tidak.", "Pedoman Penilaian": "Opsional. Rubrik guru maksimal 5.000 karakter.",
};

export async function buildQuestionTemplate(): Promise<ExcelJS.Workbook> {
  const book = new ExcelJS.Workbook();
  book.creator = "Aksara";
  const guide = book.addWorksheet("Petunjuk");
  guide.columns = [{ width: 28 }, { width: 110 }];
  guide.addRows([
    ["Versi Template", IMPORT_VERSION], ["Template Soal Aksara", "Isi hanya lembar tipe soal yang diperlukan. Lembar Contoh tidak diimpor."],
    ["Sel yang diisi", "Isi baris 2 dan seterusnya di enam lembar tipe soal. Jangan ubah nama lembar atau judul kolom."],
    ["Batas", "Satu file .xlsx maksimal 5 MB, total 100 soal. Satu mata pelajaran dan satu bab dipilih di aplikasi."],
    ["Urutan", "Nomor urutan wajib unik di seluruh lembar. Lembar yang tidak dipakai boleh kosong."],
    ["Nilai awal", "Bobot kosong = 1. Kesulitan kosong = Sedang. Peka Huruf kosong = Tidak. Label kategori kosong = Benar/Salah."],
    ["Opsi / pernyataan", "Isi berurutan mulai A. PG: 2–6 opsi; PG kompleks: 3–8 opsi, minimal satu benar dan satu salah; kategori: 2–6 pernyataan."],
    ["Kunci kategori", "Isi 1 untuk Label 1, 2 untuk Label 2 pada tiap pernyataan."],
    ["Rumus", "Gunakan teks biasa, bukan rumus Excel. Sel formula ditolak, termasuk hasil formula yang tersimpan."],
    ["Gambar", "Tidak diimpor. Tambahkan melalui editor Aksara setelah impor."],
    ["Setelah impor", "Periksa pratinjau, simpan ke bank soal dan draf ulangan. Periksa dan aktifkan tiap soal sebelum menerbitkan."],
  ]);
  const sample = book.addWorksheet("Contoh");
  sample.columns = [{ width: 28 }, { width: 35 }, { width: 90 }];
  sample.addRow(["Jangan diisi", "Lembar ini tidak diimpor", "Contoh buatan Aksara untuk menjelaskan format, bukan kutipan buku."]);
  IMPORT_SHEETS.forEach((def, i) => {
    sample.addRow([def.name, "Kolom", "Contoh isi"]);
    Object.entries(examples[i]).forEach(([key, value]) => sample.addRow(["", key, value]));
    const ws = book.addWorksheet(def.name, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = def.headers.map(h => ({ header: h, width: h === "Soal" || h === "Pembahasan" ? 55 : h.startsWith("Opsi") || h.startsWith("Pernyataan") ? 30 : 22 }));
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: def.headers.length } };
    def.headers.forEach((h, index) => {
      ws.getCell(1, index + 1).note = notes[h] ?? (h.startsWith("Kunci ") ? "Isi 1 atau 2 sesuai label kategori." : "Teks maksimal 1.000 karakter. Isi berurutan mulai A.");
      const column = ws.getColumn(index + 1);
      column.numFmt = "@";
      column.font = { name: "Arial", size: 11 };
      column.alignment = { vertical: "top", wrapText: true };
      const choices = h === "Kesulitan" ? '"Mudah,Sedang,Sulit"' : h === "Level Kognitif" ? '"Pemahaman,Aplikasi,Penalaran"' : h === "Peka Huruf" ? '"Ya,Tidak"' : h.startsWith("Kunci ") ? '"1,2"' : def.type === "TRUE_FALSE" && h === "Kunci" ? '"Benar,Salah"' : null;
      if (choices) for (let r = 2; r <= IMPORT_MAX + 1; r++) ws.getCell(r, index + 1).dataValidation = { type: "list", allowBlank: true, formulae: [choices], showErrorMessage: true, error: "Pilih nilai dari daftar." };
    });
  });
  for (const ws of book.worksheets) {
    ws.eachRow(row => row.eachCell(cell => {
      cell.font = { name: "Arial", size: 11 };
      cell.alignment = { vertical: "top", wrapText: true };
    }));
    ws.getRow(1).font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF9A3412" } };
    ws.getRow(1).height = 32;
  }
  return book;
}

function text(value: ExcelJS.CellValue): string | null {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object" && "richText" in value) return value.richText.map(x => x.text).join("");
  if (typeof value === "object" && "hyperlink" in value) return value.text;
  return null;
}

export function parseQuestionWorkbook(book: ExcelJS.Workbook): ImportPreview {
  const preview: ImportPreview = { rows: [], issues: [] };
  const issue = (sheet: string, row: number, column: string, message: string) => preview.issues.push({ sheet, row, column, message });
  if (text(book.getWorksheet("Petunjuk")?.getCell("B1").value ?? null) !== IMPORT_VERSION) issue("Petunjuk", 1, "Versi", "Versi template tidak sesuai. Unduh template Aksara terbaru.");
  for (const ws of book.worksheets) {
    if (["Petunjuk", "Contoh"].includes(ws.name)) continue;
    const def = IMPORT_SHEETS.find(d => d.name === ws.name);
    if (!def) { if (ws.actualRowCount) issue(ws.name, 1, "Lembar", "Lembar terisi tidak dikenali. Gunakan lembar dari template."); continue; }
    if (def.headers.some((h, i) => text(ws.getCell(1, i + 1).value) !== h)) { issue(ws.name, 1, "Kolom", "Judul kolom tidak sesuai template."); continue; }
    if (ws.rowCount > 10000 || ws.columnCount > def.headers.length + 10) { issue(ws.name, 0, "Berkas", "Lembar terlalu besar. Gunakan template baru."); continue; }
    ws.eachRow((row, n) => {
      if (n === 1) return;
      const cells: Record<string, string> = {};
      let populated = false;
      row.eachCell((cell, c) => {
        const value = text(cell.value);
        if (value === "") return;
        populated = true;
        const column = def.headers[c - 1] ?? `Kolom ${c}`;
        if (value === null) issue(ws.name, n, column, "Rumus, tanggal, atau nilai sel ini tidak didukung. Isi teks biasa.");
        else if (!def.headers[c - 1]) issue(ws.name, n, column, "Ada data di luar kolom template.");
        else cells[column] = value;
      });
      if (populated) preview.rows.push({ sheet: ws.name, row: n, cells });
    });
  }
  if (preview.rows.length > IMPORT_MAX) issue("Berkas", 0, "Soal", `Paling banyak ${IMPORT_MAX} soal sekali impor.`);
  return preview;
}
