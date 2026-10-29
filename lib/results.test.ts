import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { GRACE_MS, gradeEssay, grantReplacement, saveAnswer, submitAttempt } from "@/lib/attempts";
import { getQuizRecap, getStudentResult, releaseResults, unreleaseResults } from "@/lib/results";
import { makeStudent } from "../tests/factories";
import { setStudentActive } from "@/lib/students";
import { at, DUR, min, setup, started } from "../tests/quiz-setup";

vi.mock("@/lib/storage", () => import("../tests/storage-fake").then((m) => m.storageMock()));

const essayId = (attemptId: string) =>
  prisma.attemptAnswer.findFirstOrThrow({ where: { attemptId, objectivePoints: null }, select: { id: true } }).then((a) => a.id);

/** Student answers the essay, submits, and the teacher grades it. */
async function essayAttempt(s: Awaited<ReturnType<typeof setup>>, points: string, now: number) {
  const id = await started(s, at(now));
  await saveAnswer(s.student.id, id, { quizQuestionId: s.qqs[0].id, answer: { text: "jawabanku" } }, at(now + 1));
  await submitAttempt(s.student.id, s.quiz.id, id, at(now + 2));
  expect(await gradeEssay(s.teacher.id, await essayId(id), { points, feedback: "UMPAN-BALIK" }, at(now + 3))).toEqual({ ok: true });
  return id;
}

describe("releaseResults", () => {
  it("refuses with counts while someone is working, an essay is ungraded, or a replacement is unstarted", async () => {
    const s = await setup({ maxAttempts: 2 }, [{ type: "ESSAY" }]);
    const a1 = await started(s);
    await submitAttempt(s.student.id, s.quiz.id, a1, at(10));
    const b = await makeStudent(s.cls.id);
    await started({ ...s, stu: { id: b.id, classId: s.cls.id } }, at(20));
    const c = await makeStudent(s.cls.id);
    const c1 = await started({ ...s, stu: { id: c.id, classId: s.cls.id } }, at(20));
    await grantReplacement(s.teacher.id, c1, "Gangguan jaringan", at(30));
    expect(await releaseResults(s.teacher.id, s.quiz.id, at(40))).toEqual({
      ok: false, error: "INVALID",
      fieldErrors: { form: "Hasil belum bisa dirilis: 1 siswa masih mengerjakan, 1 uraian belum dinilai, 1 percobaan pengganti belum dikerjakan." },
    });
    expect((await prisma.quiz.findUniqueOrThrow({ where: { id: s.quiz.id } })).resultsReleasedAt).toBeNull();
  });

  it("stores who and when; a double release writes one audit; unrelease hides again", async () => {
    const s = await setup();
    await submitAttempt(s.student.id, s.quiz.id, await started(s), at(10));
    const [r1, r2] = await Promise.all([releaseResults(s.teacher.id, s.quiz.id, at(20)), releaseResults(s.teacher.id, s.quiz.id, at(20))]);
    expect([r1, r2]).toEqual([{ ok: true }, { ok: true }]);
    expect(await prisma.quiz.findUniqueOrThrow({ where: { id: s.quiz.id } })).toMatchObject({ resultsReleasedAt: at(20), resultsReleasedById: s.teacher.id });
    expect(await prisma.auditLog.count({ where: { action: "RESULTS_RELEASED" } })).toBe(1);
    expect(await getStudentResult(s.student.id, s.quiz.id, at(30))).not.toBeNull();

    expect(await unreleaseResults(s.teacher.id, s.quiz.id)).toEqual({ ok: true });
    expect(await prisma.quiz.findUniqueOrThrow({ where: { id: s.quiz.id } })).toMatchObject({ resultsReleasedAt: null, resultsReleasedById: null });
    expect(await prisma.auditLog.count({ where: { action: "RESULTS_UNRELEASED" } })).toBe(1);
    expect(await getStudentResult(s.student.id, s.quiz.id, at(40))).toBeNull();
    expect(await releaseResults(s.teacher.id, "nope")).toEqual({ ok: false, error: "NOT_FOUND" });
  });
});

