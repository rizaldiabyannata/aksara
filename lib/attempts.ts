// Student quiz-attempt domain. Server time decides: every time check uses the `now` argument.
// Answer keys live only in answerKeySnapshot and are read here for grading, never returned.
import { randomInt } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import type { QuestionType, SubmitReason } from "@/lib/generated/prisma/enums";
import { gradeObjective, parseAnswer, type ObjectiveQuestion, type StoredAnswer } from "@/lib/grading";
import type { ImageView } from "@/lib/materials";
import type { Option } from "@/lib/questions";
import { lockQuiz, type AnswerKeySnapshot, type QuestionSnapshot } from "@/lib/quizzes";
import { uniqueViolation } from "@/lib/unique-violation";
import type { Invalid, NotFound } from "@/lib/validation";

export const GRACE_MS = 60_000;

export type AttemptQuestion = {
  id: string;
  number: number;
  type: QuestionType;
  prompt: string;
  options: Option[] | null;
  images: ImageView[];
  answer: StoredAnswer | null;
};
export type AttemptView =
  | { status: "IN_PROGRESS"; attemptId: string; quizId: string; quizTitle: string; deadlineAt: string; serverNow: string; questions: AttemptQuestion[] }
  | { status: "SUBMITTED"; attemptId: string; quizId: string; quizTitle: string };
type StartError = "ATTEMPT_LIMIT" | "REMEDIAL_NOT_AVAILABLE";

const NOT_FOUND: NotFound = { ok: false, error: "NOT_FOUND" };
const ATTEMPT_INDEXES = {
  QuizAttempt_quizId_studentId_attemptNumber_key: "dup",
  QuizAttempt_replacesAttemptId_key: "dup",
} as const;

function shuffled<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const isChoice = (t: QuestionType) => t === "SINGLE_CHOICE" || t === "MULTIPLE_SELECT";

export async function startAttempt(
  student: { id: string; classId: string | null },
  quizId: string,
  now: Date = new Date(),
): Promise<{ ok: true; attemptId: string } | NotFound | { ok: false; error: StartError }> {
  await finalizeExpiredAttempts({ quizId, studentId: student.id }, now);
  const runningId = async () =>
    (await prisma.quizAttempt.findFirst({
      where: { quizId, studentId: student.id, status: "IN_PROGRESS" },
      select: { id: true },
    }))?.id;
  for (let retry = false; ; retry = true) {
    try {
      const r = await prisma.$transaction((tx) => startInTx(tx, student, quizId, now));
      if (r.ok || r.error === "NOT_FOUND") return r;
      // A concurrent start may have committed after our in-progress check: it now counts as "used".
      const id = await runningId();
      return id ? { ok: true, attemptId: id } : r;
    } catch (e) {
      // P2002 aborts the transaction, so it is handled out here.
      if (!uniqueViolation(e, ATTEMPT_INDEXES)) throw e;
      const id = await runningId();
      if (id) return { ok: true, attemptId: id };
      if (retry) throw e;
    }
  }
}

async function startInTx(
  tx: Prisma.TransactionClient,
  student: { id: string; classId: string | null },
  quizId: string,
  now: Date,
): Promise<{ ok: true; attemptId: string } | NotFound | { ok: false; error: StartError }> {
  if (!(await lockQuiz(tx, quizId, "SHARE"))) return NOT_FOUND;
  const quiz = await tx.quiz.findUniqueOrThrow({
    where: { id: quizId },
    select: {
      status: true, startsAt: true, endsAt: true, durationMinutes: true, maxAttempts: true,
      shuffleQuestions: true, shuffleOptions: true, scoringPolicy: true, resultsReleasedAt: true,
      classes: { where: { classId: student.classId ?? "" }, select: { classId: true } },
      questions: { orderBy: { position: "asc" }, select: { id: true, points: true, questionSnapshot: true } },
    },
  });
  if (
    quiz.status !== "PUBLISHED" || !student.classId || quiz.classes.length === 0 ||
    (quiz.startsAt && quiz.startsAt > now) || (quiz.endsAt && now >= quiz.endsAt)
  ) return NOT_FOUND;

  const mine = { quizId, studentId: student.id };
  const running = await tx.quizAttempt.findFirst({ where: { ...mine, status: "IN_PROGRESS" }, select: { id: true } });
  if (running) return { ok: true, attemptId: running.id };

  const pending = await tx.quizAttempt.findFirst({
    where: { ...mine, replacementGrantedAt: { not: null }, replacedBy: { is: null } },
    orderBy: { attemptNumber: "asc" },
    select: { id: true, slot: true },
  });
  const total = await tx.quizAttempt.count({ where: mine });
  let slot: number;
  if (pending) slot = pending.slot;
  else {
    const used = await tx.quizAttempt.count({ where: { ...mine, replacementGrantedAt: null } });
    if (used >= quiz.maxAttempts) return { ok: false, error: "ATTEMPT_LIMIT" };
    if (quiz.scoringPolicy === "REMEDIAL" && used >= 1 && !quiz.resultsReleasedAt) {
      return { ok: false, error: "REMEDIAL_NOT_AVAILABLE" };
    }
    slot = used + 1;
  }

  const ids = quiz.questions.map((q) => q.id);
  const optionOrder: Record<string, string[]> = {};
  for (const q of quiz.questions) {
    const snap = q.questionSnapshot as QuestionSnapshot;
    if (!isChoice(snap.type) || !snap.options) continue;
    const optionIds = snap.options.map((o) => o.id);
    optionOrder[q.id] = quiz.shuffleOptions ? shuffled(optionIds) : optionIds;
  }
  const dur = new Date(now.getTime() + quiz.durationMinutes * 60_000);
  const attempt = await tx.quizAttempt.create({
    data: {
      quizId, studentId: student.id, attemptNumber: total + 1, slot,
      startedAt: now,
      deadlineAt: quiz.endsAt && quiz.endsAt < dur ? quiz.endsAt : dur,
      questionOrder: quiz.shuffleQuestions ? shuffled(ids) : ids,
      optionOrder,
      maxPoints: quiz.questions.reduce((sum, q) => sum + q.points, 0),
      replacesAttemptId: pending?.id ?? null,
    },
    select: { id: true },
  });
  return { ok: true, attemptId: attempt.id };
}

