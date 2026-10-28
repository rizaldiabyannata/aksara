import { z } from "zod";
import { prisma } from "@/lib/db";
import { QuizStatus, ScoringPolicy } from "@/lib/generated/prisma/enums";
import type { QuestionStatus, QuestionType } from "@/lib/generated/prisma/enums";
import { parse, required, optional, type Invalid, type NotFound } from "@/lib/validation";
import { uniqueViolation } from "@/lib/unique-violation";
import { writeAudit } from "@/lib/audit";
import { parseWitaInput } from "@/lib/format";
import { swapOrder } from "@/lib/subjects";

export type QuizRow = {
  id: string;
  title: string;
  subjectName: string;
  status: QuizStatus;
  questionCount: number;
  classNames: string[];
  updatedAt: Date;
};
export type QuizDetail = {
  id: string;
  title: string;
  instructions: string | null;
  subjectId: string;
  subjectName: string;
  durationMinutes: number;
  startsAt: Date | null;
  endsAt: Date | null;
  maxAttempts: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showFeedbackAfterRelease: boolean;
  scoringPolicy: ScoringPolicy;
  kkm: number | null;
  status: QuizStatus;
  publishedAt: Date | null;
  classIds: string[];
  questions: {
    id: string;
    questionId: string;
    position: number;
    points: number;
    type: QuestionType;
    prompt: string;
    status: QuestionStatus;
  }[];
  attemptCount: number;
};
export type PublishCheck = {
  questions: { status: QuestionStatus; points: number; type: QuestionType }[];
  endsAt: Date | null;
  scoringPolicy: ScoringPolicy;
  kkm: number | null;
  maxAttempts: number;
  activeClassCount: number;
};

type Result = { ok: true } | Invalid | NotFound;

const invalid = (key: string, message: string): Invalid => ({
  ok: false,
  error: "INVALID",
  fieldErrors: { [key]: message },
});
const NOT_FOUND: NotFound = { ok: false, error: "NOT_FOUND" };
const LOCKED_QUESTIONS = invalid("form", "Soal ulangan terkunci setelah terbit.");
const LOCK = "Bagian ini terkunci setelah ulangan terbit.";
const CLASS_LOCK = "Kelas tidak bisa dilepas setelah ulangan terbit.";
const NOT_ADDABLE = "Hanya soal aktif dari mata pelajaran ini yang bisa ditambahkan.";
const DUP = "Soal ini sudah ada di ulangan.";

// Form values arrive as strings: "1.5", "" and "0" must each fail for the right reason.
const intIn = (min: number, max: number, msg: string) =>
  z
    .string({ error: msg })
    .trim()
    .regex(/^\d+$/, { error: msg })
    .transform(Number)
    .refine((n) => n >= min && n <= max, { error: msg });
// Blank input means "not set" (null), for the optional fields.
const blank = <S extends z.ZodType>(s: S) =>
  z.preprocess((v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v), s.nullable());
const checkbox = z
  .enum(["on", ""], { error: "Pilihan tidak valid." })
  .optional()
  .transform((v) => v === "on");
const schedule = (msg: string) =>
  blank(
    z.string({ error: msg }).transform((s, ctx) => {
      const d = parseWitaInput(s);
      if (!d) ctx.addIssue({ code: "custom", message: msg });
      return d;
    }),
  );

const settingsShape = {
  title: required(150, "Judul wajib diisi, paling banyak 150 huruf."),
  instructions: optional(5000, "Petunjuk paling banyak 5.000 huruf."),
  durationMinutes: intIn(1, 300, "Durasi harus bilangan bulat 1 sampai 300 menit."),
  startsAt: schedule("Tanggal dan jam tidak valid."),
  endsAt: schedule("Tanggal dan jam tidak valid."),
  maxAttempts: intIn(1, 10, "Batas percobaan harus bilangan bulat 1 sampai 10."),
  shuffleQuestions: checkbox,
  shuffleOptions: checkbox,
  showFeedbackAfterRelease: checkbox,
  scoringPolicy: z
    .string({ error: "Pilih kebijakan nilai." })
    .refine((s) => Object.hasOwn(ScoringPolicy, s), { error: "Pilih kebijakan nilai." })
    .transform((s) => s as ScoringPolicy),
  kkm: blank(intIn(0, 100, "KKM harus bilangan bulat 0 sampai 100.")),
};
const REMEDIAL_MSG = "Kebijakan Remedial butuh KKM dan batas percobaan minimal 2.";

