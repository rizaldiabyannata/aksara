import "server-only";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import type { Gradebook, GradeStudent } from "@/lib/gradebook";
import { GRADE_STATE } from "@/lib/gradebook";
import { checkGradeRows, gradeFilterParams, GradebookError } from "@/lib/gradebook-filters";
import { formatWita, toWitaInput } from "@/lib/format";
import { safeText, readable } from "@/lib/export";
import { breakdown, itemAnalysis, tkaCategory, TKA_CATEGORY_LABEL, type ItemResult } from "@/lib/evaluation";
import { computeRecap } from "@/lib/scoring";
import { toScored } from "@/lib/attempts";
import type { AnswerKeySnapshot, QuestionSnapshot } from "@/lib/quizzes";

type Value = string | number | boolean | null;
export type GradeTable = { name: string; headers: string[]; rows: Value[][] };
export type GradeExportMode = "summary" | "full";
const json = (v: unknown) => v == null ? "" : JSON.stringify(v);
const date = (v: Date | null | undefined) => v ? `${formatWita(v)} WITA [${v.toISOString()}]` : "";
const identHeaders = ["ID siswa", "Nama siswa", "NISN", "Nomor induk", "Kelas saat ini", "Status akun", "ID kelas saat ini"];
const ident = (s: GradeStudent): Value[] => [s.id, s.displayName, s.nis, s.studentNo, s.class?.name ?? "Tanpa kelas", s.isActive ? "Aktif" : "Nonaktif", s.classId];

function plain(snap: QuestionSnapshot, text: string | null | undefined) {
  const alt = new Map(snap.images.map((i) => [i.id, i.altText]));
  return (text ?? "").replace(/!\[[^\]]*\]\(aksara-image:([A-Za-z0-9_-]+)\)/g, (_, id: string) => `[gambar: ${alt.get(id) ?? ""}]`);
}

