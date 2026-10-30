import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft01Icon, ArrowRight01Icon, Download04Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ConfirmAction } from "@/components/confirm-action";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { getClassDay, isDate, witaToday } from "@/lib/attendance";
import { requireTeacher } from "@/lib/auth/guard";
import { listClasses } from "@/lib/classes";
import { removeHolidayAction } from "./actions";
import { AttendanceForm, HolidayForm } from "./attendance-form";

export const metadata: Metadata = { title: "Absensi" };

type Params = Promise<Record<string, string | string[] | undefined>>;

export default function AttendancePage({ searchParams }: { searchParams: Params }) {
  return (
    <div className="p-space-lg max-w-[960px] mx-auto w-full flex flex-col gap-6">
      <PageHeader title="Absensi" description="Catat kehadiran siswa setiap hari sekolah. Hari Minggu otomatis libur." />
      <Suspense fallback={<p>Memuat…</p>}>
        <AttendanceDay searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
const shift = (d: string, days: number) =>
  new Date(Date.parse(`${d}T00:00:00Z`) + days * 86400_000).toISOString().slice(0, 10);
const longDate = (d: string) =>
  new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${d}T00:00:00Z`),
  );
const monthName = (d: string) =>
  new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));

const SELECT =
  "h-11 w-full rounded-xl border-2 border-input bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring";
const LINK =
  "inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border-2 border-input bg-card px-3 text-sm font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring outline-none";

async function AttendanceDay({ searchParams }: { searchParams: Params }) {
  await requireTeacher();
  const sp = await searchParams;
  const now = new Date();
  const classes = (await listClasses()).filter((c) => c.isActive);
  if (!classes.length) {
    return (
      <p>
        Belum ada kelas aktif.{" "}
        <Link href="/teacher/classes" className="underline underline-offset-4">Buat kelas dulu</Link>.
      </p>
    );
  }
  const classId = classes.some((c) => c.id === one(sp.class)) ? one(sp.class) : classes[0]!.id;
  const today = witaToday(now);
  const date = isDate(one(sp.date)) ? one(sp.date) : today;
  const day = await getClassDay(classId, date, now);
  if (!day) return <p>Kelas tidak ditemukan.</p>;
  const href = (d: string) => `/teacher/attendance?class=${classId}&date=${d}`;

  return (
    <>
      <form method="get" className="bg-white rounded-2xl p-5 border border-stone-200/60 shadow-xs flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="att-class" className="text-xs font-bold">Kelas</label>
            <select id="att-class" name="class" defaultValue={classId} className={SELECT}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="att-date" className="text-xs font-bold">Tanggal</label>
            <input id="att-date" name="date" type="date" defaultValue={date} max={today} className={SELECT} />
          </div>
          <button type="submit" className={LINK}>Tampilkan</button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href={href(shift(date, -1))} className={LINK}>
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" aria-hidden="true" />
            Kemarin
          </Link>
          <p className="font-bold text-center">{longDate(date)}</p>
          {date < today ? (
            <Link href={href(shift(date, 1))} className={LINK}>
              Besok
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <span className="w-[92px]" aria-hidden="true" />
          )}
        </div>
      </form>

      {day.state === "SUNDAY" && <Status tone="info">Hari Minggu libur. Absensi tidak perlu diisi.</Status>}
      {day.state === "FUTURE" && <Status tone="neutral">Tanggal ini belum datang. Absensi bisa diisi pada harinya.</Status>}
      {day.state === "HOLIDAY" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-5 border border-stone-200/60">
          <Status tone="info">Libur: {day.note}</Status>
          <ConfirmAction
            action={removeHolidayAction.bind(null, date)}
            trigger="Batalkan libur"
            title="Batalkan libur tanggal ini?"
            description="Tanggal ini menjadi hari sekolah lagi. Absensi yang pernah diisi untuk tanggal ini muncul kembali."
            confirm="Ya, batalkan libur"
          />
        </div>
      )}

      {day.state === "OPEN" &&
        (day.students.length ? (
          <AttendanceForm key={`${classId}-${date}`} classId={classId} date={date} students={day.students} />
        ) : (
          <p>Belum ada siswa aktif di kelas {day.className}.</p>
        ))}

      {(day.state === "OPEN" || day.state === "FUTURE") && (
        <details className="bg-white rounded-2xl p-5 border border-stone-200/60">
          <summary className="cursor-pointer font-bold min-h-11 flex items-center">Tanggal ini hari libur?</summary>
          <div className="pt-3">
            <HolidayForm key={date} date={date} />
          </div>
        </details>
      )}

      <a
        href={`/api/attendance-exports/${classId}?month=${date.slice(0, 7)}`}
        className={`${LINK} self-start`}
      >
        <HugeiconsIcon icon={Download04Icon} className="size-4" aria-hidden="true" />
        Unduh rekap {monthName(date)} (Excel)
      </a>
    </>
  );
}
