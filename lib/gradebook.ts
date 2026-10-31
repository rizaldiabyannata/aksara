import "server-only";
import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { finalizeExpiredAttempts, GRACE_MS, toScored } from "@/lib/attempts";
import { NO_CHAPTER } from "@/lib/evaluation";
import { computeRecap, attemptScore } from "@/lib/scoring";
import { parseWitaInput } from "@/lib/format";
import { GradebookError, checkGradeRows, MAX_GRADE_QUIZZES, type GradeFilters } from "@/lib/gradebook-filters";

export async function countGradeFragments(tx: Prisma.TransactionClient, quizIds: string[], studentIds: string[]) {
  const ids = studentIds.length ? Prisma.join(studentIds) : Prisma.sql`NULL`;
  // Remove only whitespace outside JSON strings, preserving whitespace/escapes inside values.
  const jsonPattern = '("(?:[^"\\\\]|\\\\.)*")|[[:space:]]+';
  const [result] = await tx.$queryRaw<{ fragments: bigint }[]>(Prisma.sql`
    WITH qs AS (SELECT * FROM "QuizQuestion" WHERE "quizId" IN (${Prisma.join(quizIds)})),
    ats AS (SELECT * FROM "QuizAttempt" WHERE "quizId" IN (${Prisma.join(quizIds)}) AND "studentId" IN (${ids})),
    counts AS (SELECT "quizId", COUNT(*) AS n FROM ats GROUP BY "quizId"),
    fields(content, is_json, repeats) AS (
      SELECT "questionSnapshot"::text, true, 1::bigint FROM qs
      UNION ALL SELECT "answerKeySnapshot"::text, true, 1 FROM qs
      UNION ALL SELECT "questionSnapshot"->>'prompt', false, 1 FROM qs
      UNION ALL SELECT "answerKeySnapshot"->>'explanation', false, 1 FROM qs
      UNION ALL SELECT (SELECT string_agg((o->>'id') || ': ' || (o->>'text'), E'\n') FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof("questionSnapshot"->'options') = 'array' THEN "questionSnapshot"->'options' ELSE '[]'::jsonb END) o), false, 1 FROM qs
      UNION ALL SELECT CASE "questionSnapshot"->>'type'
        WHEN 'ESSAY' THEN "answerKeySnapshot"->'answerKey'->>'rubric'
        WHEN 'SHORT_ANSWER' THEN (SELECT string_agg(v, '; ') FROM jsonb_array_elements_text(
          CASE WHEN jsonb_typeof("answerKeySnapshot"->'answerKey'->'accepted') = 'array' THEN "answerKeySnapshot"->'answerKey'->'accepted' ELSE '[]'::jsonb END) v)
        ELSE '' END, false, 1 + COALESCE(counts.n, 0) FROM qs LEFT JOIN counts USING ("quizId")
      UNION ALL SELECT a.answer::text, true, 1 FROM "AttemptAnswer" a JOIN ats ON ats.id = a."attemptId"
      UNION ALL SELECT a.answer->>'text', false, 1 FROM "AttemptAnswer" a JOIN ats ON ats.id = a."attemptId"
      UNION ALL SELECT a."teacherFeedback", false, 1 FROM "AttemptAnswer" a JOIN ats ON ats.id = a."attemptId"
      UNION ALL SELECT "questionOrder"::text, true, 1 FROM ats
      UNION ALL SELECT "optionOrder"::text, true, 1 FROM ats
      UNION ALL SELECT "replacementReason", false, 1 FROM ats
      UNION ALL SELECT jsonb_agg(jsonb_build_object('visibility', qi.visibility, 'image', jsonb_build_object(
        'id', i.id, 'altText', i."altText", 'caption', i.caption, 'sourceReference', i."sourceReference", 'width', i.width, 'height', i.height)))::text, true, 1
        FROM "QuizQuestionImage" qi JOIN qs ON qs.id = qi."quizQuestionId" JOIN "Image" i ON i.id = qi."imageId" GROUP BY qs.id
    ), texts AS (
      SELECT COALESCE(CASE WHEN is_json THEN regexp_replace(content, ${jsonPattern}, ${"\\1"}, 'g') ELSE content END, '') AS value, repeats FROM fields
    ), sizes AS (
      SELECT length(value) + length(regexp_replace(value COLLATE "C", ${"[\u0001-\uFFFF]"}, '', 'g')) AS units, repeats FROM texts
    ) SELECT COALESCE(SUM(CASE WHEN units > 30000 THEN ceil(units / 4500.0) * repeats ELSE 0 END), 0)::bigint AS fragments FROM sizes`);
  return Number(result.fragments);
}