/** One normalized set of tables feeds both formats. No serializer is allowed to truncate cells. */
export function buildGradeTables(book: Gradebook, mode: GradeExportMode): GradeTable[] {
  if (mode === "full" && !book.full) throw new GradebookError("Data lengkap belum dimuat.");
  const tables: GradeTable[] = [];
  const long: GradeTable = { name: "Konten Panjang", headers: ["contentRef", "Tabel", "Baris data", "Kolom", "partNumber", "totalParts", "fragmentJSON"], rows: [] };
  let rowCount = 0, refNo = 0;
  const table = (name: string, headers: string[]) => {
    const t: GradeTable = { name, headers, rows: [] }; tables.push(t); checkGradeRows(++rowCount); return t;
  };
  const add = (t: GradeTable, values: Value[]) => {
    checkGradeRows(++rowCount);
    t.rows.push(values.map((v, index) => {
      if (typeof v !== "string" || v.length <= 30000) return v;
      const ref = `konten-${++refNo}`, parts: string[] = [];
      // 4500 UTF-16 units remain below 30000 even with worst-case JSON escaping.
      for (let i = 0; i < v.length;) {
        let end = Math.min(i + 4500, v.length);
        if (end < v.length && /[\uD800-\uDBFF]/.test(v[end - 1])) end--;
        parts.push(JSON.stringify(v.slice(i, end))); i = end;
      }
      for (const [i, part] of parts.entries()) {
        checkGradeRows(++rowCount);
        long.rows.push([ref, t.name, t.rows.length + 1, t.headers[index], i + 1, parts.length, part]);
      }
      return `[Konten Panjang: ${ref}]`;
    }));
  };
  const guide = table("Petunjuk", ["Keterangan", "Isi"]);
  add(guide, ["Diambil pada", date(book.capturedAt)]);
  add(guide, ["Filter URL", gradeFilterParams(book.filters).toString() || "Semua kelas/mapel/ulangan terbit; siswa aktif"]);
  add(guide, ["Nilai", "Buku nilai hanya menampilkan angka saat status FINAL. Remedial berjalan atau menunggu pengganti belum final. Nilai kosong bukan nol."]);
  add(guide, ["Rata-rata", "Bobot sama, hanya nilai final. Jumlah nilai terhitung ditampilkan; tanpa KKM tidak masuk jumlah tuntas/belum tuntas."]);
  add(guide, ["Status", Object.entries(GRADE_STATE).map(([k, v]) => `${k}: ${v}`).join("; ")]);
  add(guide, ["Relasi tabel", "ID siswa + ID ulangan menghubungkan rekap; ID percobaan menghubungkan jawaban; ID soal ulangan menghubungkan soal snapshot. BN-xxx adalah buku nilai kelas/mapel/jenis."]);
  add(guide, ["Kelas dan riwayat", "Kelas siswa adalah kelas saat ini. Kelas tujuan ulangan bukan bukti kelas siswa saat mengerjakan. Tidak ada riwayat setiap autosave, hanya jawaban terakhir tersimpan."]);
  add(guide, ["Format teks", "NISN/nomor induk bertipe teks. Pada impor CSV, pilih tipe teks agar nol awal tidak hilang. Teks berawalan formula diberi apostrof; angka nilai tetap numerik di Excel."]);
  add(guide, ["Konten panjang", "Sel [Konten Panjang: ref] merujuk tabel Konten Panjang. Urutkan partNumber, JSON.parse setiap fragmentJSON lalu gabungkan untuk memulihkan teks persis."]);
  add(guide, ["Gambar dan keamanan", "Gambar dalam representasi terbaca menjadi teks alternatif. Dokumen lengkap berisi kunci/rubrik untuk guru; tidak berisi token ujian atau data login."]);
  add(guide, ["Evaluasi", "Dihitung pada peserta yang cocok filter, menggunakan percobaan dasar rekap final dan aturan evaluasi aplikasi. Kategori TKA merupakan perkiraan, bukan skala resmi."]);
  for (const [i, g] of book.groups.entries()) {
    const name = `BN-${String(i + 1).padStart(3, "0")}`;
    add(guide, [name, `${g.className} · ${g.subjectName} · ${g.kind}`]);
    const t = table(name, [...identHeaders, ...g.quizzes.map((q) => `${q.title} [${q.id}]`), "Rata-rata", "Nilai terhitung", "Tuntas", "Belum tuntas"]);
    for (const r of g.rows) add(t, [...ident(r.student), ...r.cells.map((c) => c.score ?? GRADE_STATE[c.state]), r.average, r.counted, r.passed, r.failed]);
  }
  if (mode === "full") {
    const recapTable = table("Rekap Nilai", [...identHeaders, "ID ulangan", "Judul ulangan", "Mapel", "Jenis", "Kelas tujuan", "Kebijakan", "KKM", "Nilai utama", "Tertinggi asli", "Nilai rekap", "Poin diperoleh", "Poin maksimum", "Ketuntasan", "Status", "Percobaan digunakan", "ID percobaan dasar", "Terakhir dikumpulkan", "Hasil dirilis pada"]);
    const finalPairs = new Set<string>();
    for (const g of book.groups) for (const r of g.rows) for (const c of r.cells) {
      const q = g.quizzes.find((q) => q.id === c.quizId)!;
      if (c.state === "FINAL") finalPairs.add(`${r.student.id}:${c.quizId}`);
      add(recapTable, [...ident(r.student), q.id, q.title, q.subject.name, q.kind, q.classes.map((c) => c.class.name).join("; "), q.scoringPolicy, q.kkm,
        c.primary, c.highest, c.score, c.earned, c.max, c.passed === null ? "" : c.passed ? "Tuntas" : "Belum tuntas", GRADE_STATE[c.state], c.attemptsUsed, c.basisId, date(c.lastSubmittedAt), date(q.resultsReleasedAt)]);
    }
    const quizzes = table("Ulangan", ["ID ulangan", "Judul", "ID mapel", "Mapel", "Jenis", "ID kelas tujuan JSON", "Kelas tujuan", "Mulai", "Berakhir", "Diterbitkan", "Rilis hasil", "ID perilis", "Durasi menit", "Maksimal percobaan", "Kebijakan", "KKM", "Instruksi", "Acak soal", "Acak opsi", "Feedback setelah rilis", "ID pembuat", "Dibuat", "Diperbarui"]);
    for (const q of book.quizzes) add(quizzes, [q.id, q.title, q.subjectId, q.subject.name, q.kind, json(q.classes.map((c) => c.classId)), q.classes.map((c) => c.class.name).join("; "), date(q.startsAt), date(q.endsAt), date(q.publishedAt), date(q.resultsReleasedAt), q.resultsReleasedById, q.durationMinutes, q.maxAttempts, q.scoringPolicy, q.kkm, q.instructions, q.shuffleQuestions, q.shuffleOptions, q.showFeedbackAfterRelease, q.createdById, date(q.createdAt), date(q.updatedAt)]);
    const questions = table("Soal", ["ID ulangan", "ID soal ulangan", "ID bank soal", "Nomor", "Tipe", "Bab", "Level", "Poin maksimum", "Teks soal", "Opsi", "Kunci atau rubrik", "Pembahasan", "Snapshot soal JSON", "Snapshot kunci JSON", "Metadata gambar terkait JSON"]);
    for (const q of book.questions) {
      const frozen = q.questionSnapshot as QuestionSnapshot, key = q.answerKeySnapshot as AnswerKeySnapshot;
      const snap = { ...frozen, images: [...q.images.map((i) => i.image), ...frozen.images] };
      add(questions, [q.quizId, q.id, q.questionId, q.position, snap.type, q.chapterSnapshot, q.levelSnapshot, q.points, plain(snap, snap.prompt),
        (snap.options ?? []).map((o) => `${o.id}: ${plain(snap, o.text)}`).join("\n"), readable(snap, key.answerKey), plain(snap, key.explanation), json(q.questionSnapshot), json(q.answerKeySnapshot), json(q.images)]);
    }
    const attemptTable = table("Percobaan", ["ID ulangan", "ID siswa", "ID percobaan", "Percobaan ke", "Slot", "Status", "Status penilaian", "Mulai", "Deadline", "Dikumpulkan", "Alasan kumpul", "Poin objektif", "Poin maksimum", "Diganti pada", "ID pemberi pengganti", "Alasan diganti", "Menggantikan ID", "Diganti oleh ID", "Bantuan diminta", "Urutan soal JSON", "Urutan opsi JSON", "Dibuat", "Diperbarui"]);
    const answers = table("Rincian Jawaban", ["ID ulangan", "ID siswa", "ID percobaan", "ID soal ulangan", "ID jawaban", "Nomor soal", "Tipe", "Jawaban siswa", "Jawaban JSON", "Kunci atau rubrik", "Poin maksimum", "Poin objektif", "Poin manual", "Status percobaan", "Diganti", "Umpan balik", "ID penilai", "Nama penilai", "Dinilai pada", "Disimpan pada"]);
    const questionsByQuiz = Map.groupBy(book.questions, (q) => q.quizId);
    for (const a of book.attempts) {
      add(attemptTable, [a.quizId, a.studentId, a.id, a.attemptNumber, a.slot, a.status, a.gradingStatus, date(a.startedAt), date(a.deadlineAt), date(a.submittedAt), a.submitReason, a.objectiveScore, a.maxPoints, date(a.replacementGrantedAt), a.replacementGrantedById, a.replacementReason, a.replacesAttemptId, a.replacedBy?.id ?? null, date(a.helpRequestedAt), json(a.questionOrder), json(a.optionOrder), date(a.createdAt), date(a.updatedAt)]);
      const byQuestion = new Map(a.answers.map((x) => [x.quizQuestionId, x]));
      for (const q of questionsByQuiz.get(a.quizId) ?? []) {
        const snap = q.questionSnapshot as QuestionSnapshot, key = q.answerKeySnapshot as AnswerKeySnapshot;
        const x = byQuestion.get(q.id);
        add(answers, [a.quizId, a.studentId, a.id, q.id, x?.id ?? null, q.position, snap.type, readable(snap, x?.answer), json(x?.answer), readable(snap, key.answerKey), q.points,
          x?.objectivePoints ?? null, x?.manualPoints?.toNumber() ?? null, a.status, !!a.replacementGrantedAt, x?.teacherFeedback ?? "", x?.gradedById ?? null, x?.gradedBy?.displayName ?? "", date(x?.gradedAt), date(x?.savedAt)]);
      }
    }
    const elements = table("Rincian Elemen", ["ID ulangan", "ID siswa", "ID percobaan dasar", "Nilai rekap", "Kategori perkiraan TKA", "Dimensi", "Elemen", "Poin diperoleh", "Poin maksimum", "Persentase"]);
    const items = table("Analisis Butir", ["ID ulangan", "ID soal ulangan", "Nomor", "Bab", "Level", "Tipe", "Siswa benar", "Jumlah siswa", "Benar persen"]);
    const attemptsByQuiz = Map.groupBy(book.attempts, (a) => a.quizId);
    for (const q of book.quizzes) {
      const qs = questionsByQuiz.get(q.id) ?? [], itemSets: ItemResult[][] = [];
      for (const [studentId, as] of Map.groupBy(attemptsByQuiz.get(q.id) ?? [], (a) => a.studentId)) {
        // Use the gradebook's process-level FINAL gate, including pending replacements.
        const scored = as.map(toScored), recap = computeRecap(scored, q);
        if (!finalPairs.has(`${studentId}:${q.id}`) || !recap.basis || recap.recap === null) continue;
        const basis = as[scored.indexOf(recap.basis)], byQ = new Map(basis.answers.map((x) => [x.quizQuestionId, x]));
        const its: ItemResult[] = qs.map((qq) => {
          const x = byQ.get(qq.id), type = (qq.questionSnapshot as QuestionSnapshot).type;
          return { position: qq.position, chapter: qq.chapterSnapshot, level: qq.levelSnapshot, type, points: qq.points, earned: type === "ESSAY" ? x?.manualPoints?.toNumber() ?? 0 : x?.objectivePoints ?? 0 };
        });
        itemSets.push(its);
        for (const by of ["chapter", "level"] as const) for (const g of breakdown(its, by)) add(elements, [q.id, studentId, basis.id, recap.recap, q.kind === "TRYOUT_TKA" ? TKA_CATEGORY_LABEL[tkaCategory(recap.recap)] : "", by === "chapter" ? "Bab" : "Level", g.key, g.earned, g.max, g.pct]);
      }
      for (const stat of itemAnalysis(itemSets)) add(items, [q.id, qs.find((qq) => qq.position === stat.position)!.id, stat.position, stat.chapter, stat.level, stat.type, stat.correct, stat.total, stat.pct]);
    }
  }
  if (long.rows.length) { checkGradeRows(++rowCount); tables.push(long); }
  return tables;
}

