import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  makeAttempt,
  makeChapter,
  makeClass,
  makeImage,
  makeQuestion,
  makeQuiz,
  makeQuizQuestion,
  makeStudent,
  makeTeacher,
} from "../tests/factories";

async function setup() {
  const { user } = await makeTeacher();
  const chapter = await makeChapter();
  const question = await makeQuestion(chapter.id, user.id);
  const quiz = await makeQuiz(chapter.subjectId, user.id);
  const quizQuestion = await makeQuizQuestion(quiz.id, question.id);
  return { user, chapter, question, quiz, quizQuestion };
}

describe("Quiz FKs and uniques", () => {
  it("rejects deleting a Question referenced by a QuizQuestion", async () => {
    const { question } = await setup();
    await expect(
      prisma.question.delete({ where: { id: question.id } }),
    ).rejects.toThrow(/QuizQuestion_questionId_fkey/);
  });

  it("rejects a second attempt with the same attemptNumber for a student", async () => {
    const { quiz } = await setup();
    const student = await makeStudent((await makeClass()).id);
    await makeAttempt(quiz.id, student.id);
    await expect(makeAttempt(quiz.id, student.id)).rejects.toThrow(
      /QuizAttempt_quizId_studentId_attemptNumber_key/,
    );
  });

  it("rejects two attempts replacing the same attempt", async () => {
    const { quiz } = await setup();
    const student = await makeStudent((await makeClass()).id);
    const original = await makeAttempt(quiz.id, student.id, { attemptNumber: 1 });
    await makeAttempt(quiz.id, student.id, { attemptNumber: 2, replacesAttemptId: original.id });
    await expect(
      makeAttempt(quiz.id, student.id, { attemptNumber: 3, replacesAttemptId: original.id }),
    ).rejects.toThrow(/QuizAttempt_replacesAttemptId_key/);
  });

  it("rejects deleting an Image referenced by a QuizQuestionImage", async () => {
    const { user, quizQuestion, question } = await setup();
    const image = await makeImage(null, user.id, { questionId: question.id });
    await prisma.quizQuestionImage.create({
      data: { quizQuestionId: quizQuestion.id, imageId: image.id, visibility: "QUESTION" },
    });
    await expect(prisma.image.delete({ where: { id: image.id } })).rejects.toThrow(
      /QuizQuestionImage_imageId_fkey/,
    );
  });
});
