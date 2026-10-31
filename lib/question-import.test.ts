import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { prisma } from "./db";
import { importQuestionQuiz } from "./question-import";
import { publishQuiz } from "./quizzes";
import { makeTeacher, makeChapter, makeClass, makeStudent } from "../tests/factories";
vi.mock("@/lib/storage", () => import("../tests/storage-fake").then(m => m.storageMock()));

async function world() {
  const { user } = await makeTeacher();
  const chapter = await makeChapter();
  const cls = await makeClass();
  const row = (order: string) => ({ sheet: "Benar Salah", row: Number(order) + 1, cells: { Urutan: order, Soal: `Pernyataan ${order}`, Kunci: "Benar", Bobot: "3" } });
  const input = { importKey: randomUUID(), title: "Impor ulangan", subjectId: chapter.subjectId, chapterId: chapter.id, classIds: [cls.id], kind: "REGULAR", durationMinutes: "30", rows: [row("2"), row("1")] };
  return { user, chapter, cls, input };
}

describe("impor soal atomik", () => {
  it("creates draft bank and quiz preserving order, points and classes; publish still requires activation", async () => {
    const w = await world();
    const result = await importQuestionQuiz(w.user.id, w.input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const quiz = await prisma.quiz.findUniqueOrThrow({ where: { id: result.id }, include: { questions: { orderBy: { position: "asc" }, include: { question: true } }, classes: true } });
    expect(quiz).toMatchObject({ status: "DRAFT", durationMinutes: 30, maxAttempts: 1, scoringPolicy: "HIGHEST", importKey: w.input.importKey });
    expect(quiz.questions.map(q => [q.position, q.points, q.question.prompt, q.question.status])).toEqual([[1, 3, "Pernyataan 1", "DRAFT"], [2, 3, "Pernyataan 2", "DRAFT"]]);
    expect(quiz.classes.map(c => c.classId)).toEqual([w.cls.id]);
    expect(await publishQuiz(w.user.id, result.id)).toMatchObject({ ok: false, error: "INVALID_PUBLISH" });
  });
  it("deduplicates concurrent retries and rejects changed content under same key", async () => {
    const w = await world();
    const [a, b] = await Promise.all([importQuestionQuiz(w.user.id, w.input), importQuestionQuiz(w.user.id, w.input)]);
    expect(a.ok).toBe(true); expect(b).toEqual(a);
    expect(await prisma.quiz.count()).toBe(1); expect(await prisma.question.count()).toBe(2);
    const conflict = await importQuestionQuiz(w.user.id, { ...w.input, title: "Changed" });
    expect(conflict).toMatchObject({ ok: false });
    expect(await prisma.quiz.count()).toBe(1);
  });
  it("rejects students and wrong chapter/subject, inactive classes, forged rows, zero points", async () => {
    const w = await world();
    const student = await makeStudent(w.cls.id);
    expect(await importQuestionQuiz(student.id, w.input)).toMatchObject({ ok: false });
    const other = await makeChapter();
    expect(await importQuestionQuiz(w.user.id, { ...w.input, chapterId: other.id })).toMatchObject({ ok: false });
    await prisma.class.update({ where: { id: w.cls.id }, data: { isActive: false } });
    expect(await importQuestionQuiz(w.user.id, w.input)).toMatchObject({ ok: false });
    expect(await importQuestionQuiz(w.user.id, { ...w.input, rows: [{ ...w.input.rows[0], cells: { ...w.input.rows[0].cells, Bobot: "0" } }] })).toMatchObject({ ok: false });
    expect(await importQuestionQuiz(w.user.id, { ...w.input, rows: [{}] })).toMatchObject({ ok: false });
    expect(await prisma.quiz.count()).toBe(0); expect(await prisma.question.count()).toBe(0);
  });
  it("rolls back earlier inserts when a later row references a foreign image", async () => {
    const w = await world();
    w.input.rows[0].cells.Soal = "![gambar](aksara-image:foreign-image)";
    const r = await importQuestionQuiz(w.user.id, w.input);
    expect(r).toMatchObject({ ok: false });
    expect(await prisma.quiz.count()).toBe(0); expect(await prisma.question.count()).toBe(0); expect(await prisma.quizClass.count()).toBe(0);
  });
});
