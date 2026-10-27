"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth/guard";
import {
  createClass,
  renameClass,
  revokeClassSessions,
  rotateClassCode,
  setClassActive,
} from "@/lib/classes";
import { field, type FormState } from "@/lib/form-state";

const UNEXPECTED = "Ada masalah. Coba lagi sebentar lagi.";
const ERRORS = {
  NAME_TAKEN: "Nama kelas ini sudah dipakai.",
  NOT_FOUND: "Kelas tidak ditemukan.",
};

type Result =
  | { ok: true }
  | { ok: false; error: "INVALID"; fieldErrors: Record<string, string> }
  | { ok: false; error: keyof typeof ERRORS };

// Only the domain call is inside try; the guard and revalidate stay outside.
async function run(call: () => Promise<Result>, success: string): Promise<FormState> {
  let result: Result;
  try {
    result = await call();
  } catch {
    return { message: UNEXPECTED };
  }
  if (!result.ok) {
    return result.error === "INVALID"
      ? { fieldErrors: result.fieldErrors }
      : { message: ERRORS[result.error] };
  }
  revalidatePath("/teacher/classes");
  return { message: success };
}

export async function createClassAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireTeacher();
  return run(() => createClass(user.id, { name: field(formData, "name") }), "Kelas dibuat.");
}

export async function renameClassAction(
  classId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireTeacher();
  return run(
    () => renameClass(user.id, classId, { name: field(formData, "name") }),
    "Nama kelas diubah.",
  );
}

export async function rotateClassCodeAction(
  classId: string,
): Promise<FormState> {
  const user = await requireTeacher();
  return run(() => rotateClassCode(user.id, classId), "Kode kelas sudah diganti.");
}

export async function revokeClassSessionsAction(
  classId: string,
): Promise<FormState> {
  const user = await requireTeacher();
  return run(
    () => revokeClassSessions(user.id, classId),
    "Semua siswa kelas ini sudah dikeluarkan dari perangkatnya.",
  );
}

export async function setClassActiveAction(
  classId: string,
  active: boolean,
): Promise<FormState> {
  const user = await requireTeacher();
  return run(
    () => setClassActive(user.id, classId, active),
    active ? "Kelas diaktifkan." : "Kelas dinonaktifkan.",
  );
}