export const GRADE_STATE = {
  NOT_ASSIGNED: "Tidak ditugaskan", NOT_STARTED: "Belum mengerjakan", IN_PROGRESS: "Sedang mengerjakan",
  WAITING_REPLACEMENT: "Menunggu pengganti", NEEDS_GRADING: "Perlu dinilai", FINAL: "Final",
} as const;
export type GradeState = keyof typeof GRADE_STATE;
const studentSelect = { id: true, displayName: true, nis: true, studentNo: true, isActive: true, classId: true, class: { select: { name: true } } } as const;
const quizSelect = {
  id: true, title: true, subjectId: true, subject: { select: { name: true } }, kind: true,
  startsAt: true, endsAt: true, publishedAt: true, resultsReleasedAt: true, resultsReleasedById: true,
  createdAt: true, updatedAt: true, createdById: true, durationMinutes: true, maxAttempts: true,
  scoringPolicy: true, kkm: true, instructions: true, shuffleQuestions: true, shuffleOptions: true,
  showFeedbackAfterRelease: true, status: true,
  classes: { select: { classId: true, class: { select: { name: true } } } },
  _count: { select: { questions: true } },
} as const;
export type GradeStudent = Prisma.UserGetPayload<{ select: typeof studentSelect }>;
export type GradeQuiz = Prisma.QuizGetPayload<{ select: typeof quizSelect }>;
export type GradeCell = {
  quizId: string; state: GradeState; score: number | null; passed: boolean | null;
  primary: number | null; highest: number | null; earned: number | null; max: number | null;
  attemptsUsed: number; lastSubmittedAt: Date | null; basisId: string | null;
  attempts: { id: string; attemptNumber: number; status: string; replaced: boolean; score: number | null; startedAt: Date; submittedAt: Date | null }[];
};
export type GradeRow = { student: GradeStudent; cells: GradeCell[]; average: number | null; counted: number; passed: number; failed: number };
export type GradeGroup = { classId: string | null; className: string; subjectId: string; subjectName: string; kind: GradeQuiz["kind"]; quizzes: GradeQuiz[]; rows: GradeRow[] };

function quizWhere(f: GradeFilters): Prisma.QuizWhereInput {
  const range: Prisma.DateTimeNullableFilter = {};
  if (f.from) range.gte = parseWitaInput(`${f.from}T00:00`)!;
  if (f.to) range.lt = new Date(parseWitaInput(`${f.to}T00:00`)!.getTime() + 86400_000);
  return {
    status: "PUBLISHED",
    ...(f.classIds?.length ? { classes: { some: { classId: { in: f.classIds } } } } : {}),
    ...(f.subjectIds?.length ? { subjectId: { in: f.subjectIds } } : {}),
    ...(f.quizIds?.length ? { id: { in: f.quizIds } } : {}), ...(f.kind ? { kind: f.kind } : {}),
    ...((f.from || f.to) ? { OR: [{ startsAt: range }, { startsAt: null, publishedAt: range }] } : {}),
  };
}

