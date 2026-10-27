"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth/guard";
import {
  deleteChapter,
  deleteSubchapter,
  deleteSubject,
  moveChapter,
  moveSubchapter,
  saveChapter,
  saveSubchapter,
  saveSubject,
} from "@/lib/subjects";
import { field, type FormState } from "@/lib/form-state";

const UNEXPECTED = "Ada masalah. Coba lagi sebentar lagi.";
const ERRORS = {
  NAME_TAKEN: "Nama mapel ini sudah dipakai.",
  NOT_FOUND: "Data tidak ditemukan. Muat ulang halaman.",
};

type Result =
  | { ok: true }
  | { ok: false; error: "INVALID"; fieldErrors: Record<string, string> }
  | { ok: false; error: "IN_USE"; message: string }
  | { ok: false; error: keyof typeof ERRORS };

// Only the domain call is inside try; the guard and revalidate stay outside.
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
    if (result.error === "INVALID") return { fieldErrors: result.fieldErrors, values };
    if (result.error === "IN_USE") return { message: result.message, values };
    return { message: ERRORS[result.error], values };
  }
  revalidatePath("/teacher/subjects");
  return { message: success, ok: true };
}

export async function saveSubjectAction(
  id: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireTeacher();
  const values = { name: field(formData, "name"), description: field(formData, "description") };
  return run(() => saveSubject(id, values), "Mapel disimpan.", values);
}

export async function deleteSubjectAction(id: string): Promise<FormState> {
  await requireTeacher();
  return run(() => deleteSubject(id), "Mapel dihapus.");
}

export async function saveChapterAction(
  subjectId: string,
  id: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireTeacher();
  const values = {
    title: field(formData, "title"),
    sourceBook: field(formData, "sourceBook"),
    sourceYearOrEdition: field(formData, "sourceYearOrEdition"),
  };
  return run(() => saveChapter(subjectId, id, values), "Bab disimpan.", values);
}

export async function moveChapterAction(id: string, dir: "up" | "down"): Promise<FormState> {
  await requireTeacher();
  return run(() => moveChapter(id, dir), "Urutan bab diubah.");
}

export async function deleteChapterAction(id: string): Promise<FormState> {
  await requireTeacher();
  return run(() => deleteChapter(id), "Bab dihapus.");
}

export async function saveSubchapterAction(
  chapterId: string,
  id: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireTeacher();
  const values = { title: field(formData, "title"), sourcePages: field(formData, "sourcePages") };
  return run(() => saveSubchapter(chapterId, id, values), "Subbab disimpan.", values);
}

export async function moveSubchapterAction(id: string, dir: "up" | "down"): Promise<FormState> {
  await requireTeacher();
  return run(() => moveSubchapter(id, dir), "Urutan subbab diubah.");
}

export async function deleteSubchapterAction(id: string): Promise<FormState> {
  await requireTeacher();
  return run(() => deleteSubchapter(id), "Subbab dihapus.");
}
