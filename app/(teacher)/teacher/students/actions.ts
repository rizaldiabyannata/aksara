"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth/guard";
import { field, type FormState } from "@/lib/form-state";
import {
  createStudent,
  revokeStudentSessions,
  setStudentActive,
  updateStudent,
} from "@/lib/students";

const UNEXPECTED = "Ada masalah. Coba lagi sebentar lagi.";
const ERRORS = {
  NIS_TAKEN: "NIS ini sudah dipakai siswa lain.",
  CLASS_NOT_FOUND: "Kelas tidak ditemukan.",
  NOT_FOUND: "Siswa tidak ditemukan.",
};

type Result =
  | { ok: true }
  | { ok: false; error: "INVALID"; fieldErrors: Record<string, string> }
  | { ok: false; error: "NAME_TAKEN"; className: string }
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
    if (result.error === "INVALID") return { fieldErrors: result.fieldErrors };
    if (result.error === "NAME_TAKEN") {
      return {
        message: `Nama ini sudah dipakai siswa lain di kelas ${result.className}. Tambahkan inisial, misalnya 'Ahmad R'.`,
      };
    }
    return { message: ERRORS[result.error] };
  }
  revalidatePath("/teacher/students");
  return { message: success, ok: true };
}

const input = (fd: FormData) => ({
  displayName: field(fd, "displayName"),
  nis: field(fd, "nis"),
  classId: field(fd, "classId"),
});

export async function createStudentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireTeacher();
  return run(() => createStudent(user.id, input(formData)), "Siswa ditambahkan.");
}

export async function updateStudentAction(
  studentId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireTeacher();
  return run(() => updateStudent(user.id, studentId, input(formData)), "Data siswa disimpan.");
}

export async function revokeStudentSessionsAction(studentId: string): Promise<FormState> {
  const user = await requireTeacher();
  return run(
    () => revokeStudentSessions(user.id, studentId),
    "Siswa sudah dikeluarkan dari semua perangkat.",
  );
}

export async function setStudentActiveAction(
  studentId: string,
  active: boolean,
): Promise<FormState> {
  const user = await requireTeacher();
  return run(
    () => setStudentActive(user.id, studentId, active),
    active ? "Siswa diaktifkan." : "Siswa dinonaktifkan.",
  );
}
