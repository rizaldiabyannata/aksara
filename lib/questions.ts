import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parse, required, optional, type Invalid, type NotFound } from "@/lib/validation";
import { writeAudit } from "@/lib/audit";
import { extractImageIds } from "@/lib/images";
import { normalizeShortAnswer } from "@/lib/grading";
import { copyObject, deleteImage } from "@/lib/storage";
import { Prisma } from "@/lib/generated/prisma/client";
import type { Difficulty, QuestionStatus, QuestionType } from "@/lib/generated/prisma/enums";
import type { ImageView } from "@/lib/materials";

export type Option = { id: string; text: string };
export type QuestionContent =
  | { type: "SINGLE_CHOICE"; options: Option[]; answerKey: { optionId: string } }
  | { type: "TRUE_FALSE"; options: null; answerKey: { value: boolean } }
  | { type: "MULTIPLE_SELECT"; options: Option[]; answerKey: { optionIds: string[] } }
  | { type: "SHORT_ANSWER"; options: null; answerKey: { accepted: string[]; caseSensitive: boolean } }
  | { type: "ESSAY"; options: null; answerKey: { rubric: string | null } };
export type QuestionDetail = QuestionContent & {
  id: string;
  chapterId: string;
  subchapterId: string | null;
  subjectName: string;
  chapterTitle: string;
  subchapterTitle: string | null;
  prompt: string;
  explanation: string | null;
  defaultPoints: number;
  difficulty: Difficulty;
  status: QuestionStatus;
  sourceReference: string | null;
  verificationNote: string | null;
  images: ImageView[];
  updatedAt: Date;
};
export type PublicQuestion = {
  id: string;
  type: QuestionType;
  prompt: string;
  options: Option[] | null;
  images: ImageView[];
};
export type QuestionRow = {
  id: string;
  type: QuestionType;
  difficulty: Difficulty;
  status: QuestionStatus;
  prompt: string;
  defaultPoints: number;
  chapterTitle: string;
  subjectName: string;
  updatedAt: Date;
};
export type QuestionFilter = {
  subjectId?: string;
  chapterId?: string;
  subchapterId?: string;
  type?: QuestionType;
  difficulty?: Difficulty;
  status?: QuestionStatus;
  q?: string;
  page?: number;
};

const PAGE_SIZE = 50;
const FOREIGN_IMAGE = "Ada kode gambar yang bukan milik soal ini. Pakai tombol Salin kode sisip.";

const base = {
  chapterId: required(100, "Pilih bab dulu."),
  subchapterId: optional(100, "Subbab tidak valid."),
  prompt: required(5000, "Teks soal wajib diisi, paling banyak 5.000 huruf."),
  explanation: optional(5000, "Paling banyak 5.000 huruf."),
  defaultPoints: z.coerce
    .number({ error: "Poin harus bilangan bulat 1 sampai 100." })
    .int({ error: "Poin harus bilangan bulat 1 sampai 100." })
    .min(1, { error: "Poin harus bilangan bulat 1 sampai 100." })
    .max(100, { error: "Poin harus bilangan bulat 1 sampai 100." }),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"], { error: "Pilih tingkat kesulitan." }),
  sourceReference: optional(200, "Sumber paling banyak 200 huruf."),
  verificationNote: optional(5000, "Paling banyak 5.000 huruf."),
};

const optionSchema = z.object({
  id: z.string().regex(/^[a-h]$/),
  text: required(1000, "Teks opsi paling banyak 1.000 huruf."),
});
const optionsOf = (min: number, max: number) =>
  z.array(optionSchema, { error: `Isi ${min} sampai ${max} opsi.` });

// Issues go on top-level paths (D14): the form shows them per block.
type Ctx = z.RefinementCtx;
const bad = (ctx: Ctx, path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });

