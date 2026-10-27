import sharp, { type Sharp } from "sharp";
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

export function canStudentViewImage(ctx: {
  role: "TEACHER" | "STUDENT";
  materialStatus: MaterialStatus;
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
    const pipeline = sharp(bytes)
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
