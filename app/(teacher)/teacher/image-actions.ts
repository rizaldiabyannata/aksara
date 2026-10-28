"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth/guard";
import { field, type FormState } from "@/lib/form-state";
import { removeImage, updateImageMeta } from "@/lib/images";

const UNEXPECTED = "Ada masalah. Coba lagi sebentar lagi.";
const ERRORS = {
  IMAGE_NOT_FOUND: "Gambar tidak ditemukan. Muat ulang halaman.",
};

type Result =
  | { ok: true }
  | { ok: false; error: "INVALID"; fieldErrors: Record<string, string> }
  | { ok: false; error: keyof typeof ERRORS };

// Image metadata and removal actions, used by the shared image panel. Only the domain call is inside try.
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
  revalidatePath("/teacher", "layout");
  return { message: success, ok: true };
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
