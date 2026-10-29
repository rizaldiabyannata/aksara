// Shared quiz fixture for the attempt, result, and export tests: a published quiz with one class and one student.
import { expect } from "vitest";
import { prisma } from "@/lib/db";
import { publishQuiz } from "@/lib/quizzes";
import { startAttempt } from "@/lib/attempts";
import { makeChapter, makeClass, makeQuestion, makeQuiz, makeQuizQuestion, makeStudent, makeTeacher } from "./factories";

export const t0 = new Date("2030-01-01T00:00:00.000Z");
export const min = (m: number) => m * 60_000;
export const at = (ms: number) => new Date(t0.getTime() + ms);
export const DUR = 30;

type QOpts = { type?: "SINGLE_CHOICE" | "ESSAY" | "MULTIPLE_SELECT"; points?: number };

export async function setup(
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

export const started = async (s: Awaited<ReturnType<typeof setup>>, now = t0) => {
  const r = await startAttempt(s.stu, s.quiz.id, now);
  if (!r.ok) throw new Error("start failed " + r.error);
  return r.attemptId;
};
export const attemptRow = (id: string) => prisma.quizAttempt.findUniqueOrThrow({ where: { id } });
