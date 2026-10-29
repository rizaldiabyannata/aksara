import { z } from "zod";
import { prisma } from "@/lib/db";
import { parse, required, optional, type Invalid, type NotFound } from "@/lib/validation";
import { uniqueViolation as sharedUniqueViolation } from "@/lib/unique-violation";

type InUse = { ok: false; error: "IN_USE"; message: string };

export type SubjectTree = {
  id: string;
  name: string;
  description: string | null;
  chapters: {
    id: string;
    title: string;
    order: number;
    sourceBook: string;
    sourceYearOrEdition: string;
    materialCount: number;
    subchapters: {
      id: string;
      title: string;
      order: number;
      sourcePages: string | null;
      materialCount: number;
    }[];
  }[];
}[];

const FORM_MSG = "Data tidak lengkap. Coba isi lagi.";

const subjectSchema = z.object(
  {
    name: required(80, "Judul mapel wajib diisi, paling banyak 80 huruf."),
    description: z
      .string({ error: "Deskripsi tidak valid." })
      .trim()
      .optional()
      .transform((v) => v || null),
  },
  { error: FORM_MSG },
);
const chapterSchema = z.object(
  {
    title: required(150, "Judul bab wajib diisi, paling banyak 150 huruf."),
    sourceBook: required(150, "Nama buku sumber wajib diisi, paling banyak 150 huruf."),
    sourceYearOrEdition: required(40, "Tahun atau edisi wajib diisi, paling banyak 40 huruf."),
  },
  { error: FORM_MSG },
);
const subchapterSchema = z.object(
  {
    title: required(150, "Judul subbab wajib diisi, paling banyak 150 huruf."),
    sourcePages: optional(50, "Halaman sumber paling banyak 50 huruf."),
  },
  { error: FORM_MSG },
);

const uniqueViolation = (e: unknown) =>
  sharedUniqueViolation(e, { Subject_name_key: "name" } as const);

// Swap in 3 writes: the temporary negative order keeps the unique (parent, order) from colliding.
export async function swapOrder(
  a: { id: string; order: number },
  b: { id: string; order: number },
  set: (id: string, order: number) => Promise<unknown>,
) {
  await set(a.id, -a.order);
  await set(b.id, a.order);
  await set(a.id, b.order);
}

export async function getSubjectTree(): Promise<SubjectTree> {
  const rows = await prisma.subject.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      chapters: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          order: true,
          sourceBook: true,
          sourceYearOrEdition: true,
          _count: { select: { materials: true } },
          subchapters: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              order: true,
              sourcePages: true,
              _count: { select: { materials: true } },
            },
          },
        },
      },
    },
  });
  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    chapters: s.chapters.map(({ _count, subchapters, ...c }) => ({
      ...c,
      materialCount: _count.materials,
      subchapters: subchapters.map(({ _count: sc, ...x }) => ({
        ...x,
        materialCount: sc.materials,
      })),
    })),
  }));
}

export async function saveSubject(
  id: string | null,
  input: unknown,
): Promise<{ ok: true } | Invalid | NotFound | { ok: false; error: "NAME_TAKEN" }> {
  const p = parse(subjectSchema, input);
  if (!p.ok) return p;
  try {
    if (id === null) {
      await prisma.subject.create({ data: p.data });
      return { ok: true };
    }
    const { count } = await prisma.subject.updateMany({ where: { id }, data: p.data });
    return count ? { ok: true } : { ok: false, error: "NOT_FOUND" };
  } catch (e) {
    if (uniqueViolation(e) === "name") return { ok: false, error: "NAME_TAKEN" };
    throw e;
  }
}

export async function deleteSubject(id: string): Promise<{ ok: true } | InUse | NotFound> {
  return prisma.$transaction(async (tx) => {
    const s = await tx.subject.findUnique({
      where: { id },
      select: { _count: { select: { chapters: true, quizzes: true } } },
    });
    if (!s) return { ok: false, error: "NOT_FOUND" } as const;
    if (!s._count.chapters && s._count.quizzes) {
      return { ok: false, error: "IN_USE", message: `Mapel ini masih dipakai ${s._count.quizzes} ulangan.` } as const;
    }
    if (s._count.chapters) {
      return {
        ok: false,
        error: "IN_USE",
        message: `Mapel ini masih punya ${s._count.chapters} bab.`,
      } as const;
    }
    await tx.subject.delete({ where: { id } });
    return { ok: true } as const;
  });
}

export async function saveChapter(
  subjectId: string,
  id: string | null,
  input: unknown,
): Promise<{ ok: true } | Invalid | NotFound> {
  const p = parse(chapterSchema, input);
  if (!p.ok) return p;
  return prisma.$transaction(async (tx) => {
    if (id === null) {
      if (!(await tx.subject.findUnique({ where: { id: subjectId }, select: { id: true } }))) {
        return { ok: false, error: "NOT_FOUND" } as const;
      }
      const max = await tx.chapter.aggregate({ where: { subjectId }, _max: { order: true } });
      await tx.chapter.create({
        data: { ...p.data, subjectId, order: (max._max.order ?? 0) + 1 },
      });
      return { ok: true } as const;
    }
    const { count } = await tx.chapter.updateMany({ where: { id }, data: p.data });
    return count ? ({ ok: true } as const) : ({ ok: false, error: "NOT_FOUND" } as const);
  });
}