function checkOptions(o: Option[], min: number, max: number, ctx: Ctx) {
  if (o.length < min || o.length > max) return bad(ctx, "options", `Isi ${min} sampai ${max} opsi.`);
  if (new Set(o.map((x) => x.id)).size !== o.length) return bad(ctx, "options", "Opsi tidak valid.");
  if (new Set(o.map((x) => x.text)).size !== o.length) bad(ctx, "options", "Teks opsi tidak boleh sama.");
}

const SHORT_MSG = "Isi 1 sampai 10 jawaban yang diterima, satu per baris.";
const questionSchema = z.discriminatedUnion(
  "type",
  [
    z
      .object({
        ...base,
        type: z.literal("SINGLE_CHOICE"),
        options: optionsOf(2, 6),
        answerKey: z.object({ optionId: z.string() }, { error: "Pilih satu jawaban benar dari opsi yang terisi." }),
      })
      .superRefine((d, ctx) => {
        checkOptions(d.options, 2, 6, ctx);
        if (!d.options.some((o) => o.id === d.answerKey.optionId)) {
          bad(ctx, "answerKey", "Pilih satu jawaban benar dari opsi yang terisi.");
        }
      }),
    z.object({
      ...base,
      type: z.literal("TRUE_FALSE"),
      answerKey: z.object({ value: z.boolean({ error: "Pilih Benar atau Salah." }) }, { error: "Pilih Benar atau Salah." }),
    }),
    z
      .object({
        ...base,
        type: z.literal("MULTIPLE_SELECT"),
        options: optionsOf(3, 8),
        answerKey: z.object(
          { optionIds: z.array(z.string()) },
          { error: "Tandai minimal satu jawaban benar, tetapi jangan semuanya." },
        ),
      })
      .superRefine((d, ctx) => {
        checkOptions(d.options, 3, 8, ctx);
        const ids = new Set(d.options.map((o) => o.id));
        const keys = new Set(d.answerKey.optionIds);
        if (keys.size < 1 || keys.size >= ids.size || [...keys].some((k) => !ids.has(k))) {
          bad(ctx, "answerKey", "Tandai minimal satu jawaban benar, tetapi jangan semuanya.");
        }
      }),
    z
      .object({
        ...base,
        type: z.literal("SHORT_ANSWER"),
        answerKey: z.object(
          {
            accepted: z.array(z.string({ error: SHORT_MSG }).trim().max(200, { error: "Setiap jawaban paling banyak 200 huruf." }), {
              error: SHORT_MSG,
            }),
            caseSensitive: z.boolean().default(false),
          },
          { error: SHORT_MSG },
        ),
      })
      .superRefine((d, ctx) => {
        const { accepted, caseSensitive } = d.answerKey;
        const norm = accepted.map((a) => normalizeShortAnswer(a, caseSensitive));
        if (accepted.length < 1 || accepted.length > 10 || norm.some((n) => !n)) return bad(ctx, "answerKey", SHORT_MSG);
        if (new Set(norm).size !== norm.length) bad(ctx, "answerKey", "Ada jawaban diterima yang sama.");
      }),
    z.object({
      ...base,
      type: z.literal("ESSAY"),
      answerKey: z.object({ rubric: optional(5000, "Paling banyak 5.000 huruf.") }).prefault({}),
    }),
  ],
  { error: "Pilih tipe soal." },
);
type QuestionInput = z.infer<typeof questionSchema>;

// Fixed order: metadata.fields of QUESTION_UPDATED follows this list.
const FIELDS = [
  "chapterId", "subchapterId", "prompt", "options", "answerKey",
  "explanation", "defaultPoints", "difficulty", "sourceReference", "verificationNote",
] as const;

// jsonb does not keep key order, so compare with sorted keys.
const canon = (v: unknown) =>
  JSON.stringify(v ?? null, (_, x) =>
    x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort()) : x,
  );
const optionsOfInput = (d: QuestionInput) => ("options" in d ? d.options : null);
const fieldValue = (d: Record<string, unknown>, f: (typeof FIELDS)[number]) => d[f];

