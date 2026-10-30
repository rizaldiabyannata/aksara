import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Search01Icon,
  UserAdd01Icon,
  UserGroupIcon,
  UserShield01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { requireTeacher } from "@/lib/auth/guard";
import { listClasses } from "@/lib/classes";
import { formatWita } from "@/lib/format";
import { listStudents } from "@/lib/students";
import {
  CreateStudentForm,
  EditStudentDialog,
  RevokeStudentButton,
  ToggleStudentActiveButton,
} from "./student-forms";

export const metadata: Metadata = { title: "Kelola Siswa" };

type Params = Promise<Record<string, string | string[] | undefined>>;

export default function StudentsPage({ searchParams }: { searchParams: Params }) {
  return (
    <div className="max-w-[1360px] mx-auto flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-canvas-peach-subtle via-[#ffe6d6] to-canvas-peach p-6 md:p-8 border border-amber-200/60 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col gap-3 z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 w-fit px-3 py-1 rounded-full bg-white/80 backdrop-blur-sm text-primary-strong shadow-xs">
            <HugeiconsIcon icon={UserShield01Icon} className="size-[18px]" aria-hidden="true" />
            <span className="font-label-sm text-xs font-bold uppercase tracking-wider">Panel Administrasi Siswa Kelas VI</span>
          </div>
          <h1 className="font-headline-xl text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight">
            Kelola Siswa
          </h1>
          <p className="font-body-lg text-base text-text-muted leading-relaxed">
            Tambah siswa, cari, dan atur sesi masuk mereka.
          </p>
        </div>
      </div>
      <Suspense fallback={<p>Memuat…</p>}>
        <StudentList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
const initials = (n: string) =>
  n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

// searchParams is request data, so it is read here inside Suspense.
async function StudentList({ searchParams }: { searchParams: Params }) {
  await requireTeacher();
  const sp = await searchParams;
  const kelas = one(sp.kelas);
  const q = one(sp.q);
  const [allClasses, students] = await Promise.all([
    listClasses(),
    listStudents({ classId: kelas || undefined, q: q || undefined }),
  ]);
  // Never pass the class code to client components.
  const classes = allClasses.map((c) => ({ id: c.id, name: c.name, isActive: c.isActive }));
  const activeCount = students.filter((s) => s.isActive).length;
  const warned = students.filter((s) => s.replacedCount7d > 0);
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-stone-200/60 shadow-xs flex items-center justify-between transition-all hover:shadow-md">
          <div className="flex flex-col gap-1">
            <span className="font-label-sm text-xs text-text-muted uppercase tracking-wider font-semibold">Siswa Ditampilkan</span>
            <div className="flex items-baseline gap-1.5 my-0.5">
              <span className="font-headline-xl text-3xl font-extrabold text-text-primary">{students.length}</span>
              <span className="font-label-md text-sm text-text-muted font-medium">Siswa</span>
            </div>
            <span className="font-label-sm text-xs text-tone-info font-semibold">{kelas || q ? "sesuai pencarian" : "semua kelas"}</span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-tone-info-bg text-tone-info flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={UserGroupIcon} className="size-[30px]" aria-hidden="true" />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-stone-200/60 shadow-xs flex items-center justify-between transition-all hover:shadow-md">
          <div className="flex flex-col gap-1">
            <span className="font-label-sm text-xs text-text-muted uppercase tracking-wider font-semibold">Siswa Aktif</span>
            <div className="flex items-baseline gap-1.5 my-0.5">
              <span className="font-headline-xl text-3xl font-extrabold text-tone-success">{activeCount}</span>
              <span className="font-label-md text-sm text-tone-success font-medium">Siswa Aktif</span>
            </div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-tone-success-bg text-tone-success flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-[30px]" aria-hidden="true" />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-amber-200/70 shadow-xs flex items-center justify-between transition-all hover:shadow-md">
          <div className="flex flex-col gap-1">
            <span className="font-label-sm text-xs text-tertiary uppercase tracking-wider font-semibold">Peringatan Sesi Ganda</span>
            <div className="flex items-baseline gap-1.5 my-0.5">
              <span className="font-headline-xl text-3xl font-extrabold text-tone-warning">{warned.length}</span>
              <span className="font-label-md text-sm text-tertiary font-medium">Perlu Ditinjau</span>
            </div>
            {warned[0] && (
              <span className="font-label-sm text-xs text-tone-warning font-semibold">
                {warned[0].displayName} (Kelas {warned[0].className})
              </span>
            )}
          </div>
          <div className="w-14 h-14 rounded-2xl bg-tone-warning-bg text-tone-warning flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={Alert02Icon} className="size-[30px]" aria-hidden="true" />
          </div>
        </div>
      </div>

      <form
        method="get"
        className="w-full bg-white rounded-2xl p-5 md:p-6 border border-stone-200/60 shadow-xs flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between"
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative min-w-[220px]">
            <label htmlFor="filter-kelas" className="sr-only">Kelas</label>
            <select
              id="filter-kelas"
              name="kelas"
              defaultValue={kelas}
              className="w-full h-11 pl-4 pr-10 rounded-xl bg-[#f7f3f1] border border-stone-200/60 text-text-primary font-label-md text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-container focus:bg-white transition-all cursor-pointer"
            >
              <option value="">Semua kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="relative flex-1 flex items-center">
            <HugeiconsIcon icon={Search01Icon} className="absolute left-3.5 size-5 text-stone-400" aria-hidden="true" />
            <label htmlFor="filter-q" className="sr-only">Cari nama atau NIS</label>
            <input
              id="filter-q"
              name="q"
              type="text"
              defaultValue={q}
              autoComplete="off"
              placeholder="Cari nama atau NIS siswa..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#f7f3f1] border border-stone-200/60 text-text-primary font-body-md text-xs placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary-container focus:bg-white transition-all"
            />
          </div>
        </div>
        <button
          type="submit"
          className="h-11 px-5 bg-primary-container text-white font-label-md text-xs font-bold rounded-xl shadow-[0_4px_12px_rgba(255,112,52,0.25)] hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap focus-visible:ring-[3px] focus-visible:ring-ring outline-none"
        >
          Cari
        </button>
      </form>

      <div className="w-full bg-white rounded-2xl p-6 border border-amber-200 shadow-sm">
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-stone-100">
          <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary-strong flex items-center justify-center">
            <HugeiconsIcon icon={UserAdd01Icon} className="size-[22px]" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-headline-sm text-base font-bold text-text-primary">Tambah siswa</h2>
            <span className="font-body-md text-xs text-text-muted">Nama siswa dipakai untuk masuk tanpa sandi, bersama kode kelas</span>
          </div>
        </div>
        <CreateStudentForm
          classes={classes}
          defaultClassId={classes.some((c) => c.id === kelas) ? kelas : undefined}
        />
      </div>

      {students.length === 0 && (
        <p className="text-muted-foreground">
          {kelas || q ? "Tidak ada siswa yang cocok." : "Belum ada siswa. Tambah siswa di atas."}
        </p>
      )}
      <ul className="flex flex-col gap-4">
        {students.map((s) => {
          const warn = s.replacedCount7d > 0 && s.lastReplacedAt;
          return (
            <li
              key={s.id}
              className={`bg-white rounded-2xl p-5 md:p-6 shadow-xs hover:shadow-md transition-all flex flex-col gap-4 min-w-0 ${warn ? "border-2 border-amber-300/80" : "border border-stone-200/70"}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    aria-hidden="true"
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-headline-md text-base font-bold ${warn ? "bg-tone-warning-bg text-tone-warning" : "bg-tone-info-bg text-tone-info"}`}
                  >
                    {initials(s.displayName)}
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-headline-sm text-base font-bold text-text-primary break-words">{s.displayName}</h2>
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 text-text-muted font-label-sm text-[11px] font-semibold">NIS: {s.nis ?? "-"}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-canvas-peach-subtle text-primary-strong font-label-sm text-xs font-bold">Kelas {s.className}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-text-muted font-body-md text-xs">
                      {s.isActive ? (
                        <span className="inline-flex items-center gap-1.5 text-tone-success font-semibold">
                          <span className="w-2 h-2 rounded-full bg-tone-success" aria-hidden="true"></span> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-stone-500 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-stone-400" aria-hidden="true"></span> Nonaktif
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0 sm:self-center">
                  <EditStudentDialog
                    student={{ id: s.id, displayName: s.displayName, nis: s.nis, classId: s.classId }}
                    classes={classes}
                  />
                  <RevokeStudentButton studentId={s.id} />
                  <ToggleStudentActiveButton studentId={s.id} isActive={s.isActive} />
                </div>
              </div>
              {warn && s.lastReplacedAt && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-tone-warning-bg border border-amber-200">
                  <HugeiconsIcon icon={Alert02Icon} className="size-5 shrink-0 mt-0.5 text-tone-warning" aria-hidden="true" />
                  <p className="font-body-md text-xs text-text-primary">
                    <strong>Peringatan: </strong>
                    Masuk dari perangkat lain {s.replacedCount7d}× dalam 7 hari terakhir, terakhir{" "}
                    {formatWita(s.lastReplacedAt)}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