// Zod 4 cannot extend an object that has refinements, so both schemas share the shape.
const checkSettings = (
  d: { startsAt: Date | null; endsAt: Date | null; scoringPolicy: ScoringPolicy; kkm: number | null; maxAttempts: number },
  ctx: z.RefinementCtx,
) => {
  if (d.startsAt && d.endsAt && d.endsAt.getTime() <= d.startsAt.getTime()) {
    ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Jadwal selesai harus setelah jadwal mulai." });
  }
  if (d.scoringPolicy === "REMEDIAL" && (d.kkm === null || d.maxAttempts < 2)) {
    ctx.addIssue({ code: "custom", path: ["kkm"], message: REMEDIAL_MSG });
  }
};
const settingsSchema = z.object(settingsShape).superRefine(checkSettings);
const createSchema = z
  .object({
    subjectId: required(100, "Pilih mata pelajaran."),
    ...settingsShape,
  })
  .superRefine(checkSettings);

const sameTime = (a: Date | null, b: Date | null) => (a?.getTime() ?? null) === (b?.getTime() ?? null);

/** Reasons a draft cannot be published. Empty = publishable. `now` is injected so tests stay deterministic. */
export function validateForPublish(q: PublishCheck, now: Date): string[] {
  const out: string[] = [];
  if (q.questions.length === 0) out.push("Tambahkan minimal satu soal.");
  q.questions.forEach((x, i) => {
    if (x.status !== "ACTIVE") out.push(`Soal nomor ${i + 1} masih draf. Aktifkan dulu di bank soal.`);
  });
  const total = q.questions.reduce((sum, x) => sum + x.points, 0);
  if (q.questions.length > 0 && total <= 0) out.push("Total poin harus lebih dari 0.");
  if (q.endsAt && q.endsAt.getTime() <= now.getTime()) out.push("Jadwal selesai sudah lewat.");
  if (q.activeClassCount === 0) out.push("Pilih minimal satu kelas aktif.");
  if (q.scoringPolicy === "REMEDIAL" && (q.kkm === null || q.maxAttempts < 2)) out.push(REMEDIAL_MSG);
  return out;
}

export async function createQuiz(actorId: string, input: unknown): Promise<{ ok: true; id: string } | Invalid> {
  const p = parse(createSchema, input);
  if (!p.ok) return p;
  const { subjectId, ...settings } = p.data;
  return prisma.$transaction(async (tx) => {
    if (!(await tx.subject.findUnique({ where: { id: subjectId }, select: { id: true } }))) {
      return invalid("subjectId", "Pilih mata pelajaran.");
    }
    const q = await tx.quiz.create({
      data: { ...settings, subjectId, createdById: actorId },
      select: { id: true },
    });
    return { ok: true, id: q.id } as const;
  });
}

export async function updateQuiz(actorId: string, id: string, input: unknown): Promise<Result> {
  const p = parse(settingsSchema, input);
  if (!p.ok) return p;
  const d = p.data;
  return prisma.$transaction(async (tx): Promise<Result> => {
    const old = await tx.quiz.findUnique({
      where: { id },
      select: {
        status: true, durationMinutes: true, startsAt: true, endsAt: true, maxAttempts: true,
        shuffleQuestions: true, shuffleOptions: true, showFeedbackAfterRelease: true,
        scoringPolicy: true, kkm: true,
      },
    });
    if (!old) return NOT_FOUND;
    const fieldErrors: Record<string, string> = {};
    if (old.status === "PUBLISHED") {
      const locked: [string, boolean][] = [
        ["durationMinutes", old.durationMinutes !== d.durationMinutes],
        ["startsAt", !sameTime(old.startsAt, d.startsAt)],
        ["shuffleQuestions", old.shuffleQuestions !== d.shuffleQuestions],
        ["shuffleOptions", old.shuffleOptions !== d.shuffleOptions],
        ["showFeedbackAfterRelease", old.showFeedbackAfterRelease !== d.showFeedbackAfterRelease],
      ];
      for (const [field, changed] of locked) if (changed) fieldErrors[field] = LOCK;
      if (
        !sameTime(old.endsAt, d.endsAt) &&
        (old.endsAt === null || d.endsAt === null || d.endsAt.getTime() < old.endsAt.getTime())
      ) {
        fieldErrors.endsAt = "Setelah terbit, jadwal selesai hanya boleh diperpanjang.";
      }
      if (d.maxAttempts < old.maxAttempts) {
        fieldErrors.maxAttempts = "Setelah terbit, batas percobaan hanya boleh dinaikkan.";
      }
    }
    if (Object.keys(fieldErrors).length) return { ok: false, error: "INVALID", fieldErrors };

    await tx.quiz.update({ where: { id }, data: d });
    if (old.scoringPolicy !== d.scoringPolicy || old.kkm !== d.kkm) {
      await writeAudit(tx, {
        actorUserId: actorId,
        action: "QUIZ_SCORING_CHANGED",
        entityType: "Quiz",
        entityId: id,
        metadata: { fromPolicy: old.scoringPolicy, toPolicy: d.scoringPolicy, fromKkm: old.kkm, toKkm: d.kkm },
      });
    }
    return { ok: true };
  });
}

