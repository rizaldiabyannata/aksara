import { z } from "zod";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { Prisma, type AttendanceStatus } from "@/lib/generated/prisma/client";
import { parse, type Invalid } from "@/lib/validation";

const WITA_MS = 8 * 3600_000;

export type DayState = "OPEN" | "SUNDAY" | "HOLIDAY" | "FUTURE";

/** Today's WITA calendar date as YYYY-MM-DD. */
export const witaToday = (now: Date) => new Date(now.getTime() + WITA_MS).toISOString().slice(0, 10);

// A @db.Date column round-trips as UTC midnight.
const asDate = (d: string) => new Date(`${d}T00:00:00Z`);
const ymd = (d: Date) => d.toISOString().slice(0, 10);

export const isSunday = (d: string) => asDate(d).getUTCDay() === 0;

const DATE_MSG = "Tanggal tidak valid.";
const date = z
  .string({ error: DATE_MSG })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: DATE_MSG })
  .refine((d) => !Number.isNaN(asDate(d).getTime()) && ymd(asDate(d)) === d, { error: DATE_MSG });

export const isDate = (d: string) => date.safeParse(d).success;

function stateOf(d: string, today: string, holiday: boolean): DayState {
  if (isSunday(d)) return "SUNDAY";
  if (holiday) return "HOLIDAY";
  if (d > today) return "FUTURE";
  return "OPEN";
}

export async function dayState(d: string, now: Date): Promise<{ state: DayState; note: string | null }> {
  const h = await prisma.holiday.findUnique({ where: { date: asDate(d) }, select: { note: true } });
  return { state: stateOf(d, witaToday(now), !!h), note: h?.note ?? null };
}

/** One class on one day: its active students with their mark (null = belum diisi). Null if the class is unknown. */
export async function getClassDay(classId: string, d: string, now: Date) {
  if (!isDate(d)) return null;
  const cls = await prisma.class.findUnique({ where: { id: classId }, select: { id: true, name: true } });
  if (!cls) return null;
  const [day, students] = await Promise.all([
    dayState(d, now),
    prisma.user.findMany({
      where: { role: "STUDENT", isActive: true, classId },
      orderBy: { displayName: "asc" },
      select: {
        id: true, displayName: true, nis: true, studentNo: true,
        attendances: { where: { date: asDate(d) }, select: { status: true } },
      },
    }),
  ]);
  return {
    className: cls.name,
    ...day,
    students: students.map(({ attendances, ...s }) => ({ ...s, status: attendances[0]?.status ?? null })),
  };
}

const saveSchema = z.object(
  {
    classId: z.string().min(1),
    date,
    marks: z
      .array(z.object({ studentId: z.string().min(1), status: z.enum(["HADIR", "SAKIT", "IZIN", "ALPA"]) }))
      .min(1, { error: "Belum ada siswa yang diisi." })
      .max(200),
  },
  { error: "Data absensi tidak lengkap." },
);