/** Validates chapter, subchapter and image references. `questionId` null = create (no images yet). */
async function checkRefs(
  tx: Prisma.TransactionClient,
  d: QuestionInput,
  questionId: string | null,
): Promise<Invalid | null> {
  const fieldErrors: Record<string, string> = {};
  if (!(await tx.chapter.findUnique({ where: { id: d.chapterId }, select: { id: true } }))) {
    fieldErrors.chapterId = "Bab tidak ditemukan.";
  } else if (
    d.subchapterId &&
    !(await tx.subchapter.findFirst({
      where: { id: d.subchapterId, chapterId: d.chapterId },
      select: { id: true },
    }))
  ) {
    fieldErrors.subchapterId = "Subbab harus dari bab yang dipilih.";
  }
  const own = new Set(
    questionId
      ? (await tx.image.findMany({ where: { questionId }, select: { id: true } })).map((i) => i.id)
      : [],
  );
  const foreign = (s: string) => extractImageIds(s).some((id) => !own.has(id));
  if (foreign(d.prompt)) fieldErrors.prompt = FOREIGN_IMAGE;
  if (foreign(d.explanation ?? "")) fieldErrors.explanation = FOREIGN_IMAGE;
  if ((optionsOfInput(d) ?? []).some((o) => foreign(o.text))) fieldErrors.options ??= FOREIGN_IMAGE;
  return Object.keys(fieldErrors).length ? { ok: false, error: "INVALID", fieldErrors } : null;
}

const toData = (d: QuestionInput) => ({
  ...d,
  options: optionsOfInput(d) ?? Prisma.DbNull,
});

export async function createQuestion(
  actorId: string,
  input: unknown,
): Promise<{ ok: true; id: string } | Invalid> {
  const p = parse(questionSchema, input);
  if (!p.ok) return p;
  return prisma.$transaction(async (tx) => {
    const badRefs = await checkRefs(tx, p.data, null);
    if (badRefs) return badRefs;
    const q = await tx.question.create({
      data: { ...toData(p.data), createdById: actorId, updatedById: actorId },
      select: { id: true },
    });
    return { ok: true, id: q.id } as const;
  });
}

export async function updateQuestion(
  actorId: string,
  id: string,
  input: unknown,
): Promise<{ ok: true } | Invalid | NotFound> {
  const p = parse(questionSchema, input);
  if (!p.ok) return p;
  return prisma.$transaction(async (tx) => {
    const old = await tx.question.findUnique({ where: { id } });
    if (!old) return { ok: false, error: "NOT_FOUND" } as const;
    if (old.type !== p.data.type) {
      return { ok: false, error: "INVALID", fieldErrors: { type: "Tipe soal tidak bisa diubah." } } as const;
    }
    const badRefs = await checkRefs(tx, p.data, id);
    if (badRefs) return badRefs;
    const next = { ...p.data, options: optionsOfInput(p.data) };
    const changed = FIELDS.filter(
      (f) => canon(fieldValue(old, f)) !== canon(fieldValue(next, f)),
    );
    await tx.question.update({ where: { id }, data: { ...toData(p.data), updatedById: actorId } });
    if (old.status === "ACTIVE" && changed.length) {
      await writeAudit(tx, {
        actorUserId: actorId,
        action: "QUESTION_UPDATED",
        entityType: "Question",
        entityId: id,
        metadata: { fields: [...changed] },
      });
    }
    return { ok: true } as const;
  });
}

export async function setQuestionStatus(
  actorId: string,
  id: string,
  to: QuestionStatus,
): Promise<{ ok: true } | NotFound> {
  return prisma.$transaction(async (tx) => {
    const q = await tx.question.findUnique({ where: { id }, select: { status: true } });
    if (!q) return { ok: false, error: "NOT_FOUND" } as const;
    if (q.status === to) return { ok: true } as const;
    await tx.question.update({ where: { id }, data: { status: to, updatedById: actorId } });
    await writeAudit(tx, {
      actorUserId: actorId,
      action: "QUESTION_STATUS_CHANGED",
      entityType: "Question",
      entityId: id,
      metadata: { from: q.status, to },
    });
    return { ok: true } as const;
  });
}

