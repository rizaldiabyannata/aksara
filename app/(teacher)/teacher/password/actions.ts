"use server";

import { redirect } from "next/navigation";
import { requireTeacher, setSessionCookie } from "@/lib/auth/guard";
import { changeTeacherPassword } from "@/lib/auth/login";
import { field, type FormState } from "@/lib/form-state";

export async function changePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireTeacher({ allowPasswordChange: true });
  let result: Awaited<ReturnType<typeof changeTeacherPassword>>;
  try {
    result = await changeTeacherPassword(user.id, {
      currentPassword: field(formData, "currentPassword"),
      newPassword: field(formData, "newPassword"),
      confirmPassword: field(formData, "confirmPassword"),
    });
  } catch {
    return { message: "Ada masalah. Coba lagi sebentar lagi." };
  }
  if (!result.ok) {
    if (result.error === "WRONG_PASSWORD") return { message: "Kata sandi lama salah." };
    if (result.error === "THROTTLED") {
      return { message: "Terlalu banyak percobaan. Tunggu 15 menit, lalu coba lagi." };
    }
    const { form, ...fieldErrors } = result.fieldErrors ?? {};
    return { message: form, fieldErrors };
  }
  await setSessionCookie(result.token, result.expiresAt);
  redirect("/teacher");
}
