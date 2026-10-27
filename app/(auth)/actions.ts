"use server";

import { redirect } from "next/navigation";
import {
  clearSessionCookie,
  getRequestIp,
  readSessionToken,
  setSessionCookie,
} from "@/lib/auth/guard";
import { loginStudent, loginTeacher, logout, type LoginResult } from "@/lib/auth/login";
import { findSession } from "@/lib/auth/session";
import { field, type FormState } from "@/lib/form-state";

const THROTTLED = "Terlalu banyak percobaan. Tunggu 15 menit, lalu coba lagi.";
const UNEXPECTED = "Ada masalah. Coba lagi sebentar lagi.";

// Login is the one action without a guard: it is how a session starts.
async function attempt(login: () => Promise<LoginResult>, invalid: string) {
  try {
    const result = await login();
    if (result.ok) await setSessionCookie(result.token, result.expiresAt);
    return result.ok
      ? result
      : { message: result.error === "THROTTLED" ? THROTTLED : invalid };
  } catch {
    return { message: UNEXPECTED };
  }
}

export async function loginStudentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ip = await getRequestIp();
  const result = await attempt(
    () =>
      loginStudent({
        classCode: field(formData, "classCode"),
        identity: field(formData, "identity"),
        ip,
      }),
    "Kode kelas atau nama/NIS tidak cocok.",
  );
  if (!("ok" in result)) return result;
  redirect("/student");
}

export async function loginTeacherAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ip = await getRequestIp();
  const result = await attempt(
    () =>
      loginTeacher({
        username: field(formData, "username"),
        password: field(formData, "password"),
        ip,
      }),
    "Username atau kata sandi salah.",
  );
  if (!("ok" in result)) return result;
  redirect(result.mustChangePassword ? "/teacher/password" : "/teacher");
}

export async function logoutAction(): Promise<void> {
  const token = await readSessionToken();
  let isTeacher = false;
  try {
    if (token) {
      const s = await findSession(token);
      isTeacher = s.status === "ok" && s.user.role === "TEACHER";
      await logout(token);
    }
  } finally {
    // Even if the DB call fails, this device must end up logged out.
    await clearSessionCookie();
  }
  redirect(isTeacher ? "/teacher/login" : "/login");
}
