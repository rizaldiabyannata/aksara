// Result release (PRD §7.8) and the per-student recap and result projection (F09). Students only ever get StudentResult.
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { finalizeExpiredAttempts, IMAGE_VIEW, SCORED_SELECT, toScored, UNGRADED } from "@/lib/attempts";
import { Prisma } from "@/lib/generated/prisma/client";
import type { AttemptStatus, ScoringPolicy } from "@/lib/generated/prisma/enums";
import type { StoredAnswer } from "@/lib/grading";
import type { ImageView } from "@/lib/materials";
import { lockQuiz, type AnswerKeySnapshot, type QuestionSnapshot } from "@/lib/quizzes";
import { attemptScore, computeRecap, retakeOpen, type Recap, type ScoringQuiz } from "@/lib/scoring";
import type { Invalid, NotFound } from "@/lib/validation";

const NOT_FOUND: NotFound = { ok: false, error: "NOT_FOUND" };

export async function releaseResults(actorId: string, quizId: string, now: Date = new Date()): Promise<{ ok: true } | Invalid | NotFound> {
  await finalizeExpiredAttempts({ quizId }, now);
  return prisma.$transaction(async (tx) => {
    // Exclusive lock: starts and replacement grants take a shared one, so none slips in under the checks below.
    if (!(await lockQuiz(tx, quizId, "UPDATE"))) return NOT_FOUND;
    const quiz = await tx.quiz.findUniqueOrThrow({ where: { id: quizId }, select: { status: true, resultsReleasedAt: true } });
    if (quiz.status !== "PUBLISHED") return NOT_FOUND;
    if (quiz.resultsReleasedAt) return { ok: true } as const;
    const running = await tx.quizAttempt.count({ where: { quizId, status: "IN_PROGRESS" } });
    const essays = await tx.attemptAnswer.count({
      where: { ...UNGRADED, attempt: { quizId, status: "SUBMITTED", replacementGrantedAt: null } },
    });
    // A granted but unstarted replacement would start after the student saw the key.
    const replacements = await tx.quizAttempt.count({
      where: { quizId, replacementGrantedAt: { not: null }, replacedBy: { is: null } },
    });
    const blockers = [
      running && `${running} siswa masih mengerjakan`,
      essays && `${essays} uraian belum dinilai`,
      replacements && `${replacements} percobaan pengganti belum dikerjakan`,
    ].filter(Boolean);
    if (blockers.length) {
      return { ok: false, error: "INVALID", fieldErrors: { form: `Hasil belum bisa dirilis: ${blockers.join(", ")}.` } } as const;
    }
    await tx.quiz.update({ where: { id: quizId }, data: { resultsReleasedAt: now, resultsReleasedById: actorId } });
    const attemptCount = await tx.quizAttempt.count({ where: { quizId, status: "SUBMITTED", replacementGrantedAt: null } });
    await writeAudit(tx, { actorUserId: actorId, action: "RESULTS_RELEASED", entityType: "Quiz", entityId: quizId, metadata: { attemptCount } });
    return { ok: true } as const;
  });
}

export async function unreleaseResults(actorId: string, quizId: string): Promise<{ ok: true } | NotFound> {
  return prisma.$transaction(async (tx) => {
    if (!(await lockQuiz(tx, quizId, "UPDATE"))) return NOT_FOUND;
    const quiz = await tx.quiz.findUniqueOrThrow({ where: { id: quizId }, select: { resultsReleasedAt: true } });
    if (!quiz.resultsReleasedAt) return { ok: true } as const;
    await tx.quiz.update({ where: { id: quizId }, data: { resultsReleasedAt: null, resultsReleasedById: null } });
    await writeAudit(tx, {
      actorUserId: actorId, action: "RESULTS_UNRELEASED", entityType: "Quiz", entityId: quizId,
      metadata: { releasedAt: quiz.resultsReleasedAt.toISOString() },
    });
    return { ok: true } as const;
  });
}

export type RecapState = "NOT_STARTED" | "IN_PROGRESS" | "WAITING_REPLACEMENT" | "NEEDS_GRADING" | "FINAL";
export const RECAP_STATE_LABEL: Record<RecapState, string> = {
  NOT_STARTED: "Belum mulai", IN_PROGRESS: "Sedang dikerjakan", WAITING_REPLACEMENT: "Menunggu percobaan pengganti",
  NEEDS_GRADING: "Belum final", FINAL: "Final",
};
export type RecapAttempt = {
  attemptId: string; attemptNumber: number; status: AttemptStatus; replaced: boolean;
  score: number | null; pendingEssays: number; startedAt: Date; submittedAt: Date | null;
};

