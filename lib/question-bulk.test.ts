import { describe, expect, it, vi } from "vitest";
import { prisma } from "./db";
import { bulkSetQuestionStatus } from "./question-bulk";
import { makeChapter, makeClass, makeQuestion, makeStudent, makeTeacher } from "../tests/factories";
import { setup } from "../tests/quiz-setup";
import { publishQuiz } from "./quizzes";
import { countFilteredQuestions, listQuestions } from "./questions";
vi.mock("@/lib/storage", () => import("../tests/storage-fake").then(m => m.storageMock()));

async function world() {
  const { user } = await makeTeacher();
  const chapter = await makeChapter();
  const a = await makeQuestion(chapter.id, user.id, { status: "DRAFT", prompt: "Target alpha" });
  const b = await makeQuestion(chapter.id, user.id, { status: "ACTIVE", prompt: "Target beta" });
  const other = await makeQuestion((await makeChapter()).id, user.id, { status: "DRAFT", prompt: "Other" });
  return { user, chapter, a, b, other };
}

describe("bulk question status", () => {
  it("handles concurrent identical updates without duplicate audit", async () => {
    const w = await world();
    const input = { to: "ACTIVE", selection: { mode: "ids", ids: [w.a.id] } };
    const results = await Promise.all([bulkSetQuestionStatus(w.user.id, input), bulkSetQuestionStatus(w.user.id, input)]);
    expect(results.every(result => result.ok)).toBe(true);
    expect(results.reduce((sum, result) => sum + (result.ok ? result.changed : 0), 0)).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: "QUESTION_STATUS_CHANGED" } })).toBe(1);
  });
  it("shares every filter dimension with list and count", async () => {
    const w = await world();
    const sub = await prisma.subchapter.create({ data: { chapterId: w.chapter.id, title: "Subbab", order: 1 } });
    await prisma.question.update({ where: { id: w.a.id }, data: { subchapterId: sub.id } });
    const filter = { subjectId: w.chapter.subjectId, chapterId: w.chapter.id, subchapterId: sub.id, type: "SINGLE_CHOICE" as const, difficulty: "EASY" as const, status: "DRAFT" as const, q: " ALPHA " };
    expect(await countFilteredQuestions(filter)).toBe(1);
    expect((await listQuestions(filter)).rows.map(row => row.id)).toEqual([w.a.id]);
    expect(await bulkSetQuestionStatus(w.user.id, { to: "ACTIVE", selection: { mode: "filter", filter, excludedIds: [] } })).toEqual({ ok: true, matched: 1, changed: 1, unchanged: 0 });
    expect(await countFilteredQuestions(filter)).toBe(0);
  });
  it("rolls status back when audit insertion fails", async () => {
    const w = await world();
    const failing = prisma.$extends({ query: { auditLog: { createMany: async () => { throw new Error("forced audit failure"); } } } });
    const transaction = vi.spyOn(prisma, "$transaction").mockImplementationOnce(failing.$transaction.bind(failing) as typeof prisma.$transaction);
    try {
      await expect(bulkSetQuestionStatus(w.user.id, { to: "ACTIVE", selection: { mode: "ids", ids: [w.a.id] } })).rejects.toThrow("forced audit failure");
    } finally { transaction.mockRestore(); }
    expect(await prisma.question.findUniqueOrThrow({ where: { id: w.a.id } })).toMatchObject({ status: "DRAFT" });
    expect(await prisma.auditLog.count()).toBe(0);
  });
  it("preserves published snapshots and prevents publishing drafts using draft questions", async () => {
    const w = await setup();
    const before = await prisma.quizQuestion.findUniqueOrThrow({ where: { id: w.qqs[0].id } });
    expect(await bulkSetQuestionStatus(w.teacher.id, { to: "DRAFT", selection: { mode: "ids", ids: [before.questionId] } })).toMatchObject({ ok: true, changed: 1 });
    const after = await prisma.quizQuestion.findUniqueOrThrow({ where: { id: before.id } });
    expect(after.questionSnapshot).toEqual(before.questionSnapshot);
    expect(after.answerKeySnapshot).toEqual(before.answerKeySnapshot);
    const draft = await setup({}, [{}], false);
    await bulkSetQuestionStatus(draft.teacher.id, { to: "DRAFT", selection: { mode: "ids", ids: [draft.qqs[0].questionId] } });
    expect(await publishQuiz(draft.teacher.id, draft.quiz.id)).toMatchObject({ ok: false, error: "INVALID_PUBLISH" });
  });
  it("changes mixed explicit selection atomically, ignores duplicates and is idempotent", async () => {
    const w = await world();
    const input = { to: "ACTIVE", selection: { mode: "ids", ids: [w.a.id, w.b.id, w.a.id] } };
    expect(await bulkSetQuestionStatus(w.user.id, input)).toEqual({ ok: true, matched: 2, changed: 1, unchanged: 1 });
    expect(await bulkSetQuestionStatus(w.user.id, input)).toEqual({ ok: true, matched: 2, changed: 0, unchanged: 2 });
    expect(await prisma.auditLog.count({ where: { action: "QUESTION_STATUS_CHANGED" } })).toBe(1);
    expect(await bulkSetQuestionStatus(w.user.id, { ...input, to: "DRAFT" })).toMatchObject({ ok: true, changed: 2 });
    expect(await prisma.question.findUniqueOrThrow({ where: { id: w.a.id } })).toMatchObject({ status: "DRAFT", updatedById: w.user.id });
    expect(await prisma.question.findUniqueOrThrow({ where: { id: w.other.id } })).toMatchObject({ status: "DRAFT" });
  });
  it("uses filtered scope across more than one page, with exclusions and current matches", async () => {
    const w = await world();
    await prisma.question.createMany({ data: Array.from({ length: 55 }, (_, n) => ({ chapterId: w.chapter.id, createdById: w.user.id, updatedById: w.user.id, defaultPoints: 1, type: "TRUE_FALSE" as const, difficulty: "EASY" as const, prompt: `Target ${n}`, answerKey: { value: true } })) });
    const selection = { mode: "filter", filter: { subjectId: w.chapter.subjectId, chapterId: w.chapter.id, status: "DRAFT", q: " target " }, excludedIds: [w.a.id] };
    expect(await bulkSetQuestionStatus(w.user.id, { to: "ACTIVE", selection })).toEqual({ ok: true, matched: 55, changed: 55, unchanged: 0 });
    expect(await bulkSetQuestionStatus(w.user.id, { to: "ACTIVE", selection })).toEqual({ ok: true, matched: 0, changed: 0, unchanged: 0 });
    expect(await prisma.question.findUniqueOrThrow({ where: { id: w.a.id } })).toMatchObject({ status: "DRAFT" });
    expect(await prisma.question.findUniqueOrThrow({ where: { id: w.other.id } })).toMatchObject({ status: "DRAFT" });
    expect(await prisma.auditLog.count({ where: { action: "QUESTION_STATUS_CHANGED" } })).toBe(55);
  });
  it("rejects missing IDs, invalid shapes and students without partial changes", async () => {
    const w = await world();
    for (const input of [
      { to: "ACTIVE", selection: { mode: "ids", ids: [w.a.id, "missing"] } },
      { to: "ACTIVE", selection: { mode: "ids", ids: [] } },
      { to: "PUBLISHED", selection: { mode: "ids", ids: [w.a.id] } },
      { to: "ACTIVE", selection: { mode: "filter", filter: { type: "FAKE" }, excludedIds: [] } },
      { to: "ACTIVE", selection: { mode: "filter", filter: { page: 2 }, excludedIds: [] } },
      { to: "ACTIVE", selection: { mode: "ids", ids: Array(1001).fill(w.a.id) } },
    ]) expect(await bulkSetQuestionStatus(w.user.id, input)).toMatchObject({ ok: false });
    const student = await makeStudent((await makeClass()).id);
    expect(await bulkSetQuestionStatus(student.id, { to: "ACTIVE", selection: { mode: "ids", ids: [w.a.id] } })).toMatchObject({ ok: false });
    expect(await prisma.question.findUniqueOrThrow({ where: { id: w.a.id } })).toMatchObject({ status: "DRAFT" });
    expect(await prisma.auditLog.count()).toBe(0);
  });
});
