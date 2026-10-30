import { requireTeacher } from "@/lib/auth/guard";
import { sameOrigin } from "@/lib/attempt-http";
import { removeTeacherAvatar, setTeacherAvatar } from "@/lib/images";

const MAX_BYTES = 4 * 1024 * 1024;
const MSG = {
  type: "Foto harus berformat JPG, PNG, atau WebP.",
  size: "Ukuran foto paling besar 4 MB.",
  error: "Ada masalah. Coba lagi sebentar lagi.",
};

const json = (body: Record<string, unknown>, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Server Actions cap bodies at 1 MB, so the photo goes through a route like the other image uploads.
export async function POST(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return json({ ok: false, message: "Permintaan ditolak." }, 403);
  const user = await requireTeacher({ allowPasswordChange: true });
  const fd = await req.formData().catch(() => null);
  const file = fd?.get("photo");
  if (!(file instanceof File)) return json({ ok: false, message: MSG.type }, 400);
  if (file.size > MAX_BYTES) return json({ ok: false, message: MSG.size }, 413);
  try {
    const r = await setTeacherAvatar(user.id, new Uint8Array(await file.arrayBuffer()));
    if (r.ok) return json({ ok: true });
    return json({ ok: false, message: r.error === "TOO_LARGE" ? MSG.size : MSG.type }, r.error === "TOO_LARGE" ? 413 : 400);
  } catch {
    console.error("Gagal menyimpan foto profil");
    return json({ ok: false, message: MSG.error }, 500);
  }
}

export async function DELETE(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return json({ ok: false, message: "Permintaan ditolak." }, 403);
  const user = await requireTeacher({ allowPasswordChange: true });
  try {
    await removeTeacherAvatar(user.id);
  } catch {
    console.error("Gagal menghapus foto profil");
    return json({ ok: false, message: MSG.error }, 500);
  }
  return json({ ok: true });
}
