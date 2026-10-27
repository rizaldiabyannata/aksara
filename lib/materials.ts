import { z } from "zod";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { extractImageIds } from "@/lib/images";
import { deleteImage } from "@/lib/storage";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { MaterialStatus } from "@/lib/generated/prisma/enums";

type Invalid = { ok: false; error: "INVALID"; fieldErrors: Record<string, string> };
type NotFound = { ok: false; error: "NOT_FOUND" };

export type ImageView = {
  id: string;
  altText: string;
  caption: string | null;
  sourceReference: string | null;
  width: number;
  height: number;
};
export type MaterialDetail = {
  id: string;
  title: string;
  summary: string;
  content: string;
  examples: string | null;
  exercises: string | null;
  sourceReference: string;
  sourcePages: string | null;
  status: MaterialStatus;
  chapterId: string;
  subchapterId: string | null;
  chapterTitle: string;
  subjectName: string;
  subchapterTitle: string | null;
  images: ImageView[];
  publishedAt: Date | null;
  updatedAt: Date;
};
export type MaterialRow = {
  id: string;
  title: string;
  status: MaterialStatus;
  order: number;
  chapterId: string;
  chapterTitle: string;
  subjectName: string;
  updatedAt: Date;
};

function parse<S extends z.ZodType>(
  schema: S,
  input: unknown,
): { ok: true; data: z.infer<S> } | Invalid {
  const r = schema.safeParse(input);
  if (r.success) return { ok: true, data: r.data };
  const fieldErrors: Record<string, string> = {};
  for (const i of r.error.issues) {
    const key = i.path.length ? String(i.path[0]) : "form";
    fieldErrors[key] ??= i.message;
  }
  return { ok: false, error: "INVALID", fieldErrors };
}

const required = (max: number, msg: string) =>
  z.string({ error: msg }).trim().min(1, { error: msg }).max(max, { error: msg });
const optional = (max: number, msg: string) =>
  z
    .string({ error: msg })
    .trim()
    .max(max, { error: msg })
    .optional()
    .transform((v) => v || null);

const materialSchema = z.object(
  {
    title: required(150, "Judul wajib diisi, paling banyak 150 huruf."),
    summary: required(1000, "Ringkasan wajib diisi, paling banyak 1.000 huruf."),
    content: required(50000, "Isi materi wajib diisi, paling banyak 50.000 huruf."),
    examples: optional(50000, "Contoh paling banyak 50.000 huruf."),
    exercises: optional(50000, "Latihan paling banyak 50.000 huruf."),
    sourceReference: required(200, "Sumber wajib diisi, paling banyak 200 huruf."),
    sourcePages: optional(50, "Halaman sumber paling banyak 50 huruf."),
    chapterId: required(100, "Pilih bab dulu."),
    subchapterId: optional(100, "Subbab tidak valid."),
  },
  { error: "Data tidak lengkap. Coba isi lagi." },
);
type MaterialInput = z.infer<typeof materialSchema>;

// Fixed order: metadata.fields of MATERIAL_UPDATED follows this list.
const FIELDS = [
  "title", "summary", "content", "examples", "exercises",
  "sourceReference", "sourcePages", "chapterId", "subchapterId",
] as const;

const ALLOWED: Record<MaterialStatus, MaterialStatus[]> = {
  DRAFT: ["REVIEWED"],
  REVIEWED: ["PUBLISHED", "DRAFT"],
  PUBLISHED: ["DRAFT"],
};
export function canTransition(from: MaterialStatus, to: MaterialStatus): boolean {
  return ALLOWED[from].includes(to);
}

const FOREIGN_IMAGE = "Ada kode gambar yang bukan milik materi ini. Pakai tombol Salin kode sisip.";

/** Validates chapter, subchapter and image references. `materialId` null = create (no images yet). */
async function checkRefs(
  tx: Prisma.TransactionClient,
  d: MaterialInput,
  materialId: string | null,
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
    materialId
      ? (await tx.image.findMany({ where: { materialId }, select: { id: true } })).map((i) => i.id)
      : [],
  );
  for (const f of ["content", "examples", "exercises"] as const) {
    if (extractImageIds(d[f] ?? "").some((id) => !own.has(id))) fieldErrors[f] = FOREIGN_IMAGE;
  }
  return Object.keys(fieldErrors).length
    ? { ok: false, error: "INVALID", fieldErrors }
    : null;
}