export async function getAttemptView(
  studentId: string,
  where: { attemptId: string } | { quizId: string },
  now: Date = new Date(),
): Promise<AttemptView | null> {
  let quizId: string;
  if ("attemptId" in where) {
    const a = await prisma.quizAttempt.findFirst({ where: { id: where.attemptId, studentId }, select: { quizId: true } });
    if (!a) return null;
    quizId = a.quizId;
  } else quizId = where.quizId;
  await finalizeExpiredAttempts({ quizId, studentId }, now);

  const attempt = await prisma.quizAttempt.findFirst({
    where: "attemptId" in where ? { id: where.attemptId, studentId } : { quizId, studentId, status: "IN_PROGRESS" },
    select: {
      id: true, status: true, deadlineAt: true, questionOrder: true, optionOrder: true,
      quiz: { select: { id: true, title: true } },
      answers: { select: { quizQuestionId: true, answer: true } },
    },
  });
  if (!attempt) return null;
  const head = { attemptId: attempt.id, quizId: attempt.quiz.id, quizTitle: attempt.quiz.title };
  if (attempt.status !== "IN_PROGRESS") return { status: "SUBMITTED", ...head };

  const order = attempt.questionOrder as string[];
  const optionOrder = attempt.optionOrder as Record<string, string[]>;
  const rows = await prisma.quizQuestion.findMany({
    where: { id: { in: order }, quizId },
    select: { id: true, questionSnapshot: true },
  });
  const snaps = new Map(rows.map((r) => [r.id, r.questionSnapshot as QuestionSnapshot | null]));
  const saved = new Map(attempt.answers.map((a) => [a.quizQuestionId, a.answer as StoredAnswer | null]));

  const questions: AttemptQuestion[] = [];
  for (const id of order) {
    const snap = snaps.get(id);
    if (!snap) continue;
    let options: Option[] | null = null;
    if (snap.options) {
      const byId = new Map(snap.options.map((o) => [o.id, o]));
      const ids = Object.hasOwn(optionOrder, id) ? optionOrder[id] : snap.options.map((o) => o.id);
      options = ids.flatMap((oid) => {
        const o = byId.get(oid);
        return o ? [{ id: o.id, text: o.text }] : [];
      });
    }
    questions.push({
      id,
      number: questions.length + 1,
      type: snap.type,
      prompt: snap.prompt,
      options,
      images: snap.images.map((i) => ({
        id: i.id, altText: i.altText, caption: i.caption, sourceReference: i.sourceReference, width: i.width, height: i.height,
      })),
      answer: saved.get(id) ?? null,
    });
  }
  return { status: "IN_PROGRESS", ...head, deadlineAt: attempt.deadlineAt.toISOString(), serverNow: now.toISOString(), questions };
}

const saveInput = z.object({ quizQuestionId: z.string(), answer: z.unknown() });

