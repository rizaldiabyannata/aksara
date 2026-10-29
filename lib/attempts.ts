// Student quiz-attempt domain. Server time decides: every time check uses the `now` argument.
// Answer keys live only in answerKeySnapshot and are read here for grading, never returned.
import { randomInt } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import type { AttemptStatus, GradingStatus, QuestionType, SubmitReason } from "@/lib/generated/prisma/enums";
import { gradeObjective, parseAnswer, type ObjectiveQuestion, type StoredAnswer } from "@/lib/grading";
import type { ImageView } from "@/lib/materials";
import type { Option } from "@/lib/questions";
import { lockQuiz, type AnswerKeySnapshot, type QuestionSnapshot } from "@/lib/quizzes";
import { attemptScore, retakeOpen, type ScoredAttempt } from "@/lib/scoring";
import { uniqueViolation } from "@/lib/unique-violation";
import { writeAudit } from "@/lib/audit";
import { optional, parse, type Invalid, type NotFound } from "@/lib/validation";

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
type StartError = "ATTEMPT_LIMIT" | "REMEDIAL_NOT_AVAILABLE" | "RESULTS_RELEASED";

/** Select + mapper for lib/scoring: manual points enter as hundredths. */
export const SCORED_SELECT = {
  slot: true, replacementGrantedAt: true, status: true, gradingStatus: true, maxPoints: true, objectiveScore: true,
  answers: { where: { manualPoints: { not: null } }, select: { manualPoints: true } },
} as const;
export function toScored(a: Prisma.QuizAttemptGetPayload<{ select: typeof SCORED_SELECT }>): ScoredAttempt {
  return {
    slot: a.slot, replaced: a.replacementGrantedAt !== null, status: a.status, gradingStatus: a.gradingStatus,
    maxPoints: a.maxPoints,
    earnedCenti: (a.objectiveScore ?? 0) * 100 + a.answers.reduce((s, x) => s + (x.manualPoints?.mul(100).toNumber() ?? 0), 0),
  };
}

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
      shuffleQuestions: true, shuffleOptions: true, scoringPolicy: true, kkm: true, resultsReleasedAt: true,
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
  const all = await tx.quizAttempt.findMany({ where: mine, select: SCORED_SELECT });
  const total = all.length;
  let slot: number;
  if (pending) slot = pending.slot;
  else {
    const used = all.filter((a) => !a.replacementGrantedAt).length;
    if (used >= quiz.maxAttempts) return { ok: false, error: "ATTEMPT_LIMIT" };
    if (used >= 1 && !retakeOpen(all.map(toScored), quiz)) {
      return { ok: false, error: quiz.scoringPolicy === "REMEDIAL" ? "REMEDIAL_NOT_AVAILABLE" : "RESULTS_RELEASED" };
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
  const own = await prisma.quizAttempt.findFirst({ where: { id: attemptId, studentId, quizId }, select: { deadlineAt: true } });
  if (!own) return NOT_FOUND;
  const reason: SubmitReason = now >= own.deadlineAt ? "TIMEOUT" : "MANUAL"; // late but inside grace
  const won = await prisma.$transaction(async (tx) => {
    const r = await tx.quizAttempt.updateMany({
      where: { id: attemptId, status: "IN_PROGRESS", deadlineAt: { gt: new Date(now.getTime() - GRACE_MS) } },
      data: { status: "SUBMITTED", submitReason: reason, submittedAt: now },
    });
    if (r.count === 1) await gradeAttempt(tx, attemptId);
    return r.count === 1;
  });
  if (won) return { ok: true, reason };
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
  const essays = attempt.quiz.questions.filter((q) => (q.questionSnapshot as QuestionSnapshot).type === "ESSAY");
  const hasEssay = essays.length > 0;
  // An unanswered essay still waits for the teacher (Q-06), so it gets a row to grade.
  const answered = new Set(attempt.answers.map((a) => a.quizQuestionId));
  await tx.attemptAnswer.createMany({
    data: essays.filter((q) => !answered.has(q.id)).map((q) => ({ attemptId, quizQuestionId: q.id, answer: Prisma.DbNull })),
    skipDuplicates: true,
  });
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

export type StudentQuizState = "AVAILABLE" | "SCHEDULED" | "IN_PROGRESS" | "REPLACEMENT" | "DONE" | "CLOSED";
export type StudentQuizRow = {
  quizId: string; title: string; instructions: string | null; subjectName: string; durationMinutes: number;
  questionCount: number; startsAt: Date | null; endsAt: Date | null; remainingAttempts: number;
  state: StudentQuizState; hasAttempts: boolean; resultsReleased: boolean; deadlineAt: Date | null;
};

export async function listStudentQuizzes(
  student: { id: string; classId: string | null },
  now: Date = new Date(),
): Promise<StudentQuizRow[]> {
  if (!student.classId) return [];
  await finalizeExpiredAttempts({ studentId: student.id }, now);
  const quizzes = await prisma.quiz.findMany({
    where: { status: "PUBLISHED", classes: { some: { classId: student.classId } } },
    orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true, title: true, instructions: true, durationMinutes: true, startsAt: true, endsAt: true,
      maxAttempts: true, scoringPolicy: true, kkm: true, resultsReleasedAt: true,
      subject: { select: { name: true } },
      _count: { select: { questions: true } },
      attempts: {
        where: { studentId: student.id },
        select: { ...SCORED_SELECT, deadlineAt: true, replacedBy: { select: { id: true } } },
      },
    },
  });
  return quizzes.map((q) => {
    const used = q.attempts.filter((a) => !a.replacementGrantedAt).length;
    const pending = q.attempts.some((a) => a.replacementGrantedAt && !a.replacedBy);
    const running = q.attempts.some((a) => a.status === "IN_PROGRESS");
    const remainingAttempts = Math.max(0, q.maxAttempts - used);
    const locked = used >= 1 && !retakeOpen(q.attempts.map(toScored), q);
    let state: StudentQuizState;
    if (running) state = "IN_PROGRESS";
    else if (q.startsAt && now < q.startsAt) state = "SCHEDULED";
    else if (q.endsAt && q.endsAt <= now) state = "CLOSED";
    else if (pending) state = "REPLACEMENT";
    else if (remainingAttempts === 0 || locked) state = "DONE";
    else state = "AVAILABLE";
    return {
      quizId: q.id, title: q.title, instructions: q.instructions, subjectName: q.subject.name,
      durationMinutes: q.durationMinutes, questionCount: q._count.questions, startsAt: q.startsAt, endsAt: q.endsAt,
      remainingAttempts, state, hasAttempts: q.attempts.length > 0, resultsReleased: q.resultsReleasedAt !== null,
      deadlineAt: q.attempts.find((a) => a.status === "IN_PROGRESS")?.deadlineAt ?? null,
    };
  });
}

export type AttemptRow = {
  attemptId: string; studentName: string; className: string; attemptNumber: number; slot: number;
  status: AttemptStatus; submitReason: SubmitReason | null; replaced: boolean; startedAt: Date; submittedAt: Date | null;
  score: number | null; gradingStatus: GradingStatus | null; pendingEssays: number;
};

// After gradeAttempt every objective row has objectivePoints, so these are exactly the essays still to grade.
export const UNGRADED = { objectivePoints: null, manualPoints: null } as const;

export async function listQuizAttempts(quizId: string, now: Date = new Date()): Promise<AttemptRow[]> {
  await finalizeExpiredAttempts({ quizId }, now);
  const rows = await prisma.quizAttempt.findMany({
    where: { quizId },
    orderBy: [{ student: { displayName: "asc" } }, { attemptNumber: "asc" }],
    select: {
      ...SCORED_SELECT,
      id: true, attemptNumber: true, submitReason: true, startedAt: true, submittedAt: true,
      student: { select: { displayName: true, class: { select: { name: true } } } },
      _count: { select: { answers: { where: UNGRADED } } },
    },
  });
  return rows.map((r) => {
    const sc = toScored(r);
    const submitted = r.status === "SUBMITTED";
    return {
      attemptId: r.id, studentName: r.student.displayName, className: r.student.class?.name ?? "",
      attemptNumber: r.attemptNumber, slot: r.slot, status: r.status, submitReason: r.submitReason,
      replaced: r.replacementGrantedAt !== null, startedAt: r.startedAt, submittedAt: r.submittedAt,
      score: submitted ? attemptScore(sc.earnedCenti, sc.maxPoints) : null,
      gradingStatus: r.gradingStatus,
      pendingEssays: submitted ? r._count.answers : 0,
    };
  });
}

const REASON_MSG = "Alasan wajib diisi, 5 sampai 300 huruf.";
const reasonSchema = z.object({
  reason: z.string({ error: REASON_MSG }).trim()
    .refine((v) => [...v].length >= 5 && [...v].length <= 300, { error: REASON_MSG }),
});

export async function grantReplacement(
  actorId: string,
  attemptId: string,
  reason: unknown,
  now: Date = new Date(),
): Promise<{ ok: true } | Invalid | NotFound | { ok: false; error: "ALREADY_REPLACED" | "RESULTS_RELEASED" }> {
  const p = parse(reasonSchema, { reason });
  if (!p.ok) return p;
  return prisma.$transaction(async (tx) => {
    const own = await tx.quizAttempt.findUnique({ where: { id: attemptId }, select: { quizId: true } });
    if (!own) return NOT_FOUND;
    // Shared lock orders this grant against a concurrent release: a student who saw the key gets no fresh attempt.
    await lockQuiz(tx, own.quizId, "SHARE");
    const quiz = await tx.quiz.findUniqueOrThrow({ where: { id: own.quizId }, select: { resultsReleasedAt: true } });
    if (quiz.resultsReleasedAt) return { ok: false, error: "RESULTS_RELEASED" } as const;
    const r = await tx.quizAttempt.updateMany({
      where: { id: attemptId, replacementGrantedAt: null },
      data: { replacementGrantedAt: now, replacementGrantedById: actorId, replacementReason: p.data.reason },
    });
    if (r.count === 0) {
      const exists = await tx.quizAttempt.findUnique({ where: { id: attemptId }, select: { id: true } });
      return exists ? ({ ok: false, error: "ALREADY_REPLACED" } as const) : NOT_FOUND;
    }
    // The grant's row lock serializes with a concurrent submit: whichever commits second sees the other's state.
    await tx.quizAttempt.updateMany({
      where: { id: attemptId, status: "IN_PROGRESS" },
      data: { status: "SUBMITTED", submitReason: "REPLACED", submittedAt: now },
    });
    await writeAudit(tx, {
      actorUserId: actorId, action: "ATTEMPT_REPLACEMENT_GRANTED", entityType: "QuizAttempt",
      entityId: attemptId, metadata: { attemptId, reason: p.data.reason },
    });
    return { ok: true } as const;
  });
}

const POINTS_MSG = "Nilai harus angka 0 sampai poin soal, paling banyak 2 angka di belakang koma.";
const gradeSchema = z.object({
  points: z.string({ error: POINTS_MSG }).trim()
    .regex(/^\d{1,3}([.,]\d{1,2})?$/, { error: POINTS_MSG })
    .transform((v) => Math.round(Number(v.replace(",", ".")) * 100)),
  feedback: optional(2000, "Umpan balik paling banyak 2.000 huruf."),
});

/** Sets or changes one essay score (Q-07: up to 2 decimals) and settles the attempt's gradingStatus. */
export async function gradeEssay(
  actorId: string,
  answerId: string,
  input: unknown,
  now: Date = new Date(),
): Promise<{ ok: true } | Invalid | NotFound | { ok: false; error: "NOT_GRADABLE" }> {
  const p = parse(gradeSchema, input);
  if (!p.ok) return p;
  return prisma.$transaction(async (tx) => {
    const own = await tx.attemptAnswer.findUnique({ where: { id: answerId }, select: { attemptId: true } });
    if (!own) return NOT_FOUND;
    const { attemptId } = own;
    // Two essays of one attempt graded at once must not both see the other as ungraded.
    await tx.$queryRaw`SELECT "id" FROM "QuizAttempt" WHERE "id" = ${attemptId} FOR UPDATE`;
    const a = await tx.attemptAnswer.findUniqueOrThrow({
      where: { id: answerId },
      select: {
        manualPoints: true, quizQuestionId: true,
        quizQuestion: { select: { points: true, questionSnapshot: true } },
        attempt: { select: { status: true, replacementGrantedAt: true } },
      },
    });
    if (
      a.attempt.status !== "SUBMITTED" || a.attempt.replacementGrantedAt ||
      (a.quizQuestion.questionSnapshot as QuestionSnapshot).type !== "ESSAY"
    ) return { ok: false, error: "NOT_GRADABLE" } as const;
    if (p.data.points > a.quizQuestion.points * 100) {
      return { ok: false, error: "INVALID", fieldErrors: { points: POINTS_MSG } } as const;
    }
    const from = a.manualPoints?.toNumber() ?? null;
    const to = p.data.points / 100;
    await tx.attemptAnswer.update({
      where: { id: answerId },
      data: { manualPoints: to.toFixed(2), teacherFeedback: p.data.feedback, gradedById: actorId, gradedAt: now },
    });
    if (from !== to) {
      await writeAudit(tx, {
        actorUserId: actorId, action: "MANUAL_SCORE_SET", entityType: "QuizAttempt", entityId: attemptId,
        metadata: { attemptId, quizQuestionId: a.quizQuestionId, from, to },
      });
    }
    const pending = await tx.attemptAnswer.count({ where: { attemptId, ...UNGRADED } });
    await tx.quizAttempt.update({
      where: { id: attemptId },
      data: { gradingStatus: pending === 0 ? "FINAL" : "PENDING_MANUAL_GRADING" },
    });
    return { ok: true } as const;
  });
}

export type TeacherQuestion = {
  quizQuestionId: string; number: number; points: number;
  question: QuestionSnapshot & { id: string };
  answerKey: AnswerKeySnapshot["answerKey"]; explanation: string | null; explanationImages: ImageView[];
  answerId: string | null; answer: StoredAnswer | null;
  objectivePoints: number | null; manualPoints: number | null; feedback: string | null;
};
export type TeacherAttempt = {
  attemptId: string; quizId: string; quizTitle: string; studentName: string; className: string;
  attemptNumber: number; slot: number; status: AttemptStatus; submitReason: SubmitReason | null;
  replaced: boolean; replacementReason: string | null; submittedAt: Date | null;
  maxPoints: number; score: number | null; gradingStatus: GradingStatus | null;
  questions: TeacherQuestion[];
};

export const IMAGE_VIEW = { id: true, altText: true, caption: true, sourceReference: true, width: true, height: true } as const;

/** Teacher-only: every question in original order with key, answer, and points. */
export async function getAttemptForTeacher(quizId: string, attemptId: string, now: Date = new Date()): Promise<TeacherAttempt | null> {
  await finalizeExpiredAttempts({ quizId }, now);
  const a = await prisma.quizAttempt.findFirst({
    where: { id: attemptId, quizId },
    select: {
      ...SCORED_SELECT,
      id: true, attemptNumber: true, submitReason: true, replacementReason: true, submittedAt: true,
      answers: { select: { id: true, quizQuestionId: true, answer: true, objectivePoints: true, manualPoints: true, teacherFeedback: true } },
      student: { select: { displayName: true, class: { select: { name: true } } } },
      quiz: {
        select: {
          title: true,
          questions: {
            orderBy: { position: "asc" },
            select: {
              id: true, points: true, questionSnapshot: true, answerKeySnapshot: true,
              images: { where: { visibility: "EXPLANATION" }, select: { image: { select: IMAGE_VIEW } } },
            },
          },
        },
      },
    },
  });
  if (!a) return null;
  const sc = toScored(a);
  const byQ = new Map(a.answers.map((x) => [x.quizQuestionId, x]));
  return {
    attemptId: a.id, quizId, quizTitle: a.quiz.title, studentName: a.student.displayName,
    className: a.student.class?.name ?? "", attemptNumber: a.attemptNumber, slot: a.slot, status: a.status,
    submitReason: a.submitReason, replaced: a.replacementGrantedAt !== null, replacementReason: a.replacementReason,
    submittedAt: a.submittedAt, maxPoints: a.maxPoints,
    score: a.status === "SUBMITTED" ? attemptScore(sc.earnedCenti, sc.maxPoints) : null,
    gradingStatus: a.gradingStatus,
    questions: a.quiz.questions.map((q, i) => {
      const key = q.answerKeySnapshot as AnswerKeySnapshot;
      const ans = byQ.get(q.id);
      return {
        quizQuestionId: q.id, number: i + 1, points: q.points,
        question: { ...(q.questionSnapshot as QuestionSnapshot), id: q.id },
        answerKey: key.answerKey, explanation: key.explanation,
        explanationImages: q.images.map((x) => x.image),
        answerId: ans?.id ?? null, answer: (ans?.answer as StoredAnswer | null) ?? null,
        objectivePoints: ans?.objectivePoints ?? null, manualPoints: ans?.manualPoints?.toNumber() ?? null,
        feedback: ans?.teacherFeedback ?? null,
      };
    }),
  };
}