const nextOrder = async (tx: Prisma.TransactionClient, chapterId: string) =>
  ((await tx.material.aggregate({ where: { chapterId }, _max: { order: true } }))._max.order ?? 0) + 1;

export async function createMaterial(
  actorId: string,
  input: unknown,
): Promise<{ ok: true; id: string } | Invalid> {
  const p = parse(materialSchema, input);
  if (!p.ok) return p;
  return prisma.$transaction(async (tx) => {
    const bad = await checkRefs(tx, p.data, null);
    if (bad) return bad;
    const m = await tx.material.create({
      data: {
        ...p.data,
        order: await nextOrder(tx, p.data.chapterId),
        createdById: actorId,
        updatedById: actorId,
      },
      select: { id: true },
    });
    return { ok: true, id: m.id } as const;
  });
}

export async function updateMaterial(
  actorId: string,
  id: string,
  input: unknown,
): Promise<{ ok: true } | Invalid | NotFound> {
  const p = parse(materialSchema, input);
  if (!p.ok) return p;
  return prisma.$transaction(async (tx) => {
    const old = await tx.material.findUnique({ where: { id } });
    if (!old) return { ok: false, error: "NOT_FOUND" } as const;
    const bad = await checkRefs(tx, p.data, id);
    if (bad) return bad;
    const changed = FIELDS.filter((f) => old[f] !== p.data[f]);
    await tx.material.update({
      where: { id },
      data: {
        ...p.data,
        updatedById: actorId,
        ...(p.data.chapterId !== old.chapterId && {
          order: await nextOrder(tx, p.data.chapterId),
        }),
      },
    });
    if (old.status === "PUBLISHED" && changed.length) {
      await writeAudit(tx, {
        actorUserId: actorId,
        action: "MATERIAL_UPDATED",
        entityType: "Material",
        entityId: id,
        metadata: { fields: [...changed] },
      });
    }
    return { ok: true } as const;
  });
}

export async function changeMaterialStatus(
  actorId: string,
  id: string,
  to: MaterialStatus,
): Promise<{ ok: true } | NotFound | { ok: false; error: "BAD_TRANSITION" }> {
  return prisma.$transaction(async (tx) => {
    const m = await tx.material.findUnique({ where: { id }, select: { status: true } });
    if (!m) return { ok: false, error: "NOT_FOUND" } as const;
    const from = m.status;
    if (!canTransition(from, to)) return { ok: false, error: "BAD_TRANSITION" } as const;
    const { count } = await tx.material.updateMany({
      where: { id, status: from },
      data: {
        status: to,
        updatedById: actorId,
        ...(to === "PUBLISHED" && { publishedAt: new Date() }),
      },
    });
    if (!count) return { ok: false, error: "BAD_TRANSITION" } as const; // changed concurrently
    await writeAudit(tx, {
      actorUserId: actorId,
      action: "MATERIAL_STATUS_CHANGED",
      entityType: "Material",
      entityId: id,
      metadata: { from, to },
    });
    return { ok: true } as const;
  });
}

export async function moveMaterial(
  id: string,
  dir: "up" | "down",
): Promise<{ ok: true } | NotFound> {
  return prisma.$transaction(async (tx) => {
    const m = await tx.material.findUnique({
      where: { id },
      select: { chapterId: true, order: true },
    });
    if (!m) return { ok: false, error: "NOT_FOUND" } as const;
    const nb = await tx.material.findFirst({
      where: { chapterId: m.chapterId, order: dir === "up" ? { lt: m.order } : { gt: m.order } },
      orderBy: { order: dir === "up" ? "desc" : "asc" },
      select: { id: true, order: true },
    });
    if (nb) {
      await tx.material.update({ where: { id }, data: { order: nb.order } });
      await tx.material.update({ where: { id: nb.id }, data: { order: m.order } });
    }
    return { ok: true } as const;
  });
}

