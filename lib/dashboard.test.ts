import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { GRACE_MS, gradeEssay, grantReplacement, submitAttempt } from "@/lib/attempts";
import { releaseResults } from "@/lib/results";
import { getTeacherDashboard } from "@/lib/dashboard";
import { makeMaterial, makeQuestion, makeStudent } from "../tests/factories";
import { at, DUR, min, setup, started } from "../tests/quiz-setup";

vi.mock("@/lib/storage", () => import("../tests/storage-fake").then((m) => m.storageMock()));

describe("getTeacherDashboard", () => {
  it("empty database → no tasks", async () => {
    expect((await getTeacherDashboard(at(0))).tasks).toEqual([]);
  });

  it("running attempt → RUNNING; past deadline + grace → not running but GRADE", async () => {
    const s = await setup({}, [{ type: "ESSAY" }]);
    await started(s);
    expect((await getTeacherDashboard(at(min(5)))).tasks).toEqual([
      { kind: "RUNNING", quizId: s.quiz.id, title: s.quiz.title, inProgress: 1 },
    ]);
    expect((await getTeacherDashboard(at(min(DUR) + GRACE_MS + 1))).tasks).toEqual([
      { kind: "GRADE", quizId: s.quiz.id, title: s.quiz.title, essays: 1 },
    ]);
  });

  it("RELEASE appears exactly when releaseResults would succeed", async () => {
    const s = await setup({}, [{}]);
    await submitAttempt(s.student.id, s.quiz.id, await started(s), at(10));
    const d = await getTeacherDashboard(at(20));
    expect(d.tasks).toEqual([{ kind: "RELEASE", quizId: s.quiz.id, title: s.quiz.title, students: 1 }]);
    expect(await releaseResults(s.teacher.id, s.quiz.id, at(30))).toEqual({ ok: true });
    expect((await getTeacherDashboard(at(40))).tasks).toEqual([]);
  });

  it("no RELEASE while an essay is ungraded or a replacement is unstarted", async () => {
    const e = await setup({}, [{ type: "ESSAY" }]);
    await submitAttempt(e.student.id, e.quiz.id, await started(e), at(10));
    expect((await getTeacherDashboard(at(20))).tasks).toEqual([
      { kind: "GRADE", quizId: e.quiz.id, title: e.quiz.title, essays: 1 },
    ]);

    const r = await setup({ maxAttempts: 2 }, [{}]);
    const a = await started(r);
    await submitAttempt(r.student.id, r.quiz.id, a, at(10));
    expect(await grantReplacement(r.teacher.id, a, "Gangguan jaringan", at(15))).toEqual({ ok: true });
    const tasks = (await getTeacherDashboard(at(20))).tasks.filter((t) => "quizId" in t && t.quizId === r.quiz.id);
    expect(tasks).toEqual([]);
    expect((await releaseResults(r.teacher.id, r.quiz.id, at(30))).ok).toBe(false);
  });

  it("replaced attempts' essays are not counted", async () => {
    const s = await setup({ maxAttempts: 2 }, [{ type: "ESSAY" }]);
    const a = await started(s);
    await submitAttempt(s.student.id, s.quiz.id, a, at(10));
    expect(await grantReplacement(s.teacher.id, a, "Gangguan jaringan", at(15))).toEqual({ ok: true });
    expect((await getTeacherDashboard(at(20))).tasks.some((t) => t.kind === "GRADE")).toBe(false);
  });

  it("draft quiz and quiz without attempts produce nothing", async () => {
    await setup({}, [{}], false);
    await setup({}, [{}]);
    expect((await getTeacherDashboard(at(20))).tasks).toEqual([]);
  });

  it("OTHER_DEVICE: distinct active students with STUDENT_SESSION_REPLACED in 7 days", async () => {
    const s = await setup({}, [{}], false);
    const b = await makeStudent(s.cls.id);
    const c = await makeStudent(s.cls.id, { isActive: false });
    const now = at(30 * 86400_000);
    const row = (id: string, daysAgo: number) =>
      prisma.auditLog.create({
        data: { actorUserId: id, action: "STUDENT_SESSION_REPLACED", entityType: "User", entityId: id, createdAt: new Date(now.getTime() - daysAgo * 86400_000) },
      });
    await row(s.student.id, 1);
    await row(s.student.id, 2);
    await row(b.id, 8);
    await row(c.id, 1);
    expect((await getTeacherDashboard(now)).tasks).toEqual([{ kind: "OTHER_DEVICE", students: 1 }]);
  });

  it("REVIEWED_MATERIALS counts REVIEWED only; counts block", async () => {
    const s = await setup({}, [{}], false);
    await makeStudent(s.cls.id, { isActive: false });
    for (const status of ["DRAFT", "REVIEWED", "PUBLISHED"] as const) {
      await makeMaterial(s.chapter.id, s.teacher.id, { status });
    }
    await makeQuestion(s.chapter.id, s.teacher.id, { status: "DRAFT" });
    const d = await getTeacherDashboard(at(0));
    expect(d.tasks).toEqual([{ kind: "REVIEWED_MATERIALS", count: 1 }]);
    // setup's own question is ACTIVE; the extra DRAFT one is not counted
    expect(d.counts).toEqual({ materialsPublished: 1, questionsActive: 1, activeStudents: 1 });
  });
  it("GRADE still counts after release (remedial retake), RELEASE does not", async () => {
    const s = await setup({ maxAttempts: 2, scoringPolicy: "REMEDIAL", kkm: 70 }, [{ type: "ESSAY" }]);
    const a1 = await started(s);
    await submitAttempt(s.student.id, s.quiz.id, a1, at(10));
    const ans = await prisma.attemptAnswer.findFirstOrThrow({ where: { attemptId: a1 }, select: { id: true } });
    expect(await gradeEssay(s.teacher.id, ans.id, { points: "0", feedback: "" }, at(11))).toEqual({ ok: true });
    expect(await releaseResults(s.teacher.id, s.quiz.id, at(20))).toEqual({ ok: true });
    const a2 = await started(s, at(30));
    await submitAttempt(s.student.id, s.quiz.id, a2, at(40));
    expect((await getTeacherDashboard(at(50))).tasks).toEqual([
      { kind: "GRADE", quizId: s.quiz.id, title: s.quiz.title, essays: 1 },
    ]);
  });

  it("orders kinds RUNNING, GRADE, OTHER_DEVICE and titles ascending", async () => {
    const z = await setup({ title: "A-awal" }, [{ type: "ESSAY" }]); // renamed below so it sorts last
    const y = await setup({ title: "B-pertama" }, [{ type: "ESSAY" }]);
    const zy = [z, y];
    await prisma.quiz.update({ where: { id: z.quiz.id }, data: { title: "Z-akhir" } });
    for (const s of zy) await submitAttempt(s.student.id, s.quiz.id, await started(s), at(10));
    const r = await setup({ title: "R-berjalan" }, [{ type: "ESSAY" }]);
    await started(r, at(15));
    await prisma.auditLog.create({
      data: { actorUserId: r.student.id, action: "STUDENT_SESSION_REPLACED", entityType: "User", entityId: r.student.id, createdAt: at(16) },
    });
    expect((await getTeacherDashboard(at(20))).tasks).toEqual([
      { kind: "RUNNING", quizId: r.quiz.id, title: "R-berjalan", inProgress: 1 },
      { kind: "GRADE", quizId: y.quiz.id, title: "B-pertama", essays: 1 },
      { kind: "GRADE", quizId: z.quiz.id, title: "Z-akhir", essays: 1 },
      { kind: "OTHER_DEVICE", students: 1 },
    ]);
  });
});