/** Draft: replace all classes (at least one). Published: only add. Unknown class ids are ignored. */
export async function setQuizClasses(id: string, classIds: string[]): Promise<Result> {
  const ids = [...new Set(classIds)];
  return prisma.$transaction(async (tx): Promise<Result> => {
    const quiz = await tx.quiz.findUnique({ where: { id }, select: { status: true } });
    if (!quiz) return NOT_FOUND;
    const known = (await tx.class.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((c) => c.id);
    if (quiz.status === "PUBLISHED") {
      const current = await tx.quizClass.findMany({ where: { quizId: id }, select: { classId: true } });
      if (current.some((c) => !known.includes(c.classId))) return invalid("classIds", CLASS_LOCK);
      await tx.quizClass.createMany({
        data: known.map((classId) => ({ quizId: id, classId })),
        skipDuplicates: true,
      });
      return { ok: true };
    }
    if (known.length === 0) return invalid("classIds", "Pilih minimal satu kelas.");
    await tx.quizClass.deleteMany({ where: { quizId: id } });
    await tx.quizClass.createMany({ data: known.map((classId) => ({ quizId: id, classId })) });
    return { ok: true };
  });
}

/** Adds an ACTIVE question of the quiz's subject. Position = max + 1; points = the question's default. */
export async function addQuizQuestion(id: string, questionId: string): Promise<Result> {
  try {
    return await prisma.$transaction(async (tx): Promise<Result> => {
      const quiz = await tx.quiz.findUnique({ where: { id }, select: { status: true, subjectId: true } });
      if (!quiz) return NOT_FOUND;
      if (quiz.status === "PUBLISHED") return LOCKED_QUESTIONS;
      const q = await tx.question.findUnique({
        where: { id: questionId },
        select: { status: true, defaultPoints: true, chapter: { select: { subjectId: true } } },
      });
      if (!q || q.status !== "ACTIVE" || q.chapter.subjectId !== quiz.subjectId) {
        return invalid("questionId", NOT_ADDABLE);
      }
      const last = await tx.quizQuestion.aggregate({ where: { quizId: id }, _max: { position: true } });
      await tx.quizQuestion.create({
        data: { quizId: id, questionId, position: (last._max.position ?? 0) + 1, points: q.defaultPoints },
      });
      return { ok: true };
    });
  } catch (e) {
    if (uniqueViolation(e, { QuizQuestion_quizId_questionId_key: "dup" })) {
      return invalid("questionId", DUP);
    }
    throw e;
  }
}

export async function removeQuizQuestion(id: string, quizQuestionId: string): Promise<Result> {
  return prisma.$transaction(async (tx): Promise<Result> => {
    const quiz = await tx.quiz.findUnique({ where: { id }, select: { status: true } });
    if (!quiz) return NOT_FOUND;
    if (quiz.status === "PUBLISHED") return LOCKED_QUESTIONS;
    const cur = await tx.quizQuestion.findFirst({
      where: { id: quizQuestionId, quizId: id },
      select: { position: true },
    });
    if (!cur) return NOT_FOUND;
    await tx.quizQuestion.delete({ where: { id: quizQuestionId } });
    // Ascending order: each row moves into the slot the previous one just vacated (unique position).
    const later = await tx.quizQuestion.findMany({
      where: { quizId: id, position: { gt: cur.position } },
      orderBy: { position: "asc" },
      select: { id: true, position: true },
    });
    for (const r of later) {
      await tx.quizQuestion.update({ where: { id: r.id }, data: { position: r.position - 1 } });
    }
    return { ok: true };
  });
}

export async function moveQuizQuestion(id: string, quizQuestionId: string, dir: "up" | "down"): Promise<Result> {
  if (dir !== "up" && dir !== "down") return { ok: true };
  return prisma.$transaction(async (tx): Promise<Result> => {
    const quiz = await tx.quiz.findUnique({ where: { id }, select: { status: true } });
    if (!quiz) return NOT_FOUND;
    if (quiz.status === "PUBLISHED") return LOCKED_QUESTIONS;
    const cur = await tx.quizQuestion.findFirst({
      where: { id: quizQuestionId, quizId: id },
      select: { id: true, position: true },
    });
    if (!cur) return NOT_FOUND;
    const nb = await tx.quizQuestion.findFirst({
      where: { quizId: id, position: dir === "up" ? { lt: cur.position } : { gt: cur.position } },
      orderBy: { position: dir === "up" ? "desc" : "asc" },
      select: { id: true, position: true },
    });
    if (nb) {
      await swapOrder({ id: cur.id, order: cur.position }, { id: nb.id, order: nb.position }, (i, position) =>
        tx.quizQuestion.update({ where: { id: i }, data: { position } }),
      );
    }
    return { ok: true };
  });
}

export async function setQuizQuestionPoints(id: string, quizQuestionId: string, points: unknown): Promise<Result> {
  const p = parse(
    z.object({
      points: z
        .string({ error: "Poin harus bilangan bulat 1 sampai 100." })
        .trim()
        .regex(/^\d+$/, { error: "Poin harus bilangan bulat 1 sampai 100." })
        .transform(Number)
        .refine((n) => n >= 1 && n <= 100, { error: "Poin harus bilangan bulat 1 sampai 100." }),
    }),
    { points },
  );
  if (!p.ok) return p;
  return prisma.$transaction(async (tx): Promise<Result> => {
    const quiz = await tx.quiz.findUnique({ where: { id }, select: { status: true } });
    if (!quiz) return NOT_FOUND;
    if (quiz.status === "PUBLISHED") return LOCKED_QUESTIONS;
    const qq = await tx.quizQuestion.findFirst({ where: { id: quizQuestionId, quizId: id }, select: { id: true } });
    if (!qq) return NOT_FOUND;
    await tx.quizQuestion.update({ where: { id: quizQuestionId }, data: { points: p.data.points } });
    return { ok: true };
  });
}

export async function listQuizzes(): Promise<QuizRow[]> {
  const rows = await prisma.quiz.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
      subject: { select: { name: true } },
      _count: { select: { questions: true } },
      classes: { orderBy: { class: { name: "asc" } }, select: { class: { select: { name: true } } } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    subjectName: r.subject.name,
    status: r.status,
    questionCount: r._count.questions,
    classNames: r.classes.map((c) => c.class.name),
    updatedAt: r.updatedAt,
  }));
}

