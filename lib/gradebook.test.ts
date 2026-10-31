import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { getGradebook } from "@/lib/gradebook";
import { parseGradeFilters } from "@/lib/gradebook-filters";
import { gradeEssay, saveAnswer, startAttempt, submitAttempt } from "@/lib/attempts";
import { releaseResults } from "@/lib/results";
import { makeClass, makeStudent } from "../tests/factories";
import { at, setup, started, t0 } from "../tests/quiz-setup";

vi.mock("@/lib/storage", () => import("../tests/storage-fake").then((m) => m.storageMock()));

describe("gradebook", () => {
  it("validates WITA dates, range, kind and preserves identifiers", () => {
    expect(() => parseGradeFilters(new URLSearchParams("from=2030-02-30"))).toThrow();
    expect(() => parseGradeFilters(new URLSearchParams("from=2030-02-02&to=2030-01-01"))).toThrow();
    expect(() => parseGradeFilters(new URLSearchParams("kind=UNKNOWN"))).toThrow();
    expect(parseGradeFilters(new URLSearchParams("q=0012&includeHistory=1"))).toMatchObject({ q: "0012", includeHistory: true });
  });

  it("includes idle active roster, counts zero as final, excludes unassigned and pending from average", async () => {
    const s = await setup();
    await makeStudent(s.cls.id, { displayName: "Idle", studentNo: "0012" });
    const other = await setup({}, [{ type: "ESSAY" }]);
    await prisma.quizClass.create({ data: { quizId: other.quiz.id, classId: s.cls.id } });
    const id = await started(s);
    await submitAttempt(s.student.id, s.quiz.id, id, at(1));
    const book = await getGradebook({}, { now: at(2) });
    const group = book.groups.find((g) => g.classId === s.cls.id && g.subjectId === s.chapter.subjectId)!;
    const row = group.rows.find((r) => r.student.id === s.student.id)!;
    expect(row.average).toBe(0);
    expect(row.counted).toBe(1);
    expect(row.cells[0]).toMatchObject({ state: "FINAL", score: 0 });
    expect(group.rows.find((r) => r.student.studentNo === "0012")?.average).toBeNull();
    const foreignGroup = book.groups.find((g) => g.classId === other.cls.id && g.subjectId === s.chapter.subjectId)!;
    expect(foreignGroup.rows[0].cells[0]).toMatchObject({ state: "NOT_ASSIGNED", score: null });
  });

  it("intersects quiz IDs, dates, class and subject; search includes NISN/studentNo", async () => {
    const s = await setup({ startsAt: at(0), endsAt: at(100000) });
    await prisma.user.update({ where: { id: s.student.id }, data: { nis: "001234", studentNo: "00987" } });
    const filters = { classIds: [s.cls.id], subjectIds: [s.chapter.subjectId], quizIds: [s.quiz.id], from: "2030-01-01", to: "2030-01-01", q: "00987" };
    const book = await getGradebook(filters, { now: at(2) });
    expect(book.students.map((s) => s.nis)).toEqual(["001234"]);
    expect(book.quizzes.map((q) => q.id)).toEqual([s.quiz.id]);
    expect((await getGradebook({ ...filters, from: "2030-01-02", to: "2030-01-02" }, { now: at(2) })).quizzes).toHaveLength(0);
    expect((await getGradebook({ ...filters, subjectIds: ["missing"] }, { now: at(2) })).quizzes).toHaveLength(0);
  });

  it("historical attempts survive transfer; class is explicitly current; inactive hidden by default", async () => {
    const s = await setup();
    const id = await started(s);
    await saveAnswer(s.student.id, id, { quizQuestionId: s.qqs[0].id, answer: { optionId: "a" } }, at(1));
    await submitAttempt(s.student.id, s.quiz.id, id, at(2));
    const cls = await makeClass();
    await prisma.user.update({ where: { id: s.student.id }, data: { classId: cls.id, isActive: false } });
    expect((await getGradebook({ classIds: [s.cls.id] }, { now: at(3) })).students).toHaveLength(0);
    const book = await getGradebook({ classIds: [s.cls.id], includeHistory: true }, { now: at(3) });
    expect(book.students[0]).toMatchObject({ classId: cls.id, isActive: false });
    expect(book.groups[0].rows[0].cells[0]).toMatchObject({ state: "FINAL", score: 100 });
  });

  it("running retake and waiting replacement suppress previously final recap", async () => {
    const s = await setup({ maxAttempts: 2 });
    const id = await started(s);
    await saveAnswer(s.student.id, id, { quizQuestionId: s.qqs[0].id, answer: { optionId: "a" } }, at(1));
    await submitAttempt(s.student.id, s.quiz.id, id, at(2));
    const second = await started(s, at(3));
    let row = (await getGradebook({}, { now: at(4) })).groups[0].rows[0];
    expect(row.cells[0]).toMatchObject({ state: "IN_PROGRESS", score: null });
    expect(row.average).toBeNull();
    await prisma.quizAttempt.update({ where: { id: second }, data: { status: "SUBMITTED", replacementGrantedAt: at(5) } });
    row = (await getGradebook({}, { now: at(6) })).groups[0].rows[0];
    expect(row.cells[0]).toMatchObject({ state: "WAITING_REPLACEMENT", score: null });
  });

  it("remedial 60 then 90 caps at 75 and averages final quizzes equally, without KKM counts", async () => {
    const s = await setup({ scoringPolicy: "REMEDIAL", kkm: 75, maxAttempts: 2 }, [{ type: "ESSAY", points: 10 }]);
    for (const [points, time] of [["6", 0], ["9", 300]] as const) {
      const id = await started(s, at(time));
      await submitAttempt(s.student.id, s.quiz.id, id, at(time + 1));
      const answer = await prisma.attemptAnswer.findFirstOrThrow({ where: { attemptId: id } });
      await gradeEssay(s.teacher.id, answer.id, { points }, at(time + 2));
      if (!time) await releaseResults(s.teacher.id, s.quiz.id, at(100));
    }
    let row = (await getGradebook({}, { now: at(400) })).groups[0].rows[0];
    expect(row.cells[0]).toMatchObject({ primary: 60, highest: 90, score: 75, passed: true });
    expect(row).toMatchObject({ average: 75, counted: 1, passed: 1, failed: 0 });
    const other = await setup();
    await prisma.quiz.update({ where: { id: other.quiz.id }, data: { subjectId: s.chapter.subjectId, kkm: null } });
    await prisma.quizClass.create({ data: { quizId: other.quiz.id, classId: s.cls.id } });
    const next = await startAttempt(s.stu, other.quiz.id, at(500));
    if (!next.ok) throw new Error("start");
    await saveAnswer(s.student.id, next.attemptId, { quizQuestionId: other.qqs[0].id, answer: { optionId: "a" } }, at(501));
    await submitAttempt(s.student.id, other.quiz.id, next.attemptId, at(502));
    row = (await getGradebook({ classIds: [s.cls.id] }, { now: at(503) })).groups[0].rows[0];
    expect(row).toMatchObject({ average: 87.5, counted: 2, passed: 1, failed: 0 });
    await prisma.quiz.update({ where: { id: s.quiz.id }, data: { kkm: null } });
    row = (await getGradebook({ classIds: [s.cls.id] }, { now: at(503) })).groups[0].rows[0];
    expect(row).toMatchObject({ average: 95, counted: 2, passed: 0, failed: 0 });
  });

  it("WITA range includes both ends of day; unscheduled quiz uses publish date; drafts excluded", async () => {
    const first = await setup({ startsAt: new Date("2029-12-31T16:00:00Z") });
    const last = await setup({ startsAt: new Date("2030-01-01T15:59:59.999Z") });
    const after = await setup({ startsAt: new Date("2030-01-01T16:00:00Z") });
    const unscheduled = await setup();
    await setup({}, [{}], false);
    const book = await getGradebook({ from: "2030-01-01", to: "2030-01-01" }, { now: t0 });
    expect(book.quizzes.map((q) => q.id)).toEqual(expect.arrayContaining([first.quiz.id, last.quiz.id, unscheduled.quiz.id]));
    expect(book.quizzes).toHaveLength(3);
    expect(book.quizzes.some((q) => q.id === after.quiz.id)).toBe(false);
  });

  it("expiry is finalized before the snapshot and an unanswered essay stays pending", async () => {
    const s = await setup({}, [{ type: "ESSAY" }]);
    const id = await started(s);
    const book = await getGradebook({}, { now: at(32 * 60_000) });
    expect(book.groups[0].rows[0].cells[0]).toMatchObject({ state: "NEEDS_GRADING", score: null });
    expect(await prisma.quizAttempt.findUnique({ where: { id } })).toMatchObject({ status: "SUBMITTED", submitReason: "TIMEOUT" });
  });

  it("rejects 101 quizzes before finalizing attempts; excessive row selections fail before detail loading", async () => {
    const s = await setup();
    const id = await started(s);
    const data = Array.from({ length: 100 }, (_, i) => ({ subjectId: s.chapter.subjectId, createdById: s.teacher.id, title: `Bulk ${i}`, durationMinutes: 30, status: "PUBLISHED" as const, publishedAt: t0 }));
    await prisma.quiz.createMany({ data });
    await expect(getGradebook({}, { now: at(60 * 60_000) })).rejects.toMatchObject({ status: 422 });
    expect(await prisma.quizAttempt.findUnique({ where: { id } })).toMatchObject({ status: "IN_PROGRESS" });
    await prisma.quiz.deleteMany({ where: { title: "Bulk 99" } });
    await prisma.user.createMany({ data: Array.from({ length: 1000 }, (_, i) => ({ role: "STUDENT" as const, displayName: `Row ${i}`, loginName: `bulk-${i}`, classId: s.cls.id })) });
    await expect(getGradebook({}, { full: true, now: t0 })).rejects.toMatchObject({ status: 422 });
  });

  it("does not charge repeated short prompts as long-content rows for a 100-question, 100-student export", async () => {
    const s = await setup();
    const question = await prisma.question.findUniqueOrThrow({ where: { id: s.qqs[0].questionId } });
    const snapshot = { type: "SINGLE_CHOICE", prompt: "P".repeat(5000), options: question.options, labels: null, images: [] };
    const key = { answerKey: question.answerKey, explanation: "E".repeat(5000) };
    await prisma.quizQuestion.update({ where: { id: s.qqs[0].id }, data: { questionSnapshot: snapshot, answerKeySnapshot: key } });
    await prisma.question.createMany({ data: Array.from({ length: 99 }, (_, i) => ({ id: `volume-question-${i}`, chapterId: s.chapter.id, type: "SINGLE_CHOICE" as const, prompt: "P", options: question.options!, answerKey: question.answerKey!, defaultPoints: 1, difficulty: "EASY" as const, status: "ACTIVE" as const, createdById: s.teacher.id, updatedById: s.teacher.id })) });
    await prisma.quizQuestion.createMany({ data: Array.from({ length: 99 }, (_, i) => ({ quizId: s.quiz.id, questionId: `volume-question-${i}`, position: i + 2, points: 1, chapterSnapshot: s.chapter.title, questionSnapshot: snapshot, answerKeySnapshot: key })) });
    await prisma.user.createMany({ data: Array.from({ length: 99 }, (_, i) => ({ id: `volume-student-${i}`, role: "STUDENT" as const, displayName: `Volume ${i}`, loginName: `volume-${i}`, classId: s.cls.id })) });
    await prisma.quizAttempt.createMany({ data: [s.student.id, ...Array.from({ length: 99 }, (_, i) => `volume-student-${i}`)].map((studentId) => ({ quizId: s.quiz.id, studentId, attemptNumber: 1, slot: 1, status: "SUBMITTED" as const, gradingStatus: "FINAL" as const, maxPoints: 100, objectiveScore: 0, startedAt: t0, deadlineAt: at(30 * 60_000), submittedAt: at(1), questionOrder: [], optionOrder: {} })) });
    const book = await getGradebook({}, { full: true, now: at(2) });
    expect(book.questions).toHaveLength(100);
    expect(book.attempts).toHaveLength(100);
  });
});
