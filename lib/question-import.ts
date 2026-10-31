import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { importRowSchema, IMPORT_MAX, validateImportRows } from "@/lib/question-import-format";
import { createQuestionInTransaction } from "@/lib/questions";
import { createQuizInTransaction, createQuizSchema } from "@/lib/quizzes";
import { parse, required, type Invalid } from "@/lib/validation";
import { uniqueViolation } from "@/lib/unique-violation";
import { writeAudit } from "@/lib/audit";

const schema = z.object({
  importKey: z.uuid({ error: "Identitas impor tidak valid. Baca ulang berkas." }),
  title: required(150, "Judul wajib diisi, paling banyak 150 huruf."),
  subjectId: required(100, "Pilih mata pelajaran."),
  chapterId: required(100, "Pilih bab."),
  kind: z.enum(["REGULAR", "TRYOUT_TKA"]),
  durationMinutes: z.string().max(3),
  classIds: z.array(z.string().min(1).max(100)).min(1, "Pilih minimal satu kelas aktif.").max(100),
  rows: z.array(importRowSchema).min(1).max(IMPORT_MAX),
});
type Success = { ok: true; id: string };
const invalid = (field: string, message: string): Invalid => ({ ok: false, error: "INVALID", fieldErrors: { [field]: message } });
class RejectedImport extends Error {
  constructor(readonly result: Invalid) { super("Import rejected"); }
}

export async function importQuestionQuiz(actorId: string, input: unknown): Promise<Success | Invalid> {
  const parsed = parse(schema, input);
  if (!parsed.ok) return parsed;
  const d = parsed.data;
  const user = await prisma.user.findFirst({ where: { id: actorId, role: "TEACHER", isActive: true }, select: { id: true } });
  if (!user) return invalid("form", "Hanya guru yang dapat mengimpor soal.");
  const rows = validateImportRows(d.rows, d.chapterId);
  if (rows.issues.length) return invalid("rows", rows.issues.map(i => `${i.sheet}, baris ${i.row}, ${i.column}: ${i.message}`).slice(0, 20).join("\n"));
  const settings = parse(createQuizSchema, {
    subjectId: d.subjectId, title: d.title, kind: d.kind, durationMinutes: d.durationMinutes,
    instructions: "", startsAt: "", endsAt: "", maxAttempts: "1", scoringPolicy: "HIGHEST", kkm: "",
    shuffleQuestions: "", shuffleOptions: "", showFeedbackAfterRelease: "on",
  });
  if (!settings.ok) return settings;
  const classIds = [...new Set(d.classIds)].sort();
  const fingerprint = createHash("sha256").update(JSON.stringify({ settings: settings.data, chapterId: d.chapterId, classIds, questions: rows.questions.map(q => ({ order: q.order, input: q.input })) })).digest("hex");
  const where = { createdById_importKey: { createdById: actorId, importKey: d.importKey } };
  const existingResult = (existing: { id: string; importFingerprint: string | null }): Success | Invalid => existing.importFingerprint === fingerprint
    ? { ok: true, id: existing.id }
    : invalid("form", "Isi impor berubah. Baca ulang berkas untuk memulai impor baru.");
  try {
    return await prisma.$transaction(async tx => {
      const existing = await tx.quiz.findUnique({ where, select: { id: true, importFingerprint: true } });
      if (existing) return existingResult(existing);
      const chapter = await tx.chapter.findFirst({ where: { id: d.chapterId, subjectId: d.subjectId }, select: { id: true } });
      if (!chapter) return invalid("chapterId", "Bab harus berasal dari mata pelajaran yang dipilih.");
      const active = await tx.class.count({ where: { id: { in: classIds }, isActive: true } });
      if (active !== classIds.length) return invalid("classIds", "Pilih kelas aktif yang masih tersedia.");
      const quiz = await createQuizInTransaction(tx, actorId, settings.data);
      if (!quiz.ok) throw new RejectedImport(quiz);
      await tx.quiz.update({ where: { id: quiz.id }, data: { importKey: d.importKey, importFingerprint: fingerprint } });
      await tx.quizClass.createMany({ data: classIds.map(classId => ({ quizId: quiz.id, classId })) });
      for (const [index, row] of rows.questions.entries()) {
        const question = await createQuestionInTransaction(tx, actorId, row.input);
        if (!question.ok) throw new RejectedImport(invalid("rows", `${row.sheet}, baris ${row.row}: ${Object.values(question.fieldErrors).join(" ")}`));
        await tx.quizQuestion.create({ data: { quizId: quiz.id, questionId: question.id, position: index + 1, points: row.input.defaultPoints } });
      }
      await writeAudit(tx, { actorUserId: actorId, action: "QUESTIONS_IMPORTED", entityType: "Quiz", entityId: quiz.id, metadata: { questionCount: rows.questions.length } });
      return quiz;
    }, { timeout: 30_000 });
  } catch (e) {
    if (e instanceof RejectedImport) return e.result;
    if (uniqueViolation(e, { Quiz_createdById_importKey_key: "retry" })) {
      const existing = await prisma.quiz.findUnique({ where, select: { id: true, importFingerprint: true } });
      if (existing) return existingResult(existing);
    }
    throw e;
  }
}