describe("getStudentResult", () => {
  it("null before release and for another student", async () => {
    const s = await setup();
    await submitAttempt(s.student.id, s.quiz.id, await started(s), at(10));
    expect(await getStudentResult(s.student.id, s.quiz.id, at(20))).toBeNull();
    await releaseResults(s.teacher.id, s.quiz.id, at(30));
    const other = await makeStudent(s.cls.id);
    expect(await getStudentResult(other.id, s.quiz.id, at(40))).toBeNull();
  });

  it("unknown quiz and unreleased quiz are indistinguishable", async () => {
    const s = await setup({}, [{}]);
    await submitAttempt(s.student.id, s.quiz.id, await started(s), at(10));
    expect(await getStudentResult(s.student.id, s.quiz.id, at(20))).toBeNull();
    expect(await getStudentResult(s.student.id, "tidak-ada", at(20))).toBeNull();
  });

  it("switch off: score and own answers, no key, explanation, or feedback; rubric never", async () => {
    const s = await setup({ showFeedbackAfterRelease: false }, [{}, { type: "ESSAY", points: 2 }]);
    const id = await started(s);
    await saveAnswer(s.student.id, id, { quizQuestionId: s.qqs[0].id, answer: { optionId: "a" } }, at(1));
    await submitAttempt(s.student.id, s.quiz.id, id, at(2));
    await gradeEssay(s.teacher.id, await essayId(id), { points: "1", feedback: "UMPAN-BALIK" }, at(3));
    await releaseResults(s.teacher.id, s.quiz.id, at(4));
    const r = await getStudentResult(s.student.id, s.quiz.id, at(5));
    expect(r).toMatchObject({ recap: 66.67, showKey: false, attempts: [{ label: "Percobaan 1", final: true, score: 66.67 }] });
    expect(r?.attempts[0].answers.map((a) => [a.earned, a.correct])).toEqual([[1, true], [1, null]]);
    const json = JSON.stringify(r);
    for (const bad of ["answerKey", "PEMBAHASAN-RAHASIA", "UMPAN-BALIK", "RUBRIK-RAHASIA"]) expect(json).not.toContain(bad);

    await prisma.quiz.update({ where: { id: s.quiz.id }, data: { showFeedbackAfterRelease: true } });
    const on = JSON.stringify(await getStudentResult(s.student.id, s.quiz.id, at(6)));
    for (const ok of ["answerKey", "PEMBAHASAN-RAHASIA", "UMPAN-BALIK"]) expect(on).toContain(ok);
    expect(on).not.toContain("RUBRIK-RAHASIA");
  });

  it("REMEDIAL KKM 75: key held while a remedial is open; 60 then 90 → recap 75, Tuntas", async () => {
    const s = await setup({ scoringPolicy: "REMEDIAL", kkm: 75, maxAttempts: 2 }, [{ type: "ESSAY", points: 10 }]);
    await essayAttempt(s, "6", 0);
    await releaseResults(s.teacher.id, s.quiz.id, at(100));
    const open = await getStudentResult(s.student.id, s.quiz.id, at(200));
    expect(open).toMatchObject({ showKey: false, recap: 60, passed: false });
    expect(JSON.stringify(open)).not.toContain("PEMBAHASAN-RAHASIA");

    await essayAttempt(s, "9", 300);
    const done = await getStudentResult(s.student.id, s.quiz.id, at(400));
    expect(done).toMatchObject({
      showKey: true, recap: 75, passed: true,
      attempts: [{ label: "Percobaan utama", score: 60 }, { label: "Remedial 1", score: 90 }],
    });
    const recap = await getQuizRecap(s.quiz.id, at(400));
    expect(recap?.rows[0]).toMatchObject({
      attemptsUsed: 2, earnedPoints: 9, maxPoints: 10, status: "Final",
      recap: { primary: 60, highest: 90, recap: 75, passed: true, final: true },
    });
  });
});

describe("getQuizRecap", () => {
  it("lists not-started students and pending essays", async () => {
    const s = await setup({}, [{ type: "ESSAY" }]);
    await submitAttempt(s.student.id, s.quiz.id, await started(s), at(10));
    const idle = await makeStudent(s.cls.id);
    const rows = (await getQuizRecap(s.quiz.id, at(20)))?.rows ?? [];
    const by = new Map(rows.map((r) => [r.studentId, r]));
    expect(by.get(idle.id)).toMatchObject({ status: "Belum mulai", attemptsUsed: 0 });
    expect(by.get(s.student.id)).toMatchObject({ status: "Belum final – 1 uraian belum dinilai", recap: { final: false } });
    expect(await getQuizRecap("nope")).toBeNull();
  });
});

describe("getQuizRecap monitoring fields", () => {
  it("not started, running with answered count, expired is not running", async () => {
    const s = await setup({}, [{}, {}]);
    const idle = await makeStudent(s.cls.id);
    const id = await started(s, at(0));
    await saveAnswer(s.student.id, id, { quizQuestionId: s.qqs[0].id, answer: { optionId: "a" } }, at(1));
    const by = async (t: number) => new Map(((await getQuizRecap(s.quiz.id, at(t)))?.rows ?? []).map((r) => [r.studentId, r]));
    const now = await by(min(5));
    expect(now.get(idle.id)).toMatchObject({ state: "NOT_STARTED", running: null, attempts: [] });
    expect(now.get(s.student.id)).toMatchObject({ state: "IN_PROGRESS", running: { answered: 1, total: 2 } });
    const later = await by(min(DUR) + GRACE_MS + 1);
    expect(later.get(s.student.id)).toMatchObject({ state: "FINAL", running: null });
    expect(later.get(s.student.id)?.attempts).toHaveLength(1);
  });

  it("NEEDS_GRADING with an ungraded essay; kkm null gives passed null; quiz carries maxAttempts and classes", async () => {
    const s = await setup({ kkm: null }, [{ type: "ESSAY" }]);
    const id = await started(s, at(0));
    await submitAttempt(s.student.id, s.quiz.id, id, at(10));
    const r = await getQuizRecap(s.quiz.id, at(20));
    expect(r?.quiz).toMatchObject({ maxAttempts: 1, classes: [{ id: s.cls.id, name: s.cls.name }] });
    const row = r?.rows.find((x) => x.studentId === s.student.id);
    expect(row).toMatchObject({ state: "NEEDS_GRADING", recap: { passed: null }, status: "Belum final – 1 uraian belum dinilai" });
    expect(row?.attempts[0]).toMatchObject({ attemptId: id, pendingEssays: 1, score: 0, replaced: false });
  });

  it("inactive student with an attempt is still listed", async () => {
    const s = await setup();
    await submitAttempt(s.student.id, s.quiz.id, await started(s, at(0)), at(10));
    expect(await setStudentActive(s.teacher.id, s.student.id, false)).toEqual({ ok: true });
    const row = (await getQuizRecap(s.quiz.id, at(20)))?.rows.find((x) => x.studentId === s.student.id);
    expect(row).toMatchObject({ state: "FINAL" });
    expect(row?.attempts[0].score).toBe(0);
  });
});
