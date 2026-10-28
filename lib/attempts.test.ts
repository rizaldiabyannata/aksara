import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { publishQuiz, unpublishQuiz } from "@/lib/quizzes";
import {
  GRACE_MS,
  finalizeExpiredAttempts,
  getAttemptView,
  saveAnswer,
  startAttempt,
  submitAttempt,
} from "@/lib/attempts";
import { makeChapter, makeClass, makeQuestion, makeQuiz, makeQuizQuestion, makeStudent, makeTeacher } from "../tests/factories";

vi.mock("@/lib/storage", () => import("../tests/storage-fake").then((m) => m.storageMock()));

const t0 = new Date("2030-01-01T00:00:00.000Z");
const min = (m: number) => m * 60_000;
const at = (ms: number) => new Date(t0.getTime() + ms);
const DUR = 30;

type QOpts = { type?: "SINGLE_CHOICE" | "ESSAY" | "MULTIPLE_SELECT"; points?: number };

async function setup(
  quizOver: Record<string, unknown> = {},
  questions: QOpts[] = [{}],
  publish = true,
) {
  const { user } = await makeTeacher();
  const chapter = await makeChapter();
  const cls = await makeClass();
  const quiz = await makeQuiz(chapter.subjectId, user.id, { durationMinutes: DUR, ...quizOver });
  await prisma.quizClass.create({ data: { quizId: quiz.id, classId: cls.id } });
  const qqs = [];
  for (const [i, o] of questions.entries()) {
    const base =
      o.type === "ESSAY"
        ? { type: "ESSAY" as const, answerKey: { rubric: "RUBRIK-RAHASIA" } }
        : o.type === "MULTIPLE_SELECT"
          ? {
              type: "MULTIPLE_SELECT" as const,
              options: [{ id: "a", text: "A" }, { id: "b", text: "B" }, { id: "c", text: "C" }],
              answerKey: { optionIds: ["a", "b"] },
            }
          : { answerKey: { optionId: "a" } };
    const q = await makeQuestion(chapter.id, user.id, {
      status: "ACTIVE", prompt: `Soal ${i + 1}`, explanation: "PEMBAHASAN-RAHASIA", ...(base as object),
    } as never);
    qqs.push(await makeQuizQuestion(quiz.id, q.id, { position: i + 1, points: o.points ?? 1 }));
  }
  const student = await makeStudent(cls.id);
  if (publish) expect(await publishQuiz(user.id, quiz.id, t0)).toEqual({ ok: true });
  return { teacher: user, chapter, cls, quiz, qqs, student, stu: { id: student.id, classId: cls.id } };
}

const started = async (s: Awaited<ReturnType<typeof setup>>, now = t0) => {
  const r = await startAttempt(s.stu, s.quiz.id, now);
  if (!r.ok) throw new Error("start failed " + r.error);
  return r.attemptId;
};
const attemptRow = (id: string) => prisma.quizAttempt.findUniqueOrThrow({ where: { id } });