export async function moveChapter(id: string, dir: "up" | "down"): Promise<{ ok: true } | NotFound> {
  return prisma.$transaction(async (tx) => {
    const cur = await tx.chapter.findUnique({
      where: { id },
      select: { subjectId: true, order: true },
    });
    if (!cur) return { ok: false, error: "NOT_FOUND" } as const;
    const nb = await tx.chapter.findFirst({
      where: { subjectId: cur.subjectId, order: dir === "up" ? { lt: cur.order } : { gt: cur.order } },
      orderBy: { order: dir === "up" ? "desc" : "asc" },
      select: { id: true, order: true },
    });
    if (nb) {
      await swapOrder({ id, order: cur.order }, nb, (i, order) =>
        tx.chapter.update({ where: { id: i }, data: { order } }),
      );
    }
    return { ok: true } as const;
  });
}

export async function deleteChapter(id: string): Promise<{ ok: true } | InUse | NotFound> {
  return prisma.$transaction(async (tx) => {
    const c = await tx.chapter.findUnique({
      where: { id },
      select: { _count: { select: { materials: true, subchapters: true } } },
    });
    if (!c) return { ok: false, error: "NOT_FOUND" } as const;
    const { materials, subchapters } = c._count;
    if (materials || subchapters) {
      return {
        ok: false,
        error: "IN_USE",
        message: `Bab ini masih dipakai ${materials} materi dan ${subchapters} subbab.`,
      } as const;
    }
    await tx.chapter.delete({ where: { id } });
    return { ok: true } as const;
  });
}

export async function saveSubchapter(
  chapterId: string,
  id: string | null,
  input: unknown,
): Promise<{ ok: true } | Invalid | NotFound> {
  const p = parse(subchapterSchema, input);
  if (!p.ok) return p;
  return prisma.$transaction(async (tx) => {
    if (id === null) {
      if (!(await tx.chapter.findUnique({ where: { id: chapterId }, select: { id: true } }))) {
        return { ok: false, error: "NOT_FOUND" } as const;
      }
      const max = await tx.subchapter.aggregate({ where: { chapterId }, _max: { order: true } });
      await tx.subchapter.create({
        data: { ...p.data, chapterId, order: (max._max.order ?? 0) + 1 },
      });
      return { ok: true } as const;
    }
    const { count } = await tx.subchapter.updateMany({ where: { id }, data: p.data });
    return count ? ({ ok: true } as const) : ({ ok: false, error: "NOT_FOUND" } as const);
  });
}

export async function moveSubchapter(
  id: string,
  dir: "up" | "down",
): Promise<{ ok: true } | NotFound> {
  return prisma.$transaction(async (tx) => {
    const cur = await tx.subchapter.findUnique({
      where: { id },
      select: { chapterId: true, order: true },
    });
    if (!cur) return { ok: false, error: "NOT_FOUND" } as const;
    const nb = await tx.subchapter.findFirst({
      where: {
        chapterId: cur.chapterId,
        order: dir === "up" ? { lt: cur.order } : { gt: cur.order },
      },
      orderBy: { order: dir === "up" ? "desc" : "asc" },
      select: { id: true, order: true },
    });
    if (nb) {
      await swapOrder({ id, order: cur.order }, nb, (i, order) =>
        tx.subchapter.update({ where: { id: i }, data: { order } }),
      );
    }
    return { ok: true } as const;
  });
}

export async function deleteSubchapter(id: string): Promise<{ ok: true } | InUse | NotFound> {
  return prisma.$transaction(async (tx) => {
    const s = await tx.subchapter.findUnique({
      where: { id },
      select: { _count: { select: { materials: true } } },
    });
    if (!s) return { ok: false, error: "NOT_FOUND" } as const;
    if (s._count.materials) {
      return {
        ok: false,
        error: "IN_USE",
        message: `Subbab ini masih dipakai ${s._count.materials} materi.`,
      } as const;
    }
    await tx.subchapter.delete({ where: { id } });
    return { ok: true } as const;
  });
}

// Flat list for pickers: one entry per chapter, in subject-name then chapter-order order.
export async function listChapterOptions(): Promise<
  { id: string; label: string; subchapters: { id: string; label: string }[] }[]
> {
  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
    select: {
      name: true,
      chapters: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          order: true,
          subchapters: {
            orderBy: { order: "asc" },
            select: { id: true, title: true },
          },
        },
      },
    },
  });
  return subjects.flatMap((s) =>
    s.chapters.map((c) => ({
      id: c.id,
      label: `${s.name} · Bab ${c.order} · ${c.title}`,
      subchapters: c.subchapters.map((x) => ({ id: x.id, label: x.title })),
    })),
  );
}
