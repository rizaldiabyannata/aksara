// Teacher-only Excel export (PRD §7.9). Built per request and streamed back: never stored, never public.
import ExcelJS from "exceljs";
import { monthRecap, STATUS_LETTER } from "@/lib/attendance";
import { prisma } from "@/lib/db";
import { TYPE_LABEL } from "@/app/(teacher)/teacher/questions/labels";
import { formatWita, toWitaInput } from "@/lib/format";
import type { AnswerKeySnapshot, QuestionSnapshot } from "@/lib/quizzes";
import { getQuizRecap } from "@/lib/results";

/** User text that a spreadsheet could read as a formula is forced to text (PRD §7.9). */
export function safeText(s: string): string {
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

// Answers and keys share shapes ({optionId}, {optionIds}, {value}, {text}, {accepted}, {rubric}), so one reader covers both.
export function readable(snap: QuestionSnapshot, v: unknown): string {
  if (v === null || v === undefined) return "(kosong)";
  const alt = new Map(snap.images.map((i) => [i.id, i.altText]));
  const plain = (md: string) =>
    md.replace(/!\[[^\]]*\]\(aksara-image:([A-Za-z0-9_-]+)\)/g, (_, id: string) => `[gambar: ${alt.get(id) ?? ""}]`);
  const opt = (id: string) => plain(snap.options?.find((o) => o.id === id)?.text ?? id);
  const x = v as Record<string, unknown>;
  if (typeof x.optionId === "string") return opt(x.optionId);
  if (Array.isArray(x.optionIds)) return (x.optionIds as string[]).map(opt).join("; ");
  if (typeof x.value === "boolean") return x.value ? "Benar" : "Salah";
  if (typeof x.text === "string") return x.text || "(kosong)";
  if (Array.isArray(x.accepted)) return (x.accepted as string[]).join("; ");
  if ("rubric" in x) return typeof x.rubric === "string" ? plain(x.rubric) : "";
  return "";
}

const num = (n: number | null | undefined) => n ?? null;

export async function buildQuizWorkbook(
  quizId: string,
  now: Date = new Date(),
): Promise<{ filename: string; data: Buffer; rowCount: number } | null> {
  const recap = await getQuizRecap(quizId, now); // finalizes expired attempts first
  if (!recap) return null;
  const { quiz } = recap;
  const [questions, attempts] = await Promise.all([
    prisma.quizQuestion.findMany({
      where: { quizId },
      orderBy: { position: "asc" },
      select: { id: true, position: true, points: true, questionSnapshot: true, answerKeySnapshot: true },
    }),
    prisma.quizAttempt.findMany({
      where: { quizId },
      orderBy: [{ student: { class: { name: "asc" } } }, { student: { displayName: "asc" } }, { attemptNumber: "asc" }],
      select: {
        attemptNumber: true, slot: true, status: true, replacementGrantedAt: true, replacementReason: true,
        replacesAttemptId: true,
        student: { select: { displayName: true, nis: true, class: { select: { name: true } } } },
        answers: { select: { quizQuestionId: true, answer: true, objectivePoints: true, manualPoints: true, teacherFeedback: true } },
      },
    }),
  ]);

  const wb = new ExcelJS.Workbook();
  const rekap = wb.addWorksheet("Rekap Nilai");
  rekap.addRow([
    "No", "Kelas", "NIS", "Nama siswa", "Mata pelajaran", "Judul ulangan", "Percobaan digunakan", "Kebijakan nilai",
    "KKM", "Nilai utama", "Nilai tertinggi asli", "Poin diperoleh", "Poin maksimum", "Nilai rekap (0–100)",
    "Ketuntasan", "Status penilaian", "Waktu pengumpulan", "Status publikasi hasil",
  ]);
  const policy = quiz.scoringPolicy === "REMEDIAL" ? "Remedial" : "Nilai tertinggi";
  const release = quiz.resultsReleasedAt ? `Dirilis ${formatWita(quiz.resultsReleasedAt)}` : "Belum dirilis";
  recap.rows.forEach((r, i) => {
    // Not final → no score cells at all; the status column says why (PRD §7.9).
    const f = r.recap.final;
    rekap.addRow([
      i + 1, safeText(r.className), safeText(r.nis ?? ""), safeText(r.name), safeText(quiz.subjectName), safeText(quiz.title),
      r.attemptsUsed, policy, num(quiz.kkm),
      f ? num(r.recap.primary) : null, f ? num(r.recap.highest) : null,
      f ? num(r.earnedPoints) : null, f ? num(r.maxPoints) : null, f ? num(r.recap.recap) : null,
      f && r.recap.passed !== null ? (r.recap.passed ? "Tuntas" : "Belum tuntas") : "",
      r.status, r.lastSubmittedAt ? formatWita(r.lastSubmittedAt) : "", release,
    ]);
  });

  const rincian = wb.addWorksheet("Rincian Jawaban");
  rincian.addRow([
    "Kelas", "NIS", "Nama siswa", "Judul ulangan", "Percobaan ke-", "Nomor soal", "ID soal", "Tipe soal",
    "Jawaban siswa", "Kunci jawaban", "Poin maksimum", "Poin diperoleh", "Status penilaian", "Umpan balik guru",
  ]);
  let details = 0;
  for (const a of attempts) {
    const tags = [
      quiz.scoringPolicy === "REMEDIAL" ? (a.slot === 1 ? "Utama" : `Remedial ${a.slot - 1}`) : null,
      a.replacesAttemptId ? "Pengganti" : null,
      a.replacementGrantedAt ? `Diganti: ${a.replacementReason ?? ""}` : null,
    ].filter(Boolean);
    const label = tags.length ? `${a.attemptNumber} (${tags.join(", ")})` : String(a.attemptNumber);
    const byQ = new Map(a.answers.map((x) => [x.quizQuestionId, x]));
    for (const q of questions) {
      const snap = q.questionSnapshot as QuestionSnapshot;
      const key = q.answerKeySnapshot as AnswerKeySnapshot;
      const x = byQ.get(q.id);
      const essay = snap.type === "ESSAY";
      let status: string;
      let earned: number | null;
      if (a.status === "IN_PROGRESS") [status, earned] = ["Sedang dikerjakan", null];
      else if (a.replacementGrantedAt) [status, earned] = ["Diganti, tidak dihitung", null];
      else if (!essay) [status, earned] = ["Otomatis", x?.objectivePoints ?? 0];
      else if (x?.manualPoints == null) [status, earned] = ["Menunggu penilaian guru", null];
      else [status, earned] = ["Dinilai guru", x.manualPoints.toNumber()];
      rincian.addRow([
        safeText(a.student.class?.name ?? ""), safeText(a.student.nis ?? ""), safeText(a.student.displayName),
        safeText(quiz.title), safeText(label), q.position, q.id, TYPE_LABEL[snap.type],
        safeText(readable(snap, x?.answer ?? null)), safeText(readable(snap, key.answerKey)),
        q.points, earned, status, safeText(x?.teacherFeedback ?? ""),
      ]);
      details++;
    }
  }

  for (const ws of [rekap, rincian]) ws.getRow(1).font = { bold: true };
  const slug = quiz.title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "ulangan";
  return {
    filename: `Nilai_${slug}_${toWitaInput(now).slice(0, 10)}.xlsx`,
    data: Buffer.from(await wb.xlsx.writeBuffer()),
    rowCount: recap.rows.length + details,
  };
}

