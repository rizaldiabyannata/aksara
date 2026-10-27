"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth/guard";
import { field, type FormState } from "@/lib/form-state";
import {
  changeMaterialStatus,
  createMaterial,
  deleteMaterial,
  moveMaterial,
  updateMaterial,
} from "@/lib/materials";
import { removeImage, updateImageMeta } from "@/lib/images";
import type { MaterialStatus } from "@/lib/generated/prisma/enums";

const UNEXPECTED = "Ada masalah. Coba lagi sebentar lagi.";
const ERRORS = {
  BAD_TRANSITION: "Status materi tidak bisa diubah ke sana. Tandai sudah ditinjau dulu.",
  NOT_DRAFT: "Kembalikan materi ke draft dulu sebelum menghapusnya.",
  NOT_FOUND: "Materi tidak ditemukan. Muat ulang halaman.",
  IMAGE_NOT_FOUND: "Gambar tidak ditemukan. Muat ulang halaman.",
};

type Result =
  | { ok: true; id?: string }
  | { ok: false; error: "INVALID"; fieldErrors: Record<string, string> }
  | { ok: false; error: keyof typeof ERRORS };

// Only the domain call is inside try; the guard, revalidate and redirect stay outside.
async function run(
  call: () => Promise<Result>,
  success: string,
  values?: Record<string, string>,
): Promise<FormState> {
  let result: Result;
  try {
    result = await call();
  } catch {
    return { message: UNEXPECTED, values };
  }
  if (!result.ok) {
    return result.error === "INVALID"
      ? { fieldErrors: result.fieldErrors, values }
      : { message: ERRORS[result.error], values };
  }
  revalidatePath("/teacher/materials", "layout");
  return { message: success, ok: true };
}

const NAMES = [
  "title", "summary", "content", "examples", "exercises",
  "sourceReference", "sourcePages", "chapterId", "subchapterId",
] as const;
const read = (fd: FormData) => Object.fromEntries(NAMES.map((n) => [n, field(fd, n)]));

export async function createMaterialAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireTeacher();
  const values = read(formData);
  let id: string | undefined;
  const state = await run(
    async () => {
      const r = await createMaterial(user.id, values);
      if (r.ok) id = r.id;
      return r;
    },
    "Materi disimpan.",
    values,
  );
  if (id) redirect(`/teacher/materials/${id}`);
  return state;
}

export async function updateMaterialAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireTeacher();
  const values = read(formData);
  return run(() => updateMaterial(user.id, id, values), "Materi disimpan.", values);
}

export async function changeMaterialStatusAction(
  id: string,
  to: MaterialStatus,
): Promise<FormState> {
  const user = await requireTeacher();
  return run(() => changeMaterialStatus(user.id, id, to), "Status materi diubah.");
}

export async function moveMaterialAction(id: string, dir: "up" | "down"): Promise<FormState> {
  await requireTeacher();
  return run(() => moveMaterial(id, dir), "Urutan materi diubah.");
}

export async function deleteMaterialAction(id: string): Promise<FormState> {
  const user = await requireTeacher();
  const state = await run(() => deleteMaterial(user.id, id), "Materi dihapus.");
  if (state?.ok) redirect("/teacher/materials");
  return state;
}

export async function updateImageMetaAction(
  imageId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireTeacher();
  const values = {
    altText: field(formData, "altText"),
    caption: field(formData, "caption"),
    sourceReference: field(formData, "sourceReference"),
  };
  return run(
    async () => {
      const r = await updateImageMeta(imageId, values);
      return r.ok || r.error === "INVALID" ? r : { ok: false, error: "IMAGE_NOT_FOUND" };
    },
    "Gambar disimpan.",
    values,
  );
}

export async function removeImageAction(imageId: string): Promise<FormState> {
  const user = await requireTeacher();
  return run(async () => {
    const r = await removeImage(user.id, imageId);
    return r.ok ? r : { ok: false, error: "IMAGE_NOT_FOUND" };
  }, "Gambar dihapus.");
}