describe("startAttempt", () => {
  it("deadline = start + duration; endsAt earlier wins", async () => {
    const s = await setup();
    const id = await started(s);
    expect((await attemptRow(id)).deadlineAt).toEqual(at(min(DUR)));
    const s2 = await setup({ endsAt: at(min(10)) });
    const id2 = await started(s2);
    expect((await attemptRow(id2)).deadlineAt).toEqual(at(min(10)));
  });

  it("two concurrent starts give the same attempt, one row", async () => {
    const s = await setup();
    const [a, b] = await Promise.all([startAttempt(s.stu, s.quiz.id, t0), startAttempt(s.stu, s.quiz.id, t0)]);
    expect(a).toMatchObject({ ok: true });
    expect(a).toEqual(b);
    expect(await prisma.quizAttempt.count({ where: { quizId: s.quiz.id } })).toBe(1);
  });

  it("start again returns the running attempt", async () => {
    const s = await setup({ maxAttempts: 2 });
    expect(await started(s)).toBe(await started(s, at(1000)));
  });

  it("limit: second start after submit with maxAttempts=1 is ATTEMPT_LIMIT", async () => {
    const s = await setup();
    const id = await started(s);
    await submitAttempt(s.student.id, s.quiz.id, id, at(1000));
    expect(await startAttempt(s.stu, s.quiz.id, at(2000))).toEqual({ ok: false, error: "ATTEMPT_LIMIT" });
  });

  it("a timed-out attempt counts toward the limit", async () => {
    const s = await setup();
    await started(s);
    const r = await startAttempt(s.stu, s.quiz.id, at(min(DUR) + GRACE_MS + 1000));
    expect(r).toEqual({ ok: false, error: "ATTEMPT_LIMIT" });
  });

  it("other class, draft, before startsAt, after endsAt: NOT_FOUND", async () => {
    const s = await setup();
    const other = await makeStudent((await makeClass()).id);
    expect(await startAttempt({ id: other.id, classId: other.classId }, s.quiz.id, t0)).toEqual({ ok: false, error: "NOT_FOUND" });
    const d = await setup({}, [{}], false);
    expect(await startAttempt(d.stu, d.quiz.id, t0)).toEqual({ ok: false, error: "NOT_FOUND" });
    const f = await setup({ startsAt: at(min(5)) });
    expect(await startAttempt(f.stu, f.quiz.id, t0)).toEqual({ ok: false, error: "NOT_FOUND" });
    const e = await setup({ endsAt: at(min(60)) });
    expect(await startAttempt(e.stu, e.quiz.id, at(min(60)))).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(await startAttempt(s.stu, "nope", t0)).toEqual({ ok: false, error: "NOT_FOUND" });
  });

  it("REMEDIAL after attempt 1 and unreleased: REMEDIAL_NOT_AVAILABLE; HIGHEST allowed", async () => {
    const r = await setup({ scoringPolicy: "REMEDIAL", kkm: 70, maxAttempts: 2 });
    const id = await started(r);
    await submitAttempt(r.student.id, r.quiz.id, id, at(1000));
    expect(await startAttempt(r.stu, r.quiz.id, at(2000))).toEqual({ ok: false, error: "REMEDIAL_NOT_AVAILABLE" });
    const h = await setup({ maxAttempts: 2 });
    await submitAttempt(h.student.id, h.quiz.id, await started(h), at(1000));
    expect(await startAttempt(h.stu, h.quiz.id, at(2000))).toMatchObject({ ok: true });
    expect(await prisma.quizAttempt.count({ where: { quizId: h.quiz.id } })).toBe(2);
  });

  it("start vs unpublish never leaves an attempt on a draft quiz", async () => {
    for (let i = 0; i < 10; i++) {
      const s = await setup();
      await Promise.all([startAttempt(s.stu, s.quiz.id, t0), unpublishQuiz(s.teacher.id, s.quiz.id)]);
      const quiz = await prisma.quiz.findUniqueOrThrow({ where: { id: s.quiz.id } });
      const n = await prisma.quizAttempt.count({ where: { quizId: s.quiz.id } });
      expect(n > 0 && quiz.status === "DRAFT").toBe(false);
    }
  });

  it("extending endsAt keeps the running deadline", async () => {
    const s = await setup({ endsAt: at(min(10)) });
    const id = await started(s);
    await prisma.quiz.update({ where: { id: s.quiz.id }, data: { endsAt: at(min(100)) } });
    expect((await attemptRow(id)).deadlineAt).toEqual(at(min(10)));
  });

  it("pending replacement is consumed, inherits slot, and does not count", async () => {
    const s = await setup();
    const old = await started(s);
    await prisma.quizAttempt.update({
      where: { id: old },
      data: { status: "SUBMITTED", submitReason: "REPLACED", submittedAt: t0, replacementGrantedAt: t0 },
    });
    const r = await startAttempt(s.stu, s.quiz.id, at(1000));
    expect(r).toMatchObject({ ok: true });
    const row = await attemptRow((r as { attemptId: string }).attemptId);
    expect(row).toMatchObject({ slot: 1, attemptNumber: 2, replacesAttemptId: old });
  });

  it("shuffle: questionOrder is a permutation, stable across views; off = position order", async () => {
    const s = await setup({ shuffleQuestions: true, shuffleOptions: true }, Array.from({ length: 8 }, () => ({})));
    const id = await started(s);
    const row = await attemptRow(id);
    expect([...(row.questionOrder as string[])].sort()).toEqual(s.qqs.map((q) => q.id).sort());
    const v1 = await getAttemptView(s.student.id, { attemptId: id }, at(1000));
    const v2 = await getAttemptView(s.student.id, { quizId: s.quiz.id }, at(2000));
    const ids = (v: unknown) => (v as { questions: { id: string }[] }).questions.map((q) => q.id);
    expect(ids(v1)).toEqual(row.questionOrder);
    expect(ids(v2)).toEqual(ids(v1));
    const p = await setup({}, [{}, {}, {}]);
    const pid = await started(p);
    expect((await attemptRow(pid)).questionOrder).toEqual(p.qqs.map((q) => q.id));
  });
});