/** Strings always stay strings in Excel; CSV import guidance covers leading-zero identifiers. */
export async function serializeGradebook(tables: GradeTable[], format: "xlsx" | "csv", capturedAt: Date) {
  checkGradeRows(tables.reduce((n, t) => n + t.rows.length + 1, 0));
  const filename = `Buku_Nilai_${toWitaInput(capturedAt).slice(0, 10)}`;
  if (format === "xlsx") {
    const wb = new ExcelJS.Workbook();
    for (const t of tables) {
      const ws = wb.addWorksheet(t.name);
      ws.addRow(t.headers.map(safeText)).font = { bold: true };
      for (const row of t.rows) {
        const r = ws.addRow(row.map((v) => typeof v === "string" ? safeText(v) : v));
        r.eachCell((c) => { if (typeof c.value === "string") c.numFmt = "@"; else if (typeof c.value === "number") c.numFmt = "0.00"; });
      }
      ws.views = [{ state: "frozen", ySplit: 1, xSplit: t.name.startsWith("BN-") ? 2 : 0 }];
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, ws.rowCount), column: t.headers.length } };
      t.headers.forEach((h, i) => { ws.getColumn(i + 1).width = Math.min(45, Math.max(18, h.length + 2)); });
    }
    return { filename: `${filename}.xlsx`, type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", data: Buffer.from(await wb.xlsx.writeBuffer()), rowCount: tables.reduce((n, t) => n + t.rows.length, 0) };
  }
  const zip = new JSZip();
  const csvCell = (v: Value) => `"${(typeof v === "string" ? safeText(v) : v == null ? "" : String(v)).replace(/"/g, '""')}"`;
  for (const t of tables) zip.file(`${t.name}.csv`, "\uFEFF" + [t.headers, ...t.rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n");
  return { filename: `${filename}.zip`, type: "application/zip", data: await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }), rowCount: tables.reduce((n, t) => n + t.rows.length, 0) };
}
