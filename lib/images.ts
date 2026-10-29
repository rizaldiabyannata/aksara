import { randomUUID } from "node:crypto";
import sharp, { type Sharp } from "sharp";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { GRACE_MS } from "@/lib/attempts";
import { deleteImage, presignGet, putImage } from "@/lib/storage";
import type { SessionUser } from "@/lib/auth/session";
import type { MaterialStatus } from "@/lib/generated/prisma/enums";

const IMAGE_REF = /aksara-image:([A-Za-z0-9_-]+)/g;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const MAX_LONG_SIDE = 1600;

const MIME = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

export type ProcessedImage = {
  data: Buffer;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  ext: "jpg" | "png" | "webp";
  width: number;
  height: number;
};

export function extractImageIds(markdown: string): string[] {
  return [...new Set([...markdown.matchAll(IMAGE_REF)].map((m) => m[1]))];
}

// A question image has no material (null): students never see it, teachers still can.
export function canStudentViewImage(ctx: {
  role: "TEACHER" | "STUDENT";
  materialStatus: MaterialStatus | null;
}): boolean {
  return ctx.role === "TEACHER" || ctx.materialStatus === "PUBLISHED";
}

// Magic bytes decide the type. The client's claimed type is never trusted.
function sniff(b: Uint8Array): keyof typeof MIME | undefined {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) {
    return "png";
  }
  const tag = (from: number) => Buffer.from(b.subarray(from, from + 4)).toString("latin1");
  if (b.length >= 12 && tag(0) === "RIFF" && tag(8) === "WEBP") return "webp";
  return undefined;
}

const encode = {
  jpg: (p: Sharp) => p.jpeg(),
  png: (p: Sharp) => p.png(),
  webp: (p: Sharp) => p.webp(),
};