export async function saveAnswer(
  studentId: string,
  attemptId: string,
  input: unknown,
  now: Date = new Date(),
): Promise<{ ok: true; savedAt: Date } | Invalid | NotFound | { ok: false; error: "DEADLINE_PASSED" | "ATTEMPT_CLOSED" }> {
  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: attemptId, studentId },
    select: { quizId: true, status: true, deadlineAt: true },
  });
  if (!attempt) return NOT_FOUND;
  if (attempt.status !== "IN_PROGRESS") return { ok: false, error: "ATTEMPT_CLOSED" };
  if (now.getTime() >= attempt.deadlineAt.getTime() + GRACE_MS) {
    await finalizeExpiredAttempts({ quizId: attempt.quizId, studentId }, now);
    return { ok: false, error: "DEADLINE_PASSED" };
  }
  const parsed = saveInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID", fieldErrors: { answer: "Jawaban tidak valid." } };
  const { quizQuestionId, answer } = parsed.data;
  const qq = await prisma.quizQuestion.findFirst({
    where: { id: quizQuestionId, quizId: attempt.quizId },
    select: { questionSnapshot: true },
  });
  if (!qq) return NOT_FOUND;
  const snap = qq.questionSnapshot as QuestionSnapshot | null;
  if (!snap) return NOT_FOUND;
  const p = parseAnswer({ type: snap.type, options: snap.options }, answer ?? null);
  if (!p.ok) return p;

  const value = p.answer === null ? Prisma.DbNull : (p.answer as Prisma.InputJsonValue);
  return prisma.$transaction(async (tx) => {
    const open = await tx.quizAttempt.updateMany({
      where: { id: attemptId, status: "IN_PROGRESS", deadlineAt: { gt: new Date(now.getTime() - GRACE_MS) } },
      data: { updatedAt: now },
    });
    if (open.count === 0) return { ok: false, error: "ATTEMPT_CLOSED" } as const;
    await tx.attemptAnswer.upsert({
      where: { attemptId_quizQuestionId: { attemptId, quizQuestionId } },
      create: { attemptId, quizQuestionId, answer: value, savedAt: now },
      update: { answer: value, savedAt: now },
    });
    return { ok: true, savedAt: now } as const;
  });
}

export async function submitAttempt(
  studentId: string,
  quizId: string,
  attemptId: string,
  now: Date = new Date(),
): Promise<{ ok: true; reason: SubmitReason } | NotFound> {
  const own = await prisma.quizAttempt.findFirst({ where: { id: attemptId, studentId, quizId }, select: { id: true } });
  if (!own) return NOT_FOUND;
  const won = await prisma.$transaction(async (tx) => {
    const r = await tx.quizAttempt.updateMany({
      where: { id: attemptId, status: "IN_PROGRESS", deadlineAt: { gt: new Date(now.getTime() - GRACE_MS) } },
      data: { status: "SUBMITTED", submitReason: "MANUAL", submittedAt: now },
    });
    if (r.count === 1) await gradeAttempt(tx, attemptId);
    return r.count === 1;
  });
  if (won) return { ok: true, reason: "MANUAL" };
  await finalizeExpiredAttempts({ quizId, studentId }, now);
  const row = await prisma.quizAttempt.findUniqueOrThrow({ where: { id: attemptId }, select: { submitReason: true } });
  return { ok: true, reason: row.submitReason ?? "TIMEOUT" };
}

export async function finalizeExpiredAttempts(
  filter: { quizId?: string; studentId?: string },
  now: Date = new Date(),
): Promise<number> {
  const expired = await prisma.quizAttempt.findMany({
    where: { ...filter, status: "IN_PROGRESS", deadlineAt: { lte: new Date(now.getTime() - GRACE_MS) } },
    select: { id: true, deadlineAt: true },
  });
  let done = 0;
  for (const a of expired) {
    done += await prisma.$transaction(async (tx) => {
      const r = await tx.quizAttempt.updateMany({
        where: { id: a.id, status: "IN_PROGRESS" },
        data: { status: "SUBMITTED", submitReason: "TIMEOUT", submittedAt: a.deadlineAt },
      });
      if (r.count === 1) await gradeAttempt(tx, a.id);
      return r.count;
    });
  }
  return done;
}

// Objective grading from the snapshot only; essays stay null until the teacher grades them.
async function gradeAttempt(tx: Prisma.TransactionClient, attemptId: string): Promise<void> {
  const attempt = await tx.quizAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    select: {
      quiz: { select: { questions: { select: { id: true, points: true, questionSnapshot: true, answerKeySnapshot: true } } } },
      answers: { select: { id: true, quizQuestionId: true, answer: true } },
    },
  });
  const qs = new Map(attempt.quiz.questions.map((q) => [q.id, q]));
  const hasEssay = attempt.quiz.questions.some((q) => (q.questionSnapshot as QuestionSnapshot).type === "ESSAY");
  let score = 0;
  for (const a of attempt.answers) {
    const q = qs.get(a.quizQuestionId);
    if (!q) continue;
    const type = (q.questionSnapshot as QuestionSnapshot).type;
    if (type === "ESSAY") continue;
    const key = (q.answerKeySnapshot as AnswerKeySnapshot).answerKey;
    const pts = gradeObjective({ type, answerKey: key } as ObjectiveQuestion, a.answer, q.points);
    score += pts;
    await tx.attemptAnswer.update({ where: { id: a.id }, data: { objectivePoints: pts } });
  }
  await tx.quizAttempt.update({
    where: { id: attemptId },
    data: { objectiveScore: score, gradingStatus: hasEssay ? "PENDING_MANUAL_GRADING" : "FINAL" },
  });
}
