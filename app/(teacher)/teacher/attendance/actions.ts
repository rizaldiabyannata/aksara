"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth/guard";
import { removeHoliday, saveAttendance, setHoliday, type DayState } from "@/lib/attendance";
import { field, type FormState } from "@/lib/form-state";

const UNEXPECTED = "Ada masalah. Coba lagi sebentar lagi.";
const CLOSED: Record<Exclude<DayState, "OPEN">, string> = {
  SUNDAY: "Hari Minggu libur, absensi tidak perlu diisi.",
  HOLIDAY: "Tanggal ini hari libur, absensi tidak perlu diisi.",
  FUTURE: "Absensi tanggal yang belum datang belum bisa diisi.",
};

const done = (message: string): FormState => {
  revalidatePath("/teacher/attendance");
  revalidatePath("/teacher");
  return { ok: true, message };
};

export async function saveAttendanceAction(
  classId: string,
  date: string,
  marks: { studentId: string; status: string }[],
): Promise<FormState> {
  const user = await requireTeacher();
  let r: Awaited<ReturnType<typeof saveAttendance>>;
  try {
    r = await saveAttendance(user.id, { classId, date, marks }, new Date());
  } catch {
    return { message: UNEXPECTED };
  }
  if (!r.ok) {
    return { message: r.error === "CLOSED" ? CLOSED[r.state as Exclude<DayState, "OPEN">] : Object.values(r.fieldErrors)[0] };
  }
  return done(`Absensi ${r.saved} siswa disimpan.`);
}

export async function setHolidayAction(date: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireTeacher();
  const values = { note: field(fd, "note") };
  let r: Awaited<ReturnType<typeof setHoliday>>;
  try {
    r = await setHoliday(user.id, { date, note: values.note });
  } catch {
    return { message: UNEXPECTED, values };
  }
  if (!r.ok) return { fieldErrors: r.fieldErrors, values };
  return done("Tanggal ini ditandai libur.");
}

export async function removeHolidayAction(date: string): Promise<FormState> {
  const user = await requireTeacher();
  try {
    const r = await removeHoliday(user.id, date);
    if (!r.ok) return { message: Object.values(r.fieldErrors)[0] };
  } catch {
    return { message: UNEXPECTED };
  }
  return done("Libur dibatalkan.");
}
