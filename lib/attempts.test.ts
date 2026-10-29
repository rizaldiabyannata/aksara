import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { unpublishQuiz } from "@/lib/quizzes";
import {
  GRACE_MS,
  finalizeExpiredAttempts,
  getAttemptView,
  gradeEssay,
  grantReplacement,
  listQuizAttempts,
  listStudentQuizzes,
  saveAnswer,
  startAttempt,
  submitAttempt,
} from "@/lib/attempts";
import { releaseResults } from "@/lib/results";
import { makeClass, makeStudent } from "../tests/factories";
import { DUR, at, attemptRow, min, setup, started, t0 } from "../tests/quiz-setup";

vi.mock("@/lib/storage", () => import("../tests/storage-fake").then((m) => m.storageMock()));


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

  it("submit at deadlineAt+10s is TIMEOUT, before deadlineAt is MANUAL", async () => {
    const s = await setup();
    const late = await started(s);
    expect(await submitAttempt(s.student.id, s.quiz.id, late, at(min(DUR) + 10_000))).toEqual({ ok: true, reason: "TIMEOUT" });
    expect(await attemptRow(late)).toMatchObject({ submitReason: "TIMEOUT", submittedAt: at(min(DUR) + 10_000) });
    const s2 = await setup();
    const early = await started(s2);
    expect(await submitAttempt(s2.student.id, s2.quiz.id, early, at(min(DUR) - 1000))).toEqual({ ok: true, reason: "MANUAL" });
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

const state = async (s: Awaited<ReturnType<typeof setup>>, now: Date) =>
  (await listStudentQuizzes(s.stu, now)).find((r) => r.quizId === s.quiz.id);

describe("grantReplacement", () => {
  it("maxAttempts=1: submit, grant, start gives slot 1 replacing the old one; limit after; chain; double grant", async () => {
    const s = await setup({ endsAt: at(min(100)) });
    const a1 = await started(s);
    await submitAttempt(s.student.id, s.quiz.id, a1, at(1000));
    expect(await grantReplacement(s.teacher.id, a1, "  Koneksi putus  ", at(2000))).toEqual({ ok: true });
    expect(await grantReplacement(s.teacher.id, a1, "Koneksi putus", at(2001))).toEqual({ ok: false, error: "ALREADY_REPLACED" });
    expect((await state(s, at(2500)))).toMatchObject({ state: "REPLACEMENT", remainingAttempts: 1 });
    const r = await startAttempt(s.stu, s.quiz.id, at(3000));
    const a2 = (r as { attemptId: string }).attemptId;
    expect(await attemptRow(a2)).toMatchObject({ slot: 1, replacesAttemptId: a1, deadlineAt: at(3000 + min(DUR)) });
    await submitAttempt(s.student.id, s.quiz.id, a2, at(4000));
    expect(await startAttempt(s.stu, s.quiz.id, at(5000))).toEqual({ ok: false, error: "ATTEMPT_LIMIT" });
    expect(await grantReplacement(s.teacher.id, a2, "Sekali lagi", at(6000))).toEqual({ ok: true });
    expect(await startAttempt(s.stu, s.quiz.id, at(7000))).toMatchObject({ ok: true });
    const audits = await prisma.auditLog.findMany({ where: { action: "ATTEMPT_REPLACEMENT_GRANTED", entityId: a1 } });
    expect(audits).toHaveLength(1);
    expect(audits[0].metadata).toEqual({ attemptId: a1, reason: "Koneksi putus" });
    expect(audits[0].entityType).toBe("QuizAttempt");
  });

  it("closes a live attempt without grading; later saves are ATTEMPT_CLOSED", async () => {
    const s = await setup();
    const a1 = await started(s);
    await saveAnswer(s.student.id, a1, { quizQuestionId: s.qqs[0].id, answer: { optionId: "a" } }, at(10));
    expect(await grantReplacement(s.teacher.id, a1, "Layar mati", at(20))).toEqual({ ok: true });
    const row = await attemptRow(a1);
    expect(row).toMatchObject({ status: "SUBMITTED", submitReason: "REPLACED", objectiveScore: null, replacementGrantedById: s.teacher.id, replacementReason: "Layar mati" });
    expect(await saveAnswer(s.student.id, a1, { quizQuestionId: s.qqs[0].id, answer: { optionId: "b" } }, at(30))).toEqual({ ok: false, error: "ATTEMPT_CLOSED" });
    expect((await prisma.attemptAnswer.findFirstOrThrow({ where: { attemptId: a1 } })).answer).toEqual({ optionId: "a" });
    expect(await submitAttempt(s.student.id, s.quiz.id, a1, at(40))).toMatchObject({ ok: true });
    expect((await attemptRow(a1)).objectiveScore).toBeNull();
  });

  it("grant racing submit leaves one consistent final state", async () => {
    const s = await setup();
    const a1 = await started(s);
    await Promise.all([
      grantReplacement(s.teacher.id, a1, "Bersamaan", at(10)),
      submitAttempt(s.student.id, s.quiz.id, a1, at(10)),
    ]);
    const row = await attemptRow(a1);
    expect(row.status).toBe("SUBMITTED");
    expect(row.replacementGrantedAt).not.toBeNull();
    if (row.submitReason === "REPLACED") expect(row.objectiveScore).toBeNull();
    else expect(row.submitReason).toBe("MANUAL");
  });

  it("REMEDIAL: replacement needs no release", async () => {
    const s = await setup({ scoringPolicy: "REMEDIAL", kkm: 70, maxAttempts: 2 });
    const a1 = await started(s);
    await submitAttempt(s.student.id, s.quiz.id, a1, at(1000));
    await grantReplacement(s.teacher.id, a1, "Gangguan", at(2000));
    expect(await startAttempt(s.stu, s.quiz.id, at(3000))).toMatchObject({ ok: true });
  });

  it("reason 'abc' or 301 chars: field error, nothing changes; 300 ok; unknown attempt NOT_FOUND", async () => {
    const s = await setup();
    const a1 = await started(s);
    const bad = { ok: false, error: "INVALID", fieldErrors: { reason: "Alasan wajib diisi, 5 sampai 300 huruf." } };
    expect(await grantReplacement(s.teacher.id, a1, "abc", at(1))).toEqual(bad);
    expect(await grantReplacement(s.teacher.id, a1, "x".repeat(301), at(1))).toEqual(bad);
    expect(await grantReplacement(s.teacher.id, a1, 5, at(1))).toEqual(bad);
    expect((await attemptRow(a1)).replacementGrantedAt).toBeNull();
    expect(await prisma.auditLog.count({ where: { action: "ATTEMPT_REPLACEMENT_GRANTED" } })).toBe(0);
    expect(await grantReplacement(s.teacher.id, "nope", "alasan ok", at(1))).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(await grantReplacement(s.teacher.id, a1, "x".repeat(300), at(1))).toEqual({ ok: true });
  });
});

describe("listStudentQuizzes", () => {
  it("each state, other class hidden, no leak", async () => {
    const s = await setup({ startsAt: at(min(10)), maxAttempts: 2 });
    // publish needs startsAt in the future of publish time (t0); checks below use later times.
    expect(await state(s, t0)).toMatchObject({ state: "SCHEDULED", hasAttempts: false, remainingAttempts: 2, questionCount: 1 });
    expect(await state(s, at(min(11)))).toMatchObject({ state: "AVAILABLE" });
    const a1 = await started(s, at(min(11)));
    expect(await state(s, at(min(12)))).toMatchObject({ state: "IN_PROGRESS", hasAttempts: true });
    await submitAttempt(s.student.id, s.quiz.id, a1, at(min(13)));
    expect(await state(s, at(min(14)))).toMatchObject({ state: "AVAILABLE", remainingAttempts: 1 });
    const a2 = await started(s, at(min(15)));
    await submitAttempt(s.student.id, s.quiz.id, a2, at(min(16)));
    expect(await state(s, at(min(17)))).toMatchObject({ state: "DONE", remainingAttempts: 0 });
    await grantReplacement(s.teacher.id, a2, "Ulang saja", at(min(18)));
    expect(await state(s, at(min(19)))).toMatchObject({ state: "REPLACEMENT", remainingAttempts: 1 });
    const closed = await setup({ endsAt: at(min(20)) });
    expect(await state(closed, at(min(21)))).toMatchObject({ state: "CLOSED" });

    const other = await setup();
    const rows = await listStudentQuizzes(s.stu, at(min(1)));
    expect(rows.map((r) => r.quizId)).not.toContain(other.quiz.id);
    const json = JSON.stringify(rows);
    for (const bad of [s.cls.code, "points", "score", "Ulang saja", "replacementReason"]) expect(json).not.toContain(bad);
  });

  it("deadlineAt only for own running attempt; payload has no other student or secrets", async () => {
    const s = await setup({}, [{ type: "ESSAY" }]);
    const other = await makeStudent(s.cls.id, { displayName: "TEMAN-RAHASIA", nis: "777777" });
    await startAttempt({ id: other.id, classId: s.cls.id }, s.quiz.id, at(0));
    expect((await listStudentQuizzes(s.stu, at(1)))[0].deadlineAt).toBeNull();
    await started(s, at(2));
    const rows = await listStudentQuizzes(s.stu, at(3));
    expect(rows[0].deadlineAt).toEqual(at(2 + min(DUR)));
    const json = JSON.stringify(rows);
    for (const secret of ["TEMAN-RAHASIA", "777777", "RUBRIK-RAHASIA", "PEMBAHASAN-RAHASIA", "answerKey", "score"])
      expect(json).not.toContain(secret);
    expect(await listStudentQuizzes({ id: s.student.id, classId: null }, at(4))).toEqual([]);
  });

  it("REMEDIAL unreleased with a used attempt is DONE; finalizes expired first", async () => {
    const s = await setup({ scoringPolicy: "REMEDIAL", kkm: 70, maxAttempts: 2 });
    await started(s);
    expect(await state(s, at(min(DUR) + GRACE_MS))).toMatchObject({ state: "DONE", remainingAttempts: 1 });
    expect((await prisma.quizAttempt.findFirstOrThrow({ where: { quizId: s.quiz.id } })).status).toBe("SUBMITTED");
  });
});

describe("listStudentQuizzes replacement edge cases", () => {
  it("replaced attempt does not count: maxAttempts=2 shows 2 remaining", async () => {
    const s = await setup({ maxAttempts: 2 });
    const a1 = await started(s);
    await grantReplacement(s.teacher.id, a1, "Alasan sah", at(1000));
    expect(await state(s, at(2000))).toMatchObject({ state: "REPLACEMENT", remainingAttempts: 2 });
  });

  it("pending replacement past endsAt is CLOSED", async () => {
    const s = await setup({ endsAt: at(min(20)) });
    const a1 = await started(s);
    await submitAttempt(s.student.id, s.quiz.id, a1, at(1000));
    await grantReplacement(s.teacher.id, a1, "Alasan sah", at(2000));
    expect(await state(s, at(min(21)))).toMatchObject({ state: "CLOSED" });
  });
});

describe("listQuizAttempts", () => {
  it("finalizes expired attempts and flags replaced ones", async () => {
    const s = await setup({ maxAttempts: 2 });
    const a1 = await started(s);
    const rows = await listQuizAttempts(s.quiz.id, at(min(DUR) + GRACE_MS));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ attemptId: a1, studentName: s.student.displayName, className: s.cls.name, attemptNumber: 1, slot: 1, status: "SUBMITTED", submitReason: "TIMEOUT", replaced: false });
    await grantReplacement(s.teacher.id, a1, "Alasan sah", at(min(DUR) + GRACE_MS));
    expect((await listQuizAttempts(s.quiz.id))[0].replaced).toBe(true);
  });
});

