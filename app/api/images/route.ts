import { requireTeacher } from "@/lib/auth/guard";
import { addImage } from "@/lib/images";

const MAX_BYTES = 4 * 1024 * 1024;
const MSG = {
  type: "File harus gambar JPG, PNG, atau WEBP.",
  size: "Ukuran gambar paling besar 4 MB.",
  limit: "Satu materi paling banyak 20 gambar.",
};

const json = (body: Record<string, unknown>, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const fail = (message: string, status: number, extra: Record<string, unknown> = {}) =>
  json({ ok: false, message, ...extra }, status);

function sameOrigin(req: Request) {
  try {
    const origin = req.headers.get("origin");
    // Request drops a manually set Host header, so fall back to the URL host.
    return !!origin && new URL(origin).host === (req.headers.get("host") ?? new URL(req.url).host);
  } catch {
    return false;
  }
}

export async function POST(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail("Permintaan ditolak.", 403);
  const user = await requireTeacher();

  const fd = await req.formData().catch(() => null);
  if (!fd) return fail(MSG.type, 400);
  const file = fd.get("file");
  if (!(file instanceof File)) return fail(MSG.type, 400);
  if (file.size > MAX_BYTES) return fail(MSG.size, 413);
  const str = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" ? v : undefined;
  };

  const bytes = new Uint8Array(await file.arrayBuffer());
  let r: Awaited<ReturnType<typeof addImage>>;
  try {
    r = await addImage(user.id, {
      materialId: str("materialId") ?? "",
      altText: str("altText") ?? "",
      caption: str("caption"),
      sourceReference: str("sourceReference"),
      file: bytes,
    });
  } catch {
    // Log the id only: the raw AWS error and the image bytes stay out of logs.
    console.error("Gagal mengunggah gambar", str("materialId"));
    return fail("Ada masalah. Coba lagi sebentar lagi.", 500);
  }
  if (r.ok) return json({ ok: true, id: r.id });
  switch (r.error) {
    case "INVALID": return fail("Periksa isian gambar.", 400, { fieldErrors: r.fieldErrors });
    case "NOT_FOUND": return fail("Materi tidak ditemukan.", 404);
    case "LIMIT": return fail(MSG.limit, 400);
    case "UNSUPPORTED": return fail(MSG.type, 400);
    case "TOO_LARGE": return fail(MSG.size, 413);
  }
}