export type RecapRow = {
  state: RecapState;
  running: { attemptId: string; deadlineAt: Date; answered: number; total: number; helpRequestedAt: Date | null } | null;
  attempts: RecapAttempt[];
  studentId: string; name: string; nis: string | null; className: string;
  attemptsUsed: number; recap: Recap; earnedPoints: number | null; maxPoints: number | null;
  status: string; lastSubmittedAt: Date | null;
};
export type QuizRecap = {
  quiz: { title: string; subjectName: string; scoringPolicy: ScoringPolicy; kkm: number | null; resultsReleasedAt: Date | null;
    maxAttempts: number; classes: { id: string; name: string }[];
  };
  rows: RecapRow[];
};

/** One row per student: active students of the target classes, plus anyone who has an attempt. Feeds D9 and the export. */
export async function getQuizRecap(quizId: string, now: Date = new Date()): Promise<QuizRecap | null> {
  await finalizeExpiredAttempts({ quizId }, now);
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      title: true, scoringPolicy: true, kkm: true, resultsReleasedAt: true, maxAttempts: true,
      subject: { select: { name: true } },
      classes: { select: { classId: true, class: { select: { id: true, name: true } } }, orderBy: { class: { name: "asc" } } },
      _count: { select: { questions: true } },
    },
  });
  if (!quiz) return null;
  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      OR: [
        { isActive: true, classId: { in: quiz.classes.map((c) => c.classId) } },
        { quizAttempts: { some: { quizId } } },
      ],
    },
    orderBy: [{ class: { name: "asc" } }, { displayName: "asc" }],
    select: {
      id: true, displayName: true, nis: true, class: { select: { name: true } },
      // Inline, not a module const: lib/images ↔ lib/results is an import cycle, so SCORED_SELECT is unset at load time.
      quizAttempts: {
        where: { quizId },
        orderBy: { attemptNumber: "asc" },
        select: {
          ...SCORED_SELECT, id: true, attemptNumber: true, helpRequestedAt: true, startedAt: true, deadlineAt: true, submittedAt: true, replacedBy: { select: { id: true } },
          _count: { select: { answers: { where: UNGRADED } } },
        },
      },
    },
  });
  const answeredBy = new Map(
    (await prisma.attemptAnswer.groupBy({
      by: ["attemptId"], _count: { _all: true },
      where: { answer: { not: Prisma.AnyNull }, attempt: { quizId, status: "IN_PROGRESS" } },
    })).map((g) => [g.attemptId, g._count._all]),
  );
  return {
    quiz: {
      maxAttempts: quiz.maxAttempts, classes: quiz.classes.map((c) => c.class),
      title: quiz.title, subjectName: quiz.subject.name, scoringPolicy: quiz.scoringPolicy, kkm: quiz.kkm,
      resultsReleasedAt: quiz.resultsReleasedAt,
    },
    rows: students.map((s) => {
      const as = s.quizAttempts;
      const counted = as.filter((a) => a.status === "SUBMITTED" && !a.replacementGrantedAt);
      const recap = computeRecap(as.map(toScored), quiz);
      const pending = counted.reduce((n, a) => n + a._count.answers, 0);
      const run = as.find((a) => a.status === "IN_PROGRESS");
      let state: RecapState;
      if (run) state = "IN_PROGRESS";
      else if (as.some((a) => a.replacementGrantedAt && !a.replacedBy)) state = "WAITING_REPLACEMENT";
      else if (counted.length === 0) state = "NOT_STARTED";
      else if (!recap.final) state = "NEEDS_GRADING";
      else state = "FINAL";
      const basis = recap.basis;
      return {
        studentId: s.id, name: s.displayName, nis: s.nis, className: s.class?.name ?? "",
        attemptsUsed: as.filter((a) => !a.replacementGrantedAt).length,
        recap,
        earnedPoints: basis && basis.earnedCenti / 100,
        maxPoints: basis && basis.maxPoints,
        state,
        status: state === "NEEDS_GRADING" ? `${RECAP_STATE_LABEL[state]} – ${pending} uraian belum dinilai` : RECAP_STATE_LABEL[state],
        running: run ? { attemptId: run.id, deadlineAt: run.deadlineAt, answered: answeredBy.get(run.id) ?? 0, total: quiz._count.questions, helpRequestedAt: run.helpRequestedAt } : null,
        attempts: as.map((a) => {
          const submitted = a.status === "SUBMITTED";
          const sc = toScored(a);
          return {
            attemptId: a.id, attemptNumber: a.attemptNumber, status: a.status, replaced: a.replacementGrantedAt !== null,
            score: submitted ? attemptScore(sc.earnedCenti, sc.maxPoints) : null,
            pendingEssays: submitted ? a._count.answers : 0, startedAt: a.startedAt, submittedAt: a.submittedAt,
          };
        }),
        lastSubmittedAt: counted.reduce<Date | null>((m, a) => (a.submittedAt && (!m || a.submittedAt > m) ? a.submittedAt : m), null),
      };
    }),
  };
}

type KeyQuiz = ScoringQuiz & { maxAttempts: number; showFeedbackAfterRelease: boolean };
type KeyAttempt = Parameters<typeof toScored>[0];

