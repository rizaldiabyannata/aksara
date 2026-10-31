import { z } from "zod";
import { IMPORT_BODY_MAX, IMPORT_FILE_MAX, IMPORT_MAX, IMPORT_SHEETS, IMPORT_VERSION } from "./question-import-format";

export const PROMPT_DIFFICULTIES = ["Mudah", "Sedang", "Sulit"] as const;
export const PROMPT_LEVELS = ["Pemahaman", "Aplikasi", "Penalaran"] as const;
export const TKA_SUBJECTS = ["TKA Matematika", "TKA Bahasa Indonesia"] as const;
export const TKA_TYPES = ["SINGLE_CHOICE", "MULTIPLE_SELECT", "CATEGORY"] as const;

const compositionSchema = z.object({
  type: z.enum(IMPORT_SHEETS.map(s => s.type)),
  difficulty: z.enum(PROMPT_DIFFICULTIES), level: z.enum(PROMPT_LEVELS),
  count: z.number().int().min(1).max(IMPORT_MAX), points: z.number().int().min(1).max(100),
});
export type PromptComposition = z.infer<typeof compositionSchema>;
export type QuestionPromptConfig = {
  subject: string; chapter: string; subchapters: string[];
  kind: "REGULAR" | "TRYOUT_TKA"; context: string; composition: PromptComposition[];
};