export async function deleteQuestion(
  actorId: string,
  id: string,
): Promise<{ ok: true } | NotFound | { ok: false; error: "NOT_DRAFT" }> {
  const res = await prisma.$transaction(async (tx) => {
    const q = await tx.question.findUnique({
      where: { id },
      select: { status: true, type: true, chapterId: true, images: { select: { id: true, storageKey: true } } },
    });
    if (!q) return { ok: false, error: "NOT_FOUND" } as const;
    if (q.status !== "DRAFT") return { ok: false, error: "NOT_DRAFT" } as const; // UI copy: "Jadikan soal draft dulu sebelum menghapusnya."
    await tx.image.deleteMany({ where: { questionId: id } });
    await tx.question.delete({ where: { id } });
    await writeAudit(tx, {
      actorUserId: actorId,
      action: "QUESTION_DELETED",
      entityType: "Question",
      entityId: id,
      metadata: { type: q.type, chapterId: q.chapterId },
    });
    return { ok: true, images: q.images } as const;
  });
  if (!res.ok) return res;
  // Best effort after commit; log the image id only, never the key.
  for (const img of res.images) {
    try {
      await deleteImage(img.storageKey);
    } catch {
      console.error("Gagal menghapus objek gambar", img.id);
    }
  }
  return { ok: true };
}

export async function duplicateQuestion(actorId: string, id: string): Promise<{ ok: true; id: string } | NotFound> {
  const src = await prisma.question.findUnique({
    where: { id },
    select: {
      type: true, prompt: true, options: true, answerKey: true, explanation: true, defaultPoints: true,
      difficulty: true, sourceReference: true, verificationNote: true, chapterId: true, subchapterId: true,
      images: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true, storageKey: true, mimeType: true, sizeBytes: true, width: true, height: true,
          altText: true, caption: true, sourceReference: true,
        },
      },
    },
  });
  if (!src) return { ok: false, error: "NOT_FOUND" };
  // Copy objects first (outside the transaction); undo them if anything fails.
  const copies: { oldId: string; key: string; img: (typeof src.images)[number] }[] = [];
  try {
    for (const img of src.images) {
      const key = `images/${randomUUID()}.${img.storageKey.split(".").pop()}`;
      await copyObject(img.storageKey, key);
      copies.push({ oldId: img.id, key, img });
    }
    const newId = await prisma.$transaction(async (tx) => {
      const { options } = src;
      const q = await tx.question.create({
        data: {
          type: src.type, prompt: src.prompt, answerKey: src.answerKey as Prisma.InputJsonValue,
          explanation: src.explanation, defaultPoints: src.defaultPoints, difficulty: src.difficulty,
          sourceReference: src.sourceReference, verificationNote: src.verificationNote,
          chapterId: src.chapterId, subchapterId: src.subchapterId,
          options: (options ?? Prisma.DbNull) as Prisma.InputJsonValue,
          status: "DRAFT",
          createdById: actorId,
          updatedById: actorId,
        },
        select: { id: true },
      });
      const idMap = new Map<string, string>();
      for (const c of copies) {
        const { mimeType, sizeBytes, width, height, altText, caption, sourceReference } = c.img;
        const row = await tx.image.create({
          data: { mimeType, sizeBytes, width, height, altText, caption, sourceReference, storageKey: c.key, questionId: q.id, createdById: actorId },
          select: { id: true },
        });
        idMap.set(c.oldId, row.id);
      }
      if (idMap.size) {
        const rw = (t: string) => t.replace(/aksara-image:([A-Za-z0-9_-]+)/g, (m, i: string) =>
          idMap.has(i) ? `aksara-image:${idMap.get(i)}` : m);
        await tx.question.update({
          where: { id: q.id },
          data: {
            prompt: rw(src.prompt),
            explanation: src.explanation === null ? null : rw(src.explanation),
            ...(Array.isArray(options) && {
              options: (options as Option[]).map((o) => ({ id: o.id, text: rw(o.text) })),
            }),
          },
        });
      }
      return q.id;
    });
    return { ok: true, id: newId };
  } catch (e) {
    for (const c of copies) {
      try {
        await deleteImage(c.key);
      } catch {
        console.error("Gagal menghapus objek gambar", c.oldId);
      }
    }
    throw e;
  }
}