/** Upserts the marks for one class and day. Idempotent; refused on Sundays, holidays and future dates. */
export async function saveAttendance(
  actorId: string,
  input: unknown,
  now: Date,
): Promise<{ ok: true; saved: number } | Invalid | { ok: false; error: "CLOSED"; state: DayState }> {
  const p = parse(saveSchema, input);
  if (!p.ok) return p;
  const { classId, date: d, marks } = p.data;
  const { state } = await dayState(d, now);
  if (state !== "OPEN") return { ok: false, error: "CLOSED", state };
  const ids = [...new Set(marks.map((m) => m.studentId))];
  const members = await prisma.user.count({
    where: { id: { in: ids }, role: "STUDENT", isActive: true, classId },
  });
  if (members !== ids.length || ids.length !== marks.length) {
    return { ok: false, error: "INVALID", fieldErrors: { form: "Daftar siswa berubah. Muat ulang halaman." } };
  }
  const date = asDate(d);
  const updatedAt = new Date();
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "Attendance" ("id", "studentId", "date", "status", "recordedById", "updatedAt")
    VALUES ${Prisma.join(marks.map((m) => Prisma.sql`
      (${randomUUID()}, ${m.studentId}, ${date}, ${m.status}::"AttendanceStatus", ${actorId}, ${updatedAt})
    `))}
    ON CONFLICT ("studentId", "date") DO UPDATE SET
      "status" = EXCLUDED."status",
      "recordedById" = EXCLUDED."recordedById",
      "updatedAt" = EXCLUDED."updatedAt"
  `);
  return { ok: true, saved: marks.length };
}

const holidaySchema = z.object(
  {
    date,
    note: z
      .string({ error: "Tulis keterangan libur." })
      .transform((s) => s.replace(/\s+/g, " ").trim())
      .pipe(z.string().min(1, { error: "Tulis keterangan libur." }).max(80, { error: "Keterangan paling banyak 80 huruf." })),
  },
  { error: "Data libur tidak lengkap." },
);

/** Marks a date as a school holiday. Existing marks on that date are kept but ignored while it is a holiday. */
export async function setHoliday(actorId: string, input: unknown): Promise<{ ok: true } | Invalid> {
  const p = parse(holidaySchema, input);
  if (!p.ok) return p;
  const { date: d, note } = p.data;
  await prisma.$transaction(async (tx) => {
    await tx.holiday.upsert({
      where: { date: asDate(d) },
      create: { date: asDate(d), note, createdById: actorId },
      update: { note },
    });
    await writeAudit(tx, { actorUserId: actorId, action: "HOLIDAY_SET", entityType: "Holiday", entityId: d, metadata: { note } });
  });
  return { ok: true };
}

export async function removeHoliday(actorId: string, d: string): Promise<{ ok: true } | Invalid> {
  if (!isDate(d)) return { ok: false, error: "INVALID", fieldErrors: { date: DATE_MSG } };
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.holiday.deleteMany({ where: { date: asDate(d) } });
    if (count) await writeAudit(tx, { actorUserId: actorId, action: "HOLIDAY_REMOVED", entityType: "Holiday", entityId: d });
  });
  return { ok: true };
}

/** Per class, today (WITA): active students, how many are marked, how many are marked HADIR. */
export async function attendanceToday(now: Date) {
  const today = asDate(witaToday(now));
  const students = await prisma.user.findMany({
    where: { role: "STUDENT", isActive: true, classId: { not: null } },
    select: { classId: true, attendances: { where: { date: today }, select: { status: true } } },
  });
  const byClass = new Map<string, { classId: string; present: number; recorded: number; total: number }>();
  for (const s of students) {
    const row = byClass.get(s.classId!) ?? { classId: s.classId!, present: 0, recorded: 0, total: 0 };
    row.total++;
    const status = s.attendances[0]?.status;
    if (status) row.recorded++;
    if (status === "HADIR") row.present++;
    byClass.set(s.classId!, row);
  }
  return [...byClass.values()];
}

export const STATUS_LETTER: Record<AttendanceStatus, string> = { HADIR: "H", SAKIT: "S", IZIN: "I", ALPA: "A" };

/**
 * A class's month (YYYY-MM) for the attendance book. Marks on closed days are dropped.
 * HS (hari sekolah) counts every day that is neither Sunday nor a holiday, future ones included.
 */
export async function monthRecap(classId: string, month: string, now: Date) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const cls = await prisma.class.findUnique({ where: { id: classId }, select: { name: true } });
  if (!cls) return null;
  const [y, m] = month.split("-").map(Number) as [number, number];
  const first = new Date(Date.UTC(y, m - 1, 1));
  const next = new Date(Date.UTC(y, m, 1));
  const [holidays, students] = await Promise.all([
    prisma.holiday.findMany({ where: { date: { gte: first, lt: next } }, orderBy: { date: "asc" } }),
    prisma.user.findMany({
      where: { role: "STUDENT", isActive: true, classId },
      orderBy: { displayName: "asc" },
      select: {
        displayName: true, nis: true, studentNo: true,
        attendances: { where: { date: { gte: first, lt: next } }, select: { date: true, status: true } },
      },
    }),
  ]);
  const notes = new Map(holidays.map((h) => [ymd(h.date), h.note]));
  const today = witaToday(now);
  const days = Array.from({ length: (next.getTime() - first.getTime()) / 86400_000 }, (_, i) => {
    const d = ymd(new Date(first.getTime() + i * 86400_000));
    return { day: i + 1, date: d, state: stateOf(d, today, notes.has(d)), note: notes.get(d) ?? null };
  });
  return {
    className: cls.name,
    month,
    days,
    hs: days.filter((d) => d.state === "OPEN" || d.state === "FUTURE").length,
    students: students.map((s) => {
      const byDate = new Map(s.attendances.map((a) => [ymd(a.date), a.status]));
      const marks = days.map((d) => (d.state === "OPEN" ? (byDate.get(d.date) ?? null) : null));
      const count = (st: AttendanceStatus) => marks.filter((x) => x === st).length;
      return {
        displayName: s.displayName, nis: s.nis, studentNo: s.studentNo, marks,
        sakit: count("SAKIT"), izin: count("IZIN"), alpa: count("ALPA"),
      };
    }),
  };
}