export async function getQuizForTeacher(id: string): Promise<QuizDetail | null> {
  const r = await prisma.quiz.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      instructions: true,
      subjectId: true,
      subject: { select: { name: true } },
      durationMinutes: true,
      startsAt: true,
      endsAt: true,
      maxAttempts: true,
      shuffleQuestions: true,
      shuffleOptions: true,
      showFeedbackAfterRelease: true,
      scoringPolicy: true,
      kkm: true,
      status: true,
      publishedAt: true,
      classes: { select: { classId: true } },
      questions: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          questionId: true,
          position: true,
          points: true,
          question: { select: { type: true, prompt: true, status: true } },
        },
      },
      _count: { select: { attempts: true } },
    },
  });
  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    instructions: r.instructions,
    subjectId: r.subjectId,
    subjectName: r.subject.name,
    durationMinutes: r.durationMinutes,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    maxAttempts: r.maxAttempts,
    shuffleQuestions: r.shuffleQuestions,
    shuffleOptions: r.shuffleOptions,
    showFeedbackAfterRelease: r.showFeedbackAfterRelease,
    scoringPolicy: r.scoringPolicy,
    kkm: r.kkm,
    status: r.status,
    publishedAt: r.publishedAt,
    classIds: r.classes.map((c) => c.classId),
    questions: r.questions.map((q) => ({
      id: q.id,
      questionId: q.questionId,
      position: q.position,
      points: q.points,
      type: q.question.type,
      prompt: q.question.prompt,
      status: q.question.status,
    })),
    attemptCount: r._count.attempts,
  };
}