export async function listQuestions(
  f: QuestionFilter,
): Promise<{ rows: QuestionRow[]; hasNext: boolean }> {
  const page = Number.isInteger(f.page) && f.page! >= 1 ? f.page! : 1;
  const q = f.q?.trim();
  const rows = await prisma.question.findMany({
    where: {
      chapterId: f.chapterId,
      subchapterId: f.subchapterId,
      type: f.type,
      difficulty: f.difficulty,
      status: f.status,
      ...(f.subjectId && { chapter: { subjectId: f.subjectId } }),
      ...(q && { prompt: { contains: q, mode: "insensitive" as const } }),
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
    select: {
      id: true, type: true, difficulty: true, status: true, prompt: true, defaultPoints: true, updatedAt: true,
      chapter: { select: { title: true, subject: { select: { name: true } } } },
    },
  });
  return {
    hasNext: rows.length > PAGE_SIZE,
    rows: rows.slice(0, PAGE_SIZE).map(({ chapter, ...r }) => ({
      ...r,
      chapterTitle: chapter.title,
      subjectName: chapter.subject.name,
    })),
  };
}

// Explicit select: storageKey is never read here. Json columns are only written through questionSchema (D9).
export async function getQuestionForTeacher(id: string): Promise<QuestionDetail | null> {
  const q = await prisma.question.findUnique({
    where: { id },
    select: {
      id: true, type: true, prompt: true, options: true, answerKey: true, explanation: true,
      defaultPoints: true, difficulty: true, status: true, sourceReference: true, verificationNote: true,
      chapterId: true, subchapterId: true, updatedAt: true,
      chapter: { select: { title: true, subject: { select: { name: true } } } },
      subchapter: { select: { title: true } },
      images: {
        orderBy: { createdAt: "asc" },
        select: { id: true, altText: true, caption: true, sourceReference: true, width: true, height: true },
      },
    },
  });
  if (!q) return null;
  const { chapter, subchapter, ...rest } = q;
  return {
    ...rest,
    chapterTitle: chapter.title,
    subjectName: chapter.subject.name,
    subchapterTitle: subchapter?.title ?? null,
  } as QuestionDetail;
}

export async function countQuestionsByStatus(): Promise<Record<QuestionStatus, number>> {
  const out: Record<QuestionStatus, number> = { DRAFT: 0, ACTIVE: 0 };
  const g = await prisma.question.groupBy({ by: ["status"], _count: { _all: true } });
  for (const r of g) out[r.status] = r._count._all;
  return out;
}

/** The only shape of a question a student may ever receive: a fresh allowlisted object. */
export function toPublicQuestion(
  q: Pick<QuestionDetail, "id" | "type" | "prompt" | "options" | "images">,
): PublicQuestion {
  const options = q.options ? q.options.map((o) => ({ id: o.id, text: o.text })) : null;
  const shown = new Set(extractImageIds([q.prompt, ...(options ?? []).map((o) => o.text)].join("\n")));
  return {
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    options,
    images: q.images
      .filter((i) => shown.has(i.id))
      .map((i) => ({
        id: i.id, altText: i.altText, caption: i.caption, sourceReference: i.sourceReference,
        width: i.width, height: i.height,
      })),
  };
}