/** Called only behind a teacher guard. One consistent read, with keys kept in this server-only module. */
export async function getGradebook(filters: GradeFilters, options: { now?: Date; full?: boolean } = {}) {
  const now = options.now ?? new Date(), full = options.full ?? false;
  const where = quizWhere(filters);
  const candidates = await prisma.quiz.findMany({ where, select: { id: true }, take: MAX_GRADE_QUIZZES + 1 });
  if (candidates.length > MAX_GRADE_QUIZZES) throw new GradebookError("Lebih dari 100 ulangan. Persempit tanggal, mapel, atau pilihan ulangan.", 422);
  // One lookup avoids up to 100 empty round trips on remote databases; the domain still owns grading.
  const expired = await prisma.quizAttempt.findMany({
    where: { quizId: { in: candidates.map((q) => q.id) }, status: "IN_PROGRESS", deadlineAt: { lte: new Date(now.getTime() - GRACE_MS) } },
    distinct: ["quizId"], select: { quizId: true },
  });
  for (const q of expired) await finalizeExpiredAttempts({ quizId: q.quizId }, now);
  return prisma.$transaction(async (tx) => {
    const quizzes = await tx.quiz.findMany({ where: { AND: [where, { id: { in: candidates.map((q) => q.id) } }] }, select: quizSelect, orderBy: [{ startsAt: "asc" }, { publishedAt: "asc" }, { id: "asc" }] });
    const quizIds = quizzes.map((q) => q.id);
    const classIds = filters.classIds?.length ? filters.classIds : [...new Set(quizzes.flatMap((q) => q.classes.map((c) => c.classId)))];
    const studentWhere: Prisma.UserWhereInput = {
      role: "STUDENT", AND: [
        { OR: [{ isActive: true, classId: { in: classIds } }, ...(filters.includeHistory ? [{ quizAttempts: { some: { quizId: { in: quizIds } } } }] : [])] },
        ...(filters.q ? [{ OR: ["displayName", "nis", "studentNo"].map((key) => ({ [key]: { contains: filters.q, mode: "insensitive" } })) }] : []),
      ],
    };
    const studentCount = await tx.user.count({ where: studentWhere });
    checkGradeRows(studentCount * quizzes.length);
    const students = await tx.user.findMany({ where: studentWhere, select: studentSelect, orderBy: [{ class: { name: "asc" } }, { displayName: "asc" }, { id: "asc" }] });
    const studentIds = students.map((s) => s.id);
    const attemptWhere = { quizId: { in: quizIds }, studentId: { in: studentIds } };
    const dimensions = new Set(quizzes.map((q) => `${q.subjectId}:${q.kind}`)).size;
    const groupCount = new Set(students.map((s) => s.classId)).size * dimensions;
    const summaryRows = 12 + 2 * groupCount + studentCount * dimensions;
    checkGradeRows(summaryRows);
    // Counts and small metadata precede materializing answers/snapshots, even with an empty roster.
    if (full && quizIds.length) {
      const metadata = await tx.quizQuestion.findMany({ where: { quizId: { in: quizIds } }, select: { quizId: true, chapterSnapshot: true, levelSnapshot: true } });
      const counts = await tx.quizAttempt.groupBy({ by: ["quizId"], where: attemptWhere, _count: { _all: true } });
      const processRows = await tx.quizAttempt.findMany({ where: attemptWhere, select: { quizId: true, studentId: true, slot: true, status: true, gradingStatus: true, replacementGrantedAt: true, replacedBy: { select: { id: true } } } });
      const eligible = new Map<string, number>();
      for (const as of Map.groupBy(processRows, (a) => `${a.quizId}:${a.studentId}`).values()) {
        const counted = as.filter((a) => a.status === "SUBMITTED" && !a.replacementGrantedAt);
        const q = quizzes.find((q) => q.id === as[0].quizId)!;
        if (!counted.length || counted.some((a) => a.gradingStatus !== "FINAL") || as.some((a) => a.status === "IN_PROGRESS" || (a.replacementGrantedAt && !a.replacedBy))) continue;
        if (q.scoringPolicy === "REMEDIAL" && q.kkm !== null && !counted.some((a) => a.slot === 1)) continue;
        eligible.set(q.id, (eligible.get(q.id) ?? 0) + 1);
      }
      const evaluationRows = quizzes.reduce((n, q) => {
        const qs = metadata.filter((m) => m.quizId === q.id);
        const count = eligible.get(q.id) ?? 0;
        return n + (count ? qs.length : 0) + count * (new Set(qs.map((m) => m.chapterSnapshot ?? NO_CHAPTER)).size + new Set(qs.flatMap((m) => m.levelSnapshot ? [m.levelSnapshot] : [])).size);
      }, 0);
      const estimate = summaryRows + 7 + studentCount * quizzes.length + quizzes.length + metadata.length + evaluationRows
        + counts.reduce((n, c) => n + c._count._all * (1 + (quizzes.find((q) => q.id === c.quizId)!._count.questions)), 0);
      checkGradeRows(estimate);
      const fragments = await countGradeFragments(tx, quizIds, studentIds);
      checkGradeRows(estimate + fragments + (fragments ? 1 : 0));
    }
    const attempts = await tx.quizAttempt.findMany({
      where: attemptWhere, orderBy: [{ studentId: "asc" }, { attemptNumber: "asc" }],
      select: {
        id: true, quizId: true, studentId: true, slot: true, status: true, gradingStatus: true, maxPoints: true,
        objectiveScore: true, attemptNumber: true, startedAt: true, deadlineAt: true, submittedAt: true,
        submitReason: true, replacementGrantedAt: true, replacementGrantedById: true, replacementReason: true,
        replacesAttemptId: true, replacedBy: { select: { id: true } }, helpRequestedAt: true, createdAt: true, updatedAt: true,
        questionOrder: full, optionOrder: full,
        answers: { select: {
          manualPoints: true, quizQuestionId: true, objectivePoints: true, id: full,
          answer: full, teacherFeedback: full, gradedById: full, gradedAt: full, savedAt: full,
          gradedBy: full ? { select: { displayName: true } } : false,
        } },
      },
    });
    const questions = full ? await tx.quizQuestion.findMany({
      where: { quizId: { in: quizIds } }, orderBy: [{ quizId: "asc" }, { position: "asc" }],
      include: { images: { select: { visibility: true, image: { select: { id: true, altText: true, caption: true, sourceReference: true, width: true, height: true } } } } },
    }) : [];
    const byPair = new Map<string, typeof attempts>();
    for (const a of attempts) {
      const key = `${a.studentId}:${a.quizId}`;
      const list = byPair.get(key) ?? []; list.push(a); byPair.set(key, list);
    }
    const groups: GradeGroup[] = [];
    const classes = Map.groupBy(students, (s) => s.classId);
    const subjects = Map.groupBy(quizzes, (q) => `${q.subjectId}:${q.kind}`);
    for (const [classId, roster] of classes) for (const qs of subjects.values()) {
      const rows: GradeRow[] = roster.map((student) => {
        const cells: GradeCell[] = qs.map((q) => {
          const as = byPair.get(`${student.id}:${q.id}`) ?? [];
          const scored = as.map(toScored), recap = computeRecap(scored, q);
          const assigned = as.length > 0 || q.classes.some((c) => c.classId === student.classId);
          const state: GradeState = !assigned ? "NOT_ASSIGNED" : as.some((a) => a.status === "IN_PROGRESS") ? "IN_PROGRESS"
            : as.some((a) => a.replacementGrantedAt && !a.replacedBy) ? "WAITING_REPLACEMENT"
            : !as.some((a) => a.status === "SUBMITTED" && !a.replacementGrantedAt) ? "NOT_STARTED"
            : !recap.final ? "NEEDS_GRADING" : "FINAL";
          const final = state === "FINAL";
          const basisIndex = recap.basis ? scored.indexOf(recap.basis) : -1;
          return {
            quizId: q.id, state, score: final ? recap.recap : null, passed: final ? recap.passed : null,
            primary: final ? recap.primary : null, highest: final ? recap.highest : null,
            earned: final && recap.basis ? recap.basis.earnedCenti / 100 : null, max: final ? recap.basis?.maxPoints ?? null : null,
            basisId: final && basisIndex >= 0 ? as[basisIndex].id : null,
            attemptsUsed: as.filter((a) => !a.replacementGrantedAt).length,
            lastSubmittedAt: as.filter((a) => !a.replacementGrantedAt).reduce<Date | null>((m, a) => a.submittedAt && (!m || a.submittedAt > m) ? a.submittedAt : m, null),
            attempts: as.map((a, i) => ({ id: a.id, attemptNumber: a.attemptNumber, status: a.status, replaced: !!a.replacementGrantedAt, score: a.status === "SUBMITTED" ? attemptScore(scored[i].earnedCenti, a.maxPoints) : null, startedAt: a.startedAt, submittedAt: a.submittedAt })),
          };
        });
        const counted = cells.filter((c) => c.score !== null);
        return { student, cells, counted: counted.length, average: counted.length ? counted.reduce((n, c) => n + c.score!, 0) / counted.length : null, passed: cells.filter((c) => c.passed === true).length, failed: cells.filter((c) => c.passed === false).length };
      });
      groups.push({ classId, className: roster[0].class?.name ?? "Tanpa kelas", subjectId: qs[0].subjectId, subjectName: qs[0].subject.name, kind: qs[0].kind, quizzes: qs, rows });
    }
    return { filters, capturedAt: now, full, quizzes, students, groups, attempts, questions };
  }, { isolationLevel: "RepeatableRead", timeout: 60_000 });
}
export type Gradebook = Awaited<ReturnType<typeof getGradebook>>;

export async function getGradeOptions(filters: GradeFilters) {
  const [classes, subjects, quizzes] = await Promise.all([
    prisma.class.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.subject.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.quiz.findMany({ where: quizWhere({ ...filters, quizIds: [] }), select: { id: true, title: true }, orderBy: [{ title: "asc" }, { id: "asc" }] }),
  ]);
  return { classes, subjects, quizzes };
}