const essayRow = (attemptId: string, quizQuestionId: string) =>
  prisma.attemptAnswer.findUniqueOrThrow({ where: { attemptId_quizQuestionId: { attemptId, quizQuestionId } } });

describe("essay grading", () => {
  const graded = async () => {
    const s = await setup({}, [{}, { type: "ESSAY", points: 4 }]);
    const id = await started(s);
    await submitAttempt(s.student.id, s.quiz.id, id, at(1000));
    return { s, id, ans: await essayRow(id, s.qqs[1].id) };
  };

  it("submit adds a blank row for an unanswered essay only; attempt is pending", async () => {
    const { s, id, ans } = await graded();
    expect(ans.answer).toBeNull();
    expect(await prisma.attemptAnswer.count({ where: { attemptId: id } })).toBe(1);
    expect((await attemptRow(id)).gradingStatus).toBe("PENDING_MANUAL_GRADING");
    expect((await listQuizAttempts(s.quiz.id, at(2000)))[0]).toMatchObject({ score: 0, pendingEssays: 1 });
  });

  it("validates points 0..max with up to 2 decimals", async () => {
    const { s, id, ans } = await graded();
    for (const points of ["2,555", "-1", "4,01", "abc", "", "1e2"]) {
      expect(await gradeEssay(s.teacher.id, ans.id, { points }, at(2000))).toMatchObject({ error: "INVALID" });
    }
    expect((await attemptRow(id)).gradingStatus).toBe("PENDING_MANUAL_GRADING");
    expect(await gradeEssay(s.teacher.id, ans.id, { points: "2,5", feedback: "UMPAN-BALIK" }, at(2000))).toEqual({ ok: true });
    const row = await essayRow(id, s.qqs[1].id);
    expect([row.manualPoints?.toNumber(), row.teacherFeedback, row.gradedById]).toEqual([2.5, "UMPAN-BALIK", s.teacher.id]);
    expect((await attemptRow(id)).gradingStatus).toBe("FINAL");
    expect((await listQuizAttempts(s.quiz.id, at(3000)))[0]).toMatchObject({ score: 50, pendingEssays: 0 });
  });

  it("audits each change once, without the feedback; stays FINAL", async () => {
    const { s, id, ans } = await graded();
    await gradeEssay(s.teacher.id, ans.id, { points: "0" }, at(2000));
    await gradeEssay(s.teacher.id, ans.id, { points: "4", feedback: "UMPAN-BALIK" }, at(3000));
    await gradeEssay(s.teacher.id, ans.id, { points: "4.00", feedback: "lain" }, at(4000));
    const logs = await prisma.auditLog.findMany({ where: { action: "MANUAL_SCORE_SET" }, orderBy: { createdAt: "asc" } });
    expect(logs.map((l) => l.metadata)).toEqual([
      { attemptId: id, quizQuestionId: s.qqs[1].id, from: null, to: 0 },
      { attemptId: id, quizQuestionId: s.qqs[1].id, from: 0, to: 4 },
    ]);
    expect(JSON.stringify(logs)).not.toContain("UMPAN-BALIK");
    expect((await attemptRow(id)).gradingStatus).toBe("FINAL");
  });

  it("not gradable: running attempt, objective row, replaced attempt; unknown id NOT_FOUND", async () => {
    const s = await setup({ maxAttempts: 2 }, [{}, { type: "ESSAY" }]);
    const id = await started(s);
    await saveAnswer(s.student.id, id, { quizQuestionId: s.qqs[1].id, answer: { text: "jawab" } }, at(10));
    await saveAnswer(s.student.id, id, { quizQuestionId: s.qqs[0].id, answer: { optionId: "a" } }, at(10));
    const essay = await essayRow(id, s.qqs[1].id);
    const objective = await essayRow(id, s.qqs[0].id);
    const no = { ok: false, error: "NOT_GRADABLE" };
    expect(await gradeEssay(s.teacher.id, essay.id, { points: "1" })).toEqual(no);
    await submitAttempt(s.student.id, s.quiz.id, id, at(20));
    expect(await gradeEssay(s.teacher.id, objective.id, { points: "1" })).toEqual(no);
    await grantReplacement(s.teacher.id, id, "Gangguan jaringan", at(30));
    expect(await gradeEssay(s.teacher.id, essay.id, { points: "1" })).toEqual(no);
    expect(await gradeEssay(s.teacher.id, "nope", { points: "1" })).toEqual({ ok: false, error: "NOT_FOUND" });
  });

  it("two essays graded at once still end FINAL", async () => {
    const s = await setup({}, [{ type: "ESSAY" }, { type: "ESSAY" }]);
    const id = await started(s);
    await submitAttempt(s.student.id, s.quiz.id, id, at(1000));
    const [a, b] = await Promise.all(s.qqs.map((q) => essayRow(id, q.id)));
    await Promise.all([gradeEssay(s.teacher.id, a.id, { points: "1" }), gradeEssay(s.teacher.id, b.id, { points: "1" })]);
    expect((await attemptRow(id)).gradingStatus).toBe("FINAL");
  });
});

