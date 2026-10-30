import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { GRACE_MS, clearHelpRequest, listStudentQuizzes, requestHelp, startAttempt, submitAttempt } from "@/lib/attempts";
import { getTeacherDashboard } from "@/lib/dashboard";
import { getQuizRecap } from "@/lib/results";
import { getQuizForTeacher, rotateExamToken, setExamTokenRequired } from "@/lib/quizzes";
import { taskLine } from "@/lib/task-text";
import { makeStudent, makeTeacher } from "../tests/factories";
import { at, DUR, min, setup, started } from "../tests/quiz-setup";

vi.mock("@/lib/storage", () => import("../tests/storage-fake").then((m) => m.storageMock()));

const tokenOf = async (quizId: string) => (await prisma.quiz.findUniqueOrThrow({ where: { id: quizId } })).examToken;

describe("exam token (D5)", () => {
  it("no token set: start works without one", async () => {
    const s = await setup();
    expect((await startAttempt(s.stu, s.quiz.id, at(0))).ok).toBe(true);
  });

  it("required / invalid / valid, with normalization", async () => {
    const s = await setup();
    const on = await setExamTokenRequired(s.teacher.id, s.quiz.id, true);
    if (!on.ok || !on.token) throw new Error("token expected");
    expect(on.token).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
    expect(await startAttempt(s.stu, s.quiz.id, at(0))).toEqual({ ok: false, error: "TOKEN_REQUIRED" });
    expect(await startAttempt(s.stu, s.quiz.id, at(0), "  ")).toEqual({ ok: false, error: "TOKEN_REQUIRED" });
    expect(await startAttempt(s.stu, s.quiz.id, at(0), "AAAAAA")).toEqual({ ok: false, error: "TOKEN_INVALID" });
    expect(await prisma.quizAttempt.count()).toBe(0);
    const typed = ` ${on.token.slice(0, 3).toLowerCase()} ${on.token.slice(3).toLowerCase()} `;
    expect((await startAttempt(s.stu, s.quiz.id, at(0), typed)).ok).toBe(true);
  });

  it("resume of an in-progress attempt needs no token", async () => {
    const s = await setup();
    const on = await setExamTokenRequired(s.teacher.id, s.quiz.id, true);
    if (!on.ok || !on.token) throw new Error("token expected");
    const first = await startAttempt(s.stu, s.quiz.id, at(0), on.token);
    const again = await startAttempt(s.stu, s.quiz.id, at(1000));
    expect(again).toEqual(first);
    expect(await prisma.quizAttempt.count()).toBe(1);
  });

  it("rotate changes the token and the old one fails; turning off clears it", async () => {
    const s = await setup();
    const on = await setExamTokenRequired(s.teacher.id, s.quiz.id, true);
    if (!on.ok || !on.token) throw new Error("token expected");
    const old = on.token;
    let next = old;
    while (next === old) {
      const r = await rotateExamToken(s.teacher.id, s.quiz.id);
      if (!r.ok) throw new Error("rotate failed");
      next = r.token;
    }
    expect(await tokenOf(s.quiz.id)).toBe(next);
    expect(await startAttempt(s.stu, s.quiz.id, at(0), old)).toEqual({ ok: false, error: "TOKEN_INVALID" });
    expect((await startAttempt(s.stu, s.quiz.id, at(0), next)).ok).toBe(true);
    expect(await setExamTokenRequired(s.teacher.id, s.quiz.id, false)).toEqual({ ok: true, token: null });
    expect(await tokenOf(s.quiz.id)).toBeNull();
    expect(await rotateExamToken(s.teacher.id, s.quiz.id)).toEqual({ ok: false, error: "NOT_FOUND" });
  });

  it("only the quiz's teacher can change it; students and other teachers get NOT_FOUND; audit has no token", async () => {
    const s = await setup();
    const other = await makeTeacher();
    expect(await setExamTokenRequired(other.user.id, s.quiz.id, true)).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(await setExamTokenRequired(s.student.id, s.quiz.id, true)).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(await tokenOf(s.quiz.id)).toBeNull();
    const on = await setExamTokenRequired(s.teacher.id, s.quiz.id, true);
    if (!on.ok || !on.token) throw new Error("token expected");
    expect(await rotateExamToken(other.user.id, s.quiz.id)).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(await tokenOf(s.quiz.id)).toBe(on.token);
    const logs = await prisma.auditLog.findMany({ where: { action: "QUIZ_TOKEN_SET" } });
    expect(JSON.stringify(logs)).not.toContain(on.token);
    expect((await getQuizForTeacher(s.quiz.id))?.examToken).toBe(on.token);
  });

  it("the token never appears in what a student gets", async () => {
    const s = await setup();
    const on = await setExamTokenRequired(s.teacher.id, s.quiz.id, true);
    if (!on.ok || !on.token) throw new Error("token expected");
    const rows = await listStudentQuizzes(s.stu, at(0));
    expect(rows[0].needsToken).toBe(true);
    expect(JSON.stringify(rows)).not.toContain(on.token);
    expect(JSON.stringify(rows)).not.toContain("examToken");
  });

  it("too many token tries are refused, even a correct one", async () => {
    const s = await setup();
    const on = await setExamTokenRequired(s.teacher.id, s.quiz.id, true);
    if (!on.ok || !on.token) throw new Error("token expected");
    for (let i = 0; i < 10; i++) expect(await startAttempt(s.stu, s.quiz.id, at(0), "AAAAAA")).toMatchObject({ ok: false });
    expect(await startAttempt(s.stu, s.quiz.id, at(0), on.token)).toEqual({ ok: false, error: "TOKEN_THROTTLED" });
  });
});