const RED = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF0000" } } as const;
const THIN = { style: "thin" } as const;

/**
 * One class's month in the shape of the school's paper book (sheet "HADIR <BULAN>"):
 * H is left blank like the book, S/I/A are letters, "-" is an open day not filled in yet.
 */
export async function buildAttendanceWorkbook(
  classId: string,
  month: string,
  now: Date = new Date(),
): Promise<{ filename: string; data: Buffer; rowCount: number } | null> {
  const r = await monthRecap(classId, month, now);
  if (!r) return null;
  const label = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${month}-01T00:00:00Z`))
    .toUpperCase();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Daftar Hadir");
  ws.addRow(["DAFTAR HADIR SISWA"]).font = { bold: true, size: 14 };
  ws.addRow([`KELAS : ${safeText(r.className)}`, "", "", `BULAN : ${label}`, ...r.days.map(() => ""), `HS : ${r.hs}`]);
  ws.addRow([]);
  const head = ws.addRow(["NO", "NO INDUK", "NISN", "NAMA SISWA", ...r.days.map((d) => d.day), "S", "I", "A", "JML"]);
  head.font = { bold: true };
  r.students.forEach((s, i) => {
    const cells = r.days.map((d, k) => {
      if (d.state !== "OPEN") return "";
      const m = s.marks[k];
      return m === "HADIR" ? "" : m ? STATUS_LETTER[m] : "-";
    });
    ws.addRow([
      i + 1, safeText(s.studentNo ?? ""), safeText(s.nis ?? ""), safeText(s.displayName),
      ...cells, s.sakit, s.izin, s.alpa, s.sakit + s.izin + s.alpa,
    ]);
  });
  const last = head.number + r.students.length;
  for (let row = head.number; row <= last; row++) {
    ws.getRow(row).eachCell({ includeEmpty: true }, (c) => {
      c.border = { top: THIN, left: THIN, bottom: THIN, right: THIN };
      c.alignment = { horizontal: Number(c.col) === 4 ? "left" : "center" };
    });
  }
  r.days.forEach((d, k) => {
    const col = ws.getColumn(5 + k);
    col.width = 3.5;
    if (d.state === "SUNDAY" || d.state === "HOLIDAY") {
      for (let row = head.number; row <= last; row++) ws.getCell(row, 5 + k).fill = RED;
    }
  });
  ws.getColumn(3).numFmt = "@";
  ws.getColumn(4).width = 32;
  ws.addRow([]);
  ws.addRow(["Keterangan: kosong = Hadir, S = Sakit, I = Izin, A = Alpa, - = belum diisi, merah = Minggu/libur"]);
  for (const d of r.days.filter((x) => x.note)) ws.addRow([`${d.day}: ${safeText(d.note!)}`]);

  const slug = r.className.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "kelas";
  return {
    filename: `Absensi_${slug}_${month}.xlsx`,
    data: Buffer.from(await wb.xlsx.writeBuffer()),
    rowCount: r.students.length,
  };
}