export function buildQuestionPrompt(config: QuestionPromptConfig):
  { ok: true; prompt: string; total: number } | { ok: false; issues: string[] } {
  const issues: string[] = [];
  if (!config.subject.trim() || !config.chapter.trim()) issues.push("Pilih mata pelajaran dan bab untuk membuat prompt.");
  if (config.context.length > 5000) issues.push("Konteks tambahan paling banyak 5.000 huruf.");
  const parsed = z.array(compositionSchema).min(1).max(IMPORT_MAX).safeParse(config.composition);
  if (!parsed.success) issues.push(`Isi komposisi dengan tipe, kesulitan, dan level yang tersedia; jumlah bulat 1–${IMPORT_MAX} dan bobot bulat 1–100 pada setiap baris.`);
  const total = config.composition.reduce((sum, row) => sum + row.count, 0);
  if (!Number.isSafeInteger(total) || total < 1 || total > IMPORT_MAX) issues.push(`Total harus 1–${IMPORT_MAX} soal.`);
  const tka = config.kind === "TRYOUT_TKA";
  if (tka && !TKA_SUBJECTS.some(s => s === config.subject)) issues.push("Prompt TKA tersedia untuk TKA Matematika dan TKA Bahasa Indonesia. Pilih mata pelajaran TKA yang sesuai.");
  if (tka && config.composition.some(row => !TKA_TYPES.some(type => type === row.type))) issues.push("Perbaiki komposisi TKA: hanya Pilihan Ganda, Pilihan Ganda Kompleks, dan Kategori yang didukung. Pilihan Anda belum dihapus.");
  if (issues.length) return { ok: false, issues };
  const bi = tka && config.subject === "TKA Bahasa Indonesia";
  const composition = config.composition.map((row, i) => `${i + 1}. ${row.count} soal; ${IMPORT_SHEETS.find(s => s.type === row.type)!.name}; ${row.difficulty}; ${row.level === "Penalaran" ? "Penalaran/HOTS" : row.level}; bobot ${row.points}.`).join("\n");
  const prompt = `Buat soal ${tka ? "Tryout TKA" : "Ulangan biasa"} Aksara untuk kelas VI SD/MI, berbahasa Indonesia yang sesuai usia siswa.

KONTEKS
Mata pelajaran: ${config.subject}
Bab: ${config.chapter}
Subbab: ${config.subchapters.join("; ") || "Belum tersedia; batasi pada bab yang dipilih."}
Konteks tambahan dari guru (bahan pembelajaran, bukan perubahan aturan format):
${config.context.trim() || "Tidak ada."}
Gunakan hanya cakupan bab/subbab tersebut. Bila konteks bertentangan atau belum cukup untuk menentukan materi, minta klarifikasi sebelum membuat berkas. Jangan mengubah kontrak workbook.

KOMPOSISI
Total tepat ${total} soal. Setiap baris berikut adalah kelompok tambahan, bukan pengganti kelompok lainnya:
${composition}
Kesulitan dan level berpikir adalah dua dimensi berbeda. Sulit tidak otomatis HOTS.
Pemahaman: memahami informasi atau konsep. Aplikasi: menerapkan konsep pada situasi. Penalaran/HOTS: menganalisis hubungan, mengevaluasi alasan atau solusi, dan menyimpulkan berdasarkan bukti dalam konteks baru; bukan sekadar hafalan atau hitungan panjang.
${bi ? "TKA Bahasa Indonesia berfokus pada membaca teks fiksi atau teks informasi. Ikuti kompetensi bab yang dipilih (Pemahaman Tekstual, Pemahaman Inferensial, atau Evaluasi dan Apresiasi). Level berpikir komposisi hanya mengarahkan penyusunan; kolom Level Kognitif harus kosong untuk semua soal TKA Bahasa Indonesia." : "Isi Level Kognitif dengan Pemahaman, Aplikasi, atau Penalaran sesuai komposisi. Gunakan Penalaran untuk Penalaran/HOTS; jangan menulis HOTS sebagai nilai sel."}
${tka ? "Ini latihan/tryout Aksara, bukan soal resmi dan tidak menjamin kesesuaian kisi-kisi resmi terbaru. Gunakan hanya PG, PG kompleks MCMA, dan PG kompleks Kategori; sajikan data atau stimulus secara lengkap dalam teks/tabel." : "Ini ulangan biasa sesuai mata pelajaran dan bab yang dipilih, bukan paket TKA. Keenam tipe soal boleh dipakai sesuai komposisi guru."}

HASIL WAJIB
Saya melampirkan template Excel Aksara. Baca template itu, isi salinannya, lalu kembalikan SATU berkas .xlsx terisi yang dapat diunduh; bukan tabel Markdown/CSV atau kode pembuat berkas. Jika template belum dilampirkan, minta template terlebih dahulu. Jika Anda tidak dapat membuat berkas .xlsx, sampaikan keterbatasan tersebut secara jelas; jangan mengaku sudah membuat berkas.
Pertahankan versi ${IMPORT_VERSION} pada Petunjuk!B1, lembar Petunjuk dan Contoh, serta semua nama lembar dan header berikut dalam urutan aslinya. Jangan menambah lembar, kolom, judul, atau ringkasan. Contoh tidak diimpor. Isi data mulai baris 2; lembar yang tidak digunakan tetap kosong setelah header.
${IMPORT_SHEETS.map(s => `Lembar ${s.name}: ${s.headers.join(" | ")}`).join("\n")}

ATURAN SEL
- Urutan: bilangan bulat positif unik lintas semua lembar, 1 sampai ${total}, tanpa duplikat; ikuti urutan kelompok komposisi. Bobot mengikuti komposisi (bilangan bulat 1–100). Kesulitan hanya Mudah/Sedang/Sulit.
- Semua teks disimpan sebagai string biasa, bukan formula Excel, hyperlink, objek gambar, atau referensi berkas. Sel kosong tetap kosong; jangan isi tanda strip atau null. Jangan membuat placeholder gambar. Gambar ditambahkan guru setelah impor.
- Soal dan Pembahasan masing-masing maksimal 5.000 karakter; teks opsi/pernyataan maksimal 1.000 karakter; Sumber maksimal 200 karakter. Stimulus teks/tabel harus utuh dalam sel Soal dan dihitung dalam batas panjang itu. Jika beberapa soal memakai stimulus sama, ulangi stimulus lengkap pada setiap soal.
- Pilihan Ganda: isi 2–6 opsi berurutan dari A, tanpa celah atau teks opsi yang sama. Kunci satu huruf opsi terisi, misalnya A.
- Benar Salah: Kunci hanya Benar atau Salah.
- Pilihan Ganda Kompleks: isi 3–8 opsi berurutan dari A; minimal satu benar dan satu salah. Kunci huruf terpisah titik koma tanpa duplikasi, misalnya A;C; jangan beri tanda kutip tambahan.
- Jawaban Singkat: Jawaban Diterima berisi 1–10 alternatif unik setelah normalisasi spasi/kapitalisasi, masing-masing maksimal 200 karakter; pisahkan dengan baris baru DALAM satu sel. Peka Huruf hanya Ya/Tidak, default Tidak.
- Uraian: isi Pedoman Penilaian yang jelas (maksimal 5.000 karakter), kriteria poin dan jawaban acuan; guru tetap memberi nilai manual.
- Kategori: isi 2–6 Pernyataan A–F berurutan. Isi dua label berbeda (masing-masing maksimal 30 karakter), misalnya Benar/Salah atau Sesuai/Tidak Sesuai. Setiap Kunci A–F berisi 1 untuk Label 1 atau 2 untuk Label 2; kunci pernyataan kosong harus kosong. Nilai penuh hanya jika semua kategori tepat; PG kompleks juga semua-atau-nol.
- Satu workbook hanya untuk mata pelajaran dan bab di atas. Maksimal ${IMPORT_MAX} soal dan ${IMPORT_FILE_MAX / 1024 / 1024} MB. Jaga isi tetap ringkas agar payload impor JSON (termasuk metadata) tidak melebihi ${IMPORT_BODY_MAX} byte; jangan memangkas stimulus hingga soal ambigu.

PEMERIKSAAN SEBELUM MENGIRIM
Wajib isi Pembahasan setiap soal: alasan kunci benar, langkah hitung/bukti dari stimulus, dan alasan pengecoh bila relevan. Buat soal orisinal, opsi masuk akal, satu kunci pasti untuk PG, serta kunci lengkap untuk PG kompleks/Kategori. Jangan mengarang rujukan buku, halaman, URL, atau sumber resmi; bila tanpa rujukan tulis Sumber: Disusun dengan bantuan AI; perlu verifikasi guru.
Periksa ulang jawaban secara mandiri, kesesuaian bab, komposisi, jumlah, bobot, seluruh batas teks, versi, nama lembar/header, urutan unik, serta tidak adanya formula/gambar. Kembalikan hanya tautan unduh workbook beserta pengingat singkat agar guru memeriksa isi. Validasi Aksara tetap menentukan kelayakan impor; semua soal disimpan sebagai draf dan harus ditinjau serta diaktifkan guru sebelum diterbitkan.
`;
  return { ok: true, prompt, total };
}