// D6: the key stays hidden while this student is in, or may still start, another attempt on the same snapshot.
function maySeeKey(quiz: KeyQuiz, attempts: KeyAttempt[]): boolean {
  if (!quiz.resultsReleasedAt || !quiz.showFeedbackAfterRelease) return false;
  if (!attempts.some((a) => a.status === "SUBMITTED" && !a.replacementGrantedAt)) return false;
  if (attempts.some((a) => a.status === "IN_PROGRESS")) return false;
  const used = attempts.filter((a) => !a.replacementGrantedAt).length;
  return !(used < quiz.maxAttempts && retakeOpen(attempts.map(toScored), quiz));
}

const KEY_QUIZ = {
  scoringPolicy: true, kkm: true, resultsReleasedAt: true, maxAttempts: true, showFeedbackAfterRelease: true,
} as const;

/** For explanation images (F13): same rule as the key on the result page. */
export async function studentMaySeeKey(studentId: string, quizId: string): Promise<boolean> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { ...KEY_QUIZ, attempts: { where: { studentId }, select: SCORED_SELECT } },
  });
  return !!quiz && maySeeKey(quiz, quiz.attempts);
}

export type ResultAnswer = {
  number: number; points: number;
  question: QuestionSnapshot & { id: string };
  answer: StoredAnswer | null;
  earned: number | null; // null = essay not graded yet
  correct: boolean | null; // null for essays
  answerKey?: AnswerKeySnapshot["answerKey"]; explanation?: string | null; explanationImages?: ImageView[];
  feedback?: string | null;
};
export type ResultAttempt = {
  label: string; submittedAt: Date | null; final: boolean; score: number | null; answers: ResultAnswer[];
};
export type StudentResult = {
  quizTitle: string; scoringPolicy: ScoringPolicy; kkm: number | null;
  recap: number | null; passed: boolean | null; showKey: boolean; attempts: ResultAttempt[];
};

/** The only result shape a student gets. null (→ 404) before release, for other students, or with nothing submitted. */
export async function getStudentResult(studentId: string, quizId: string, now: Date = new Date()): Promise<StudentResult | null> {
  await finalizeExpiredAttempts({ quizId, studentId }, now);
  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, status: "PUBLISHED", resultsReleasedAt: { not: null } },
    select: {
      ...KEY_QUIZ, title: true,
      questions: {
        orderBy: { position: "asc" },
        select: {
          id: true, points: true, questionSnapshot: true, answerKeySnapshot: true,
          images: { where: { visibility: "EXPLANATION" }, select: { image: { select: IMAGE_VIEW } } },
        },
      },
      attempts: {
        where: { studentId },
        orderBy: { attemptNumber: "asc" },
        select: {
          ...SCORED_SELECT, submittedAt: true,
          answers: { select: { quizQuestionId: true, answer: true, objectivePoints: true, manualPoints: true, teacherFeedback: true } },
        },
      },
    },
  });
  if (!quiz) return null;
  const counted = quiz.attempts.filter((a) => a.status === "SUBMITTED" && !a.replacementGrantedAt);
  if (counted.length === 0) return null;
  const showKey = maySeeKey(quiz, quiz.attempts);
  const recap = computeRecap(quiz.attempts.map(toScored), quiz);
  return {
    quizTitle: quiz.title, scoringPolicy: quiz.scoringPolicy, kkm: quiz.kkm,
    recap: recap.final ? recap.recap : null, passed: recap.final ? recap.passed : null, showKey,
    attempts: counted.map((a) => {
      const sc = toScored(a);
      const final = a.gradingStatus === "FINAL";
      const byQ = new Map(a.answers.map((x) => [x.quizQuestionId, x]));
      return {
        label: quiz.scoringPolicy === "REMEDIAL" ? (a.slot === 1 ? "Percobaan utama" : `Remedial ${a.slot - 1}`) : `Percobaan ${a.slot}`,
        submittedAt: a.submittedAt,
        final,
        score: final ? attemptScore(sc.earnedCenti, sc.maxPoints) : null,
        answers: quiz.questions.map((q, i) => {
          const snap = q.questionSnapshot as QuestionSnapshot;
          const x = byQ.get(q.id);
          const essay = snap.type === "ESSAY";
          const earned = essay ? (x?.manualPoints?.toNumber() ?? null) : (x?.objectivePoints ?? 0);
          const out: ResultAnswer = {
            number: i + 1, points: q.points, question: { ...snap, id: q.id },
            answer: (x?.answer as StoredAnswer | null) ?? null,
            earned, correct: essay ? null : earned === q.points,
          };
          if (showKey) {
            const key = q.answerKeySnapshot as AnswerKeySnapshot;
            // The essay key is the teacher's rubric: always internal.
            if (!essay) out.answerKey = key.answerKey;
            out.explanation = key.explanation;
            out.explanationImages = q.images.map((m) => m.image);
            out.feedback = x?.teacherFeedback ?? null;
          }
          return out;
        }),
      };
    }),
  };
}