describe("saveAnswer", () => {
  const a = { optionId: "a" };

  it("accepted at deadline+30s, rejected at +61s keeping the old answer", async () => {
    const s = await setup();
    const id = await started(s);
    const qq = s.qqs[0].id;
    expect(await saveAnswer(s.student.id, id, { quizQuestionId: qq, answer: a }, at(1000))).toMatchObject({ ok: true });
    expect(await saveAnswer(s.student.id, id, { quizQuestionId: qq, answer: { optionId: "b" } }, at(min(DUR) + 30_000))).toMatchObject({ ok: true });
    const s2 = await setup();
    const id2 = await started(s2);
    await saveAnswer(s2.student.id, id2, { quizQuestionId: s2.qqs[0].id, answer: a }, at(1000));
    const r = await saveAnswer(s2.student.id, id2, { quizQuestionId: s2.qqs[0].id, answer: { optionId: "b" } }, at(min(DUR) + 61_000));
    expect(r).toEqual({ ok: false, error: "DEADLINE_PASSED" });
    const row = await prisma.attemptAnswer.findFirstOrThrow({ where: { attemptId: id2 } });
    expect(row.answer).toEqual(a);
  });

  it("saved answers come back in the view; repeated upsert = one row", async () => {
    const s = await setup();
    const id = await started(s);
    for (let i = 0; i < 3; i++) await saveAnswer(s.student.id, id, { quizQuestionId: s.qqs[0].id, answer: a }, at(1000 + i));
    expect(await prisma.attemptAnswer.count({ where: { attemptId: id } })).toBe(1);
    const v = await getAttemptView(s.student.id, { quizId: s.quiz.id }, at(5000));
    expect(v).toMatchObject({ status: "IN_PROGRESS", questions: [{ answer: a }] });
  });

  it("empty answer stored as null on the same row", async () => {
    const s = await setup();
    const id = await started(s);
    await saveAnswer(s.student.id, id, { quizQuestionId: s.qqs[0].id, answer: a }, at(1000));
    expect(await saveAnswer(s.student.id, id, { quizQuestionId: s.qqs[0].id, answer: null }, at(2000))).toMatchObject({ ok: true });
    const rows = await prisma.attemptAnswer.findMany({ where: { attemptId: id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].answer).toBeNull();
  });

  it("forged input: other student, foreign question, bad shape, unknown option: nothing written", async () => {
    const s = await setup();
    const o = await setup();
    const id = await started(s);
    const qq = s.qqs[0].id;
    const intruder = o.student.id;
    expect(await saveAnswer(intruder, id, { quizQuestionId: qq, answer: a }, at(1000))).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(await saveAnswer(s.student.id, id, { quizQuestionId: o.qqs[0].id, answer: a }, at(1000))).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(await saveAnswer(s.student.id, id, { quizQuestionId: "x", answer: a }, at(1000))).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(await saveAnswer(s.student.id, id, { quizQuestionId: qq, answer: { optionId: "zzz" } }, at(1000))).toMatchObject({ ok: false, error: "INVALID" });
    expect(await saveAnswer(s.student.id, id, { quizQuestionId: qq, answer: { value: true } }, at(1000))).toMatchObject({ ok: false, error: "INVALID" });
    expect(await saveAnswer(s.student.id, id, "nonsense", at(1000))).toMatchObject({ ok: false, error: "INVALID" });
    expect(await saveAnswer(s.student.id, id, { quizQuestionId: 5, answer: a }, at(1000))).toMatchObject({ ok: false, error: "INVALID" });
    expect(await prisma.attemptAnswer.count()).toBe(0);
  });

  it("after submit: ATTEMPT_CLOSED", async () => {
    const s = await setup();
    const id = await started(s);
    await submitAttempt(s.student.id, s.quiz.id, id, at(1000));
    expect(await saveAnswer(s.student.id, id, { quizQuestionId: s.qqs[0].id, answer: a }, at(2000))).toEqual({ ok: false, error: "ATTEMPT_CLOSED" });
    expect(await prisma.attemptAnswer.count()).toBe(0);
  });
});

describe("submitAttempt / finalize", () => {
  it("submit 3x: one result, same reason and score", async () => {
    const s = await setup();
    const id = await started(s);
    await saveAnswer(s.student.id, id, { quizQuestionId: s.qqs[0].id, answer: { optionId: "a" } }, at(1000));
    const rs = [];
    for (let i = 0; i < 3; i++) rs.push(await submitAttempt(s.student.id, s.quiz.id, id, at(2000 + i * 1000)));
    expect(rs).toEqual([1, 2, 3].map(() => ({ ok: true, reason: "MANUAL" })));
    const row = await attemptRow(id);
    expect(row).toMatchObject({ status: "SUBMITTED", objectiveScore: 1, gradingStatus: "FINAL" });
    expect(row.submittedAt).toEqual(at(2000));
  });

  it("wrong owner or wrong quizId: NOT_FOUND", async () => {
    const s = await setup();
    const o = await setup();
    const id = await started(s);
    expect(await submitAttempt(o.student.id, s.quiz.id, id, t0)).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(await submitAttempt(s.student.id, o.quiz.id, id, t0)).toEqual({ ok: false, error: "NOT_FOUND" });
  });

  it("submit after grace: TIMEOUT with submittedAt = deadlineAt", async () => {
    const s = await setup();
    const id = await started(s);
    const r = await submitAttempt(s.student.id, s.quiz.id, id, at(min(DUR) + GRACE_MS));
    expect(r).toEqual({ ok: true, reason: "TIMEOUT" });
    expect((await attemptRow(id)).submittedAt).toEqual(at(min(DUR)));
  });

  it("submit vs finalize past grace: one consistent status", async () => {
    const s = await setup();
    const id = await started(s);
    const now = at(min(DUR) + GRACE_MS + 5000);
    const [r] = await Promise.all([
      submitAttempt(s.student.id, s.quiz.id, id, now),
      finalizeExpiredAttempts({ quizId: s.quiz.id }, now),
    ]);
    expect(r).toEqual({ ok: true, reason: "TIMEOUT" });
    expect(await attemptRow(id)).toMatchObject({ status: "SUBMITTED", submitReason: "TIMEOUT" });
  });

  it("view past deadline+grace is SUBMITTED (server time decides)", async () => {
    const s = await setup();
    const id = await started(s);
    const v = await getAttemptView(s.student.id, { attemptId: id }, at(min(DUR) + 61_000));
    expect(v).toEqual({ status: "SUBMITTED", attemptId: id, quizId: s.quiz.id, quizTitle: s.quiz.title });
    expect(await getAttemptView(s.student.id, { quizId: s.quiz.id }, at(min(DUR) + 61_000))).toBeNull();
    expect(await getAttemptView((await makeStudent(s.cls.id)).id, { attemptId: id }, t0)).toBeNull();
  });

  it("grading: correct, blank, multiple-select all-or-nothing", async () => {
    const s = await setup({}, [{ points: 2 }, { points: 3 }, { type: "MULTIPLE_SELECT", points: 4 }, { type: "MULTIPLE_SELECT", points: 5 }]);
    const id = await started(s);
    const [q1, , q3, q4] = s.qqs;
    await saveAnswer(s.student.id, id, { quizQuestionId: q1.id, answer: { optionId: "a" } }, at(1));
    await saveAnswer(s.student.id, id, { quizQuestionId: q3.id, answer: { optionIds: ["b", "a"] } }, at(2));
    await saveAnswer(s.student.id, id, { quizQuestionId: q4.id, answer: { optionIds: ["a"] } }, at(3));
    await submitAttempt(s.student.id, s.quiz.id, id, at(4));
    expect(await attemptRow(id)).toMatchObject({ objectiveScore: 6, maxPoints: 14, gradingStatus: "FINAL" });
  });

  it("quiz with an essay: PENDING_MANUAL_GRADING, essay points null", async () => {
    const s = await setup({}, [{}, { type: "ESSAY", points: 5 }]);
    const id = await started(s);
    await saveAnswer(s.student.id, id, { quizQuestionId: s.qqs[1].id, answer: { text: "uraian" } }, at(1));
    await submitAttempt(s.student.id, s.quiz.id, id, at(2));
    expect(await attemptRow(id)).toMatchObject({ gradingStatus: "PENDING_MANUAL_GRADING", objectiveScore: 0 });
    const ans = await prisma.attemptAnswer.findFirstOrThrow({ where: { quizQuestionId: s.qqs[1].id } });
    expect(ans.objectivePoints).toBeNull();
  });

  it("grading reads the snapshot, not the edited bank question", async () => {
    const s = await setup();
    const id = await started(s);
    await saveAnswer(s.student.id, id, { quizQuestionId: s.qqs[0].id, answer: { optionId: "a" } }, at(1));
    await prisma.question.update({ where: { id: s.qqs[0].questionId }, data: { answerKey: { optionId: "b" } } });
    await submitAttempt(s.student.id, s.quiz.id, id, at(2));
    expect((await attemptRow(id)).objectiveScore).toBe(1);
  });

  it("finalizeExpiredAttempts returns the count and is idempotent", async () => {
    const s = await setup();
    await started(s);
    const late = at(min(DUR) + GRACE_MS);
    expect(await finalizeExpiredAttempts({ studentId: s.student.id }, late)).toBe(1);
    expect(await finalizeExpiredAttempts({ studentId: s.student.id }, late)).toBe(0);
  });
});

describe("no leak to students", () => {
  it("view JSON holds no key, explanation, rubric, bank id, points or storageKey", async () => {
    const s = await setup({}, [{}, { type: "ESSAY" }]);
    const id = await started(s);
    const v = await getAttemptView(s.student.id, { attemptId: id }, at(1000));
    const json = JSON.stringify(v);
    expect(v).toMatchObject({ status: "IN_PROGRESS", serverNow: at(1000).toISOString(), deadlineAt: at(min(DUR)).toISOString() });
    for (const bad of ["PEMBAHASAN-RAHASIA", "RUBRIK-RAHASIA", s.qqs[0].questionId, '"points"', "storageKey", "answerKey", "maxPoints", "objective"]) {
      expect(json).not.toContain(bad);
    }
    expect((v as { questions: { number: number }[] }).questions.map((q) => q.number)).toEqual([1, 2]);
  });
});