export async function processUpload(
  bytes: Uint8Array,
): Promise<{ ok: true; image: ProcessedImage } | { ok: false; error: "UNSUPPORTED" | "TOO_LARGE" }> {
  const ext = sniff(bytes);
  if (!ext) return { ok: false, error: "UNSUPPORTED" };
  try {
    const pipeline = sharp(bytes, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize({
        width: MAX_LONG_SIDE,
        height: MAX_LONG_SIDE,
        fit: "inside",
        withoutEnlargement: true,
      });
    // Default sharp output drops metadata, including EXIF and GPS.
    const { data, info } = await encode[ext](pipeline).toBuffer({ resolveWithObject: true });
    if (data.length > MAX_OUTPUT_BYTES) return { ok: false, error: "TOO_LARGE" };
    return {
      ok: true,
      image: { data, mimeType: MIME[ext], ext, width: info.width, height: info.height },
    };
  } catch {
    // Decode failures and sharp's pixel limit both land here.
    return { ok: false, error: "UNSUPPORTED" };
  }
}

type Invalid = { ok: false; error: "INVALID"; fieldErrors: Record<string, string> };
type NotFound = { ok: false; error: "NOT_FOUND" };

const MAX_IMAGES_PER_MATERIAL = 20;
const MAX_IMAGES_PER_QUESTION = 5;
const ALT_MSG = "Teks alternatif wajib diisi, paling banyak 200 huruf.";
const optional = (msg: string) =>
  z.string({ error: msg }).trim().max(200, { error: msg }).optional().transform((v) => v || null);
const metaSchema = z.object(
  {
    altText: z.string({ error: ALT_MSG }).trim().min(1, { error: ALT_MSG }).max(200, { error: ALT_MSG }),
    caption: optional("Keterangan paling banyak 200 huruf."),
    sourceReference: optional("Sumber paling banyak 200 huruf."),
  },
  { error: "Data tidak lengkap. Coba isi lagi." },
);

function parseMeta(input: unknown):
  | { ok: true; data: z.infer<typeof metaSchema> }
  | Invalid {
  const r = metaSchema.safeParse(input);
  if (r.success) return { ok: true, data: r.data };
  const fieldErrors: Record<string, string> = {};
  for (const i of r.error.issues) fieldErrors[i.path.length ? String(i.path[0]) : "form"] ??= i.message;
  return { ok: false, error: "INVALID", fieldErrors };
}

async function removeObject(key: string, imageId: string) {
  try {
    await deleteImage(key);
  } catch {
    console.error("Gagal menghapus objek gambar", imageId);
  }
}

export async function addImage(
  actorId: string,
  input: { materialId?: string; questionId?: string; altText: string; caption?: string; sourceReference?: string; file: Uint8Array },
): Promise<
  | { ok: true; id: string }
  | Invalid
  | NotFound
  | { ok: false; error: "LIMIT" | "UNSUPPORTED" | "TOO_LARGE" }
> {
  const meta = parseMeta(input);
  if (!meta.ok) return meta;
  if (!input.materialId === !input.questionId) {
    return { ok: false, error: "INVALID", fieldErrors: { form: "Data tidak lengkap. Coba isi lagi." } };
  }
  const owner = input.materialId
    ? { materialId: input.materialId }
    : { questionId: input.questionId! };
  const exists = input.materialId
    ? await prisma.material.findUnique({ where: { id: input.materialId }, select: { id: true } })
    : await prisma.question.findUnique({ where: { id: input.questionId }, select: { id: true } });
  if (!exists) return { ok: false, error: "NOT_FOUND" };
  // ponytail: count then insert is not atomic; a double submit could pass the cap. Fine with a single teacher.
  const count = await prisma.image.count({ where: { ...owner, deletedAt: null } });
  if (count >= (input.materialId ? MAX_IMAGES_PER_MATERIAL : MAX_IMAGES_PER_QUESTION)) {
    return { ok: false, error: "LIMIT" };
  }
  const p = await processUpload(input.file);
  if (!p.ok) return p;
  const { image } = p;
  const storageKey = `images/${randomUUID()}.${image.ext}`;
  await putImage(storageKey, image.data, image.mimeType);
  try {
    const id = await prisma.$transaction(async (tx) => {
      const row = await tx.image.create({
        data: {
          ...owner,
          storageKey,
          mimeType: image.mimeType,
          sizeBytes: image.data.length,
          width: image.width,
          height: image.height,
          ...meta.data,
          createdById: actorId,
        },
        select: { id: true },
      });
      await writeAudit(tx, {
        actorUserId: actorId,
        action: "IMAGE_ADDED",
        entityType: "Image",
        entityId: row.id,
        metadata: { imageId: row.id, ...(input.materialId ? { materialId: input.materialId } : { questionId: input.questionId! }) },
      });
      return row.id;
    });
    return { ok: true, id };
  } catch (e) {
    await removeObject(storageKey, "belum-tersimpan");
    throw e;
  }
}

export async function updateImageMeta(id: string, input: unknown): Promise<{ ok: true } | Invalid | NotFound> {
  const meta = parseMeta(input);
  if (!meta.ok) return meta;
  const r = await prisma.image.updateMany({ where: { id }, data: meta.data });
  return r.count ? { ok: true } : { ok: false, error: "NOT_FOUND" };
}

export async function removeImage(actorId: string, id: string): Promise<{ ok: true } | NotFound> {
  const storageKey = await prisma.$transaction(async (tx) => {
    const img = await tx.image.findFirst({ where: { id, deletedAt: null }, select: { storageKey: true, materialId: true, questionId: true } });
    if (!img) return null;
    // Referenced by a published quiz: hide it but keep the row and the R2 object.
    const frozen = (await tx.quizQuestionImage.count({ where: { imageId: id } })) > 0;
    if (frozen) await tx.image.update({ where: { id }, data: { deletedAt: new Date() } });
    else await tx.image.delete({ where: { id } });
    await writeAudit(tx, {
      actorUserId: actorId,
      action: "IMAGE_REMOVED",
      entityType: "Image",
      entityId: id,
      metadata: {
        imageId: id,
        ...(img.materialId ? { materialId: img.materialId } : { questionId: img.questionId! }),
      },
    });
    return frozen ? "" : img.storageKey;
  });
  if (storageKey === null) return { ok: false, error: "NOT_FOUND" };
  if (storageKey) await removeObject(storageKey, id);
  return { ok: true };
}

/** Presigned URL for the caller, or null (unknown id or not allowed). Never expose storageKey. */
export async function imageRedirectTarget(user: SessionUser, id: string, now: Date = new Date()): Promise<string | null> {
  const img = await prisma.image.findUnique({
    where: { id },
    select: { storageKey: true, material: { select: { status: true } } },
  });
  if (!img) return null;
  if (!canStudentViewImage({ role: user.role, materialStatus: img.material?.status ?? null })) {
    // Not a visible material image: a student may still see a frozen QUESTION image of a quiz they are taking.
    // No finalize here: the deadline + grace is checked in the query itself.
    const frozen = await prisma.quizQuestionImage.findFirst({
      where: {
        imageId: id,
        visibility: "QUESTION",
        quizQuestion: {
          quiz: {
            attempts: {
              some: {
                studentId: user.id,
                status: "IN_PROGRESS",
                replacementGrantedAt: null,
                deadlineAt: { gt: new Date(now.getTime() - GRACE_MS) },
              },
            },
          },
        },
      },
      select: { imageId: true },
    });
    if (!frozen) return null;
  }
  return presignGet(img.storageKey);
}