describe("retakes after release", () => {
  it("HIGHEST: no new attempt once results are released", async () => {
    const s = await setup({ maxAttempts: 3 });
    await submitAttempt(s.student.id, s.quiz.id, await started(s), at(1000));
    expect(await releaseResults(s.teacher.id, s.quiz.id, at(2000))).toEqual({ ok: true });
    expect(await startAttempt(s.stu, s.quiz.id, at(3000))).toEqual({ ok: false, error: "RESULTS_RELEASED" });
    expect((await listStudentQuizzes(s.stu, at(3000)))[0]).toMatchObject({ state: "DONE", resultsReleased: true });
  });

  it("REMEDIAL: opens below KKM after release, closes once a remedial reaches it", async () => {
    const s = await setup({ scoringPolicy: "REMEDIAL", kkm: 70, maxAttempts: 3 });
    await submitAttempt(s.student.id, s.quiz.id, await started(s), at(1000)); // unanswered: 0
    await releaseResults(s.teacher.id, s.quiz.id, at(2000));
    expect((await listStudentQuizzes(s.stu, at(2500)))[0]).toMatchObject({ state: "AVAILABLE" });
    const r1 = await started(s, at(3000));
    await saveAnswer(s.student.id, r1, { quizQuestionId: s.qqs[0].id, answer: { optionId: "a" } }, at(3100));
    await submitAttempt(s.student.id, s.quiz.id, r1, at(3200)); // 100
    expect(await startAttempt(s.stu, s.quiz.id, at(4000))).toEqual({ ok: false, error: "REMEDIAL_NOT_AVAILABLE" });
  });

  it("REMEDIAL: primary at or above KKM never opens a remedial", async () => {
    const s = await setup({ scoringPolicy: "REMEDIAL", kkm: 70, maxAttempts: 2 });
    const id = await started(s);
    await saveAnswer(s.student.id, id, { quizQuestionId: s.qqs[0].id, answer: { optionId: "a" } }, at(100));
    await submitAttempt(s.student.id, s.quiz.id, id, at(1000));
    await releaseResults(s.teacher.id, s.quiz.id, at(2000));
    expect(await startAttempt(s.stu, s.quiz.id, at(3000))).toEqual({ ok: false, error: "REMEDIAL_NOT_AVAILABLE" });
  });

  it("no replacement while results are released", async () => {
    const s = await setup({ maxAttempts: 2 });
    const id = await started(s);
    await submitAttempt(s.student.id, s.quiz.id, id, at(1000));
    await releaseResults(s.teacher.id, s.quiz.id, at(2000));
    expect(await grantReplacement(s.teacher.id, id, "Gangguan jaringan", at(3000))).toEqual({ ok: false, error: "RESULTS_RELEASED" });
    expect((await attemptRow(id)).replacementGrantedAt).toBeNull();
  });
});