export async function deleteMaterial(
  actorId: string,
  id: string,
): Promise<{ ok: true } | NotFound | { ok: false; error: "NOT_DRAFT" }> {
  const res = await prisma.$transaction(async (tx) => {
    const m = await tx.material.findUnique({
      where: { id },
      select: { status: true, title: true, images: { select: { id: true, storageKey: true } } },
    });
    if (!m) return { ok: false, error: "NOT_FOUND" } as const;
    if (m.status !== "DRAFT") {
      return { ok: false, error: "NOT_DRAFT" } as const; // UI copy: "Kembalikan materi ke draft dulu sebelum menghapusnya."
    }
    await tx.image.deleteMany({ where: { materialId: id } });
    await tx.material.delete({ where: { id } });
    await writeAudit(tx, {
      actorUserId: actorId,
      action: "MATERIAL_DELETED",
      entityType: "Material",
      entityId: id,
      metadata: { title: m.title },
    });
    return { ok: true, images: m.images } as const;
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

export async function listMaterials(f: {
  subjectId?: string;
  chapterId?: string;
  status?: MaterialStatus;
}): Promise<{ rows: MaterialRow[]; capped: boolean }> {
  const rows = await prisma.material.findMany({
    where: {
      status: f.status,
      chapterId: f.chapterId,
      ...(f.subjectId && { chapter: { subjectId: f.subjectId } }),
    },
    orderBy: [{ chapter: { subject: { name: "asc" } } }, { chapter: { order: "asc" } }, { order: "asc" }],
    take: 201,
    select: {
      id: true,
      title: true,
      status: true,
      order: true,
      chapterId: true,
      updatedAt: true,
      chapter: { select: { title: true, subject: { select: { name: true } } } },
    },
  });
  // ponytail: no pagination for ~150 materials; the UI tells the teacher to narrow the filter.
  return {
    capped: rows.length > 200,
    rows: rows.slice(0, 200).map(({ chapter, ...r }) => ({
      ...r,
      chapterTitle: chapter.title,
      subjectName: chapter.subject.name,
    })),
  };
}

// Explicit select: storageKey is never read here.
async function getDetail(where: Prisma.MaterialWhereInput): Promise<MaterialDetail | null> {
  const m = await prisma.material.findFirst({
    where,
    select: {
      id: true, title: true, summary: true, content: true, examples: true, exercises: true,
      sourceReference: true, sourcePages: true, status: true, chapterId: true, subchapterId: true,
      publishedAt: true, updatedAt: true,
      chapter: { select: { title: true, subject: { select: { name: true } } } },
      subchapter: { select: { title: true } },
      images: {
        orderBy: { createdAt: "asc" },
        select: { id: true, altText: true, caption: true, sourceReference: true, width: true, height: true },
      },
    },
  });
  if (!m) return null;
  const { chapter, subchapter, ...rest } = m;
  return {
    ...rest,
    chapterTitle: chapter.title,
    subjectName: chapter.subject.name,
    subchapterTitle: subchapter?.title ?? null,
  };
}

export const getMaterialForTeacher = (id: string) => getDetail({ id });
export const getPublishedMaterial = (id: string) => getDetail({ id, status: "PUBLISHED" });

export async function listPublishedTree(): Promise<
  { id: string; name: string; chapters: { id: string; title: string; order: number; materials: { id: string; title: string }[] }[] }[]
> {
  const pub = { status: "PUBLISHED" } as const;
  const subjects = await prisma.subject.findMany({
    where: { chapters: { some: { materials: { some: pub } } } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      chapters: {
        where: { materials: { some: pub } },
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          order: true,
          materials: { where: pub, orderBy: { order: "asc" }, select: { id: true, title: true } },
        },
      },
    },
  });
  return subjects;
}

export async function countMaterialsByStatus(): Promise<Record<MaterialStatus, number>> {
  const out: Record<MaterialStatus, number> = { DRAFT: 0, REVIEWED: 0, PUBLISHED: 0 };
  const g = await prisma.material.groupBy({ by: ["status"], _count: { _all: true } });
  for (const r of g) out[r.status] = r._count._all;
  return out;
}