describe("help request (D6)", () => {
  it("owner sets it, repeat keeps the first timestamp", async () => {
    const s = await setup();
    const id = await started(s);
    expect(await requestHelp(s.student.id, id, at(min(1)))).toEqual({ ok: true });
    const first = (await prisma.quizAttempt.findUniqueOrThrow({ where: { id } })).helpRequestedAt;
    expect(first).toEqual(at(min(1)));
    expect(await requestHelp(s.student.id, id, at(min(2)))).toEqual({ ok: true });
    expect((await prisma.quizAttempt.findUniqueOrThrow({ where: { id } })).helpRequestedAt).toEqual(first);
  });

  it("another student is refused and nothing changes", async () => {
    const s = await setup();
    const id = await started(s);
    const other = await makeStudent(s.cls.id);
    expect(await requestHelp(other.id, id, at(min(1)))).toEqual({ ok: false, error: "NOT_FOUND" });
    expect((await prisma.quizAttempt.findUniqueOrThrow({ where: { id } })).helpRequestedAt).toBeNull();
  });

  it("refused after deadline + grace, and once submitted", async () => {
    const s = await setup();
    const id = await started(s);
    expect(await requestHelp(s.student.id, id, at(min(DUR) + GRACE_MS))).toEqual({ ok: false, error: "DEADLINE_PASSED" });
    expect((await requestHelp(s.student.id, id, at(min(DUR) + GRACE_MS - 1))).ok).toBe(true);
    const s2 = await setup();
    const id2 = await started(s2);
    await submitAttempt(s2.student.id, s2.quiz.id, id2, at(min(1)));
    expect(await requestHelp(s2.student.id, id2, at(min(2)))).toEqual({ ok: false, error: "ATTEMPT_CLOSED" });
  });

  it("shows on monitoring and the dashboard until the teacher clears it", async () => {
    const s = await setup();
    const id = await started(s);
    await requestHelp(s.student.id, id, at(min(1)));
    const recap = await getQuizRecap(s.quiz.id, at(min(2)));
    expect(recap?.rows[0].running?.helpRequestedAt).toEqual(at(min(1)));
    const help = (await getTeacherDashboard(at(min(2)))).tasks.find((t) => t.kind === "HELP");
    expect(help).toEqual({ kind: "HELP", quizId: s.quiz.id, title: s.quiz.title, students: 1 });
    expect(taskLine(help!).href).toContain(s.quiz.id);

    const other = await makeTeacher();
    expect(await clearHelpRequest(other.user.id, id)).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(await clearHelpRequest(s.student.id, id)).toEqual({ ok: false, error: "NOT_FOUND" });
    expect((await prisma.quizAttempt.findUniqueOrThrow({ where: { id } })).helpRequestedAt).not.toBeNull();
    expect(await clearHelpRequest(s.teacher.id, id)).toEqual({ ok: true });
    expect((await getQuizRecap(s.quiz.id, at(min(3))))?.rows[0].running?.helpRequestedAt).toBeNull();
    expect((await getTeacherDashboard(at(min(3)))).tasks.some((t) => t.kind === "HELP")).toBe(false);
  });
});
