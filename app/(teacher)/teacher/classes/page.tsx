import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Add01Icon,
  AutoConversationsIcon,
  DoorIcon,
  LibraryIcon,
  LockPasswordIcon,
  PauseCircleIcon,
  PinCodeIcon,
  School01Icon,
  Shield01Icon,
  Tv01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { requireTeacher } from "@/lib/auth/guard";
import { attendanceToday } from "@/lib/attendance";
import { listClasses } from "@/lib/classes";
import {
  CreateClassForm,
  RenameClassForm,
  RevokeSessionsButton,
  RotateCodeButton,
  ToggleActiveButton,
} from "./class-forms";
import { ClassCodeDialog } from "./class-code-dialog";

export const metadata: Metadata = { title: "Kelola Kelas" };

export default function ClassesPage() {
  return (
    <div className="max-w-[1360px] mx-auto flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-canvas-peach-subtle via-[#ffe6d6] to-canvas-peach p-6 md:p-8 border border-amber-200/60 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col gap-3 z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 w-fit px-3 py-1 rounded-full bg-white/80 backdrop-blur-sm text-primary-strong shadow-xs">
            <HugeiconsIcon icon={School01Icon} className="size-[18px]" aria-hidden="true" />
            <span className="font-label-sm text-xs font-bold uppercase tracking-wider">Administrasi Ruang Kelas &amp; Kode Ujian</span>
          </div>
          <h1 className="font-headline-xl text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight">
            Kelola Kelas &amp; Sesi Ujian Siswa
          </h1>
          <p className="font-body-lg text-base text-text-muted leading-relaxed">
            Atur kelas, kode masuk, dan sesi siswa dengan aman, termasuk saat layar diproyeksikan.
          </p>
        </div>
      </div>
      <Suspense fallback={<p>Memuat…</p>}>
        <ClassList />
      </Suspense>
    </div>
  );
}

const STEPS = [
  { icon: Tv01Icon, tone: "text-primary-strong", t: "1. Klik 'Tampilkan Kode'", d: "Buka popup berhuruf ekstra besar agar siswa di bangku belakang mudah melihat." },
  { icon: AutoConversationsIcon, tone: "text-tone-info", t: "2. Ganti kode jika bocor", d: "Kode lama tidak bisa dipakai lagi. Siswa yang sudah masuk tetap masuk." },
  { icon: LockPasswordIcon, tone: "text-tone-danger", t: "3. Keluarkan Semua Siswa", d: "Gunakan setelah sesi selesai agar semua siswa kelas itu keluar dan harus masuk lagi dengan kode." },
];

async function ClassList() {
  await requireTeacher();
  const [classes, attendance] = await Promise.all([listClasses(), attendanceToday(new Date())]);
  const hadir = new Map(attendance.map((a) => [a.classId, a]));
  const active = classes.filter((c) => c.isActive).length;
  const total = classes.reduce((n, c) => n + c.studentCount, 0);
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-stone-200/60 shadow-xs flex items-center justify-between transition-all hover:shadow-md">
          <div className="flex flex-col gap-1">
            <span className="font-label-sm text-xs text-text-muted uppercase tracking-wider font-semibold">Kelas Berjalan</span>
            <div className="flex items-baseline gap-1.5 my-0.5">
              <span className="font-headline-xl text-3xl font-extrabold text-text-primary">{active}</span>
              <span className="font-label-md text-sm text-text-muted font-medium">Kelas Aktif</span>
            </div>
            <span className="font-label-sm text-xs text-tone-info font-semibold">dari {classes.length} kelas</span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-tone-info-bg text-tone-info flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={DoorIcon} className="size-[30px]" aria-hidden="true" />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-stone-200/60 shadow-xs flex items-center justify-between transition-all hover:shadow-md">
          <div className="flex flex-col gap-1">
            <span className="font-label-sm text-xs text-text-muted uppercase tracking-wider font-semibold">Siswa Terdata</span>
            <div className="flex items-baseline gap-1.5 my-0.5">
              <span className="font-headline-xl text-3xl font-extrabold text-primary-strong">{total}</span>
              <span className="font-label-md text-sm text-text-muted font-medium">Total Siswa</span>
            </div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-canvas-peach-subtle text-primary-strong flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={UserGroupIcon} className="size-[30px]" aria-hidden="true" />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-6 border border-stone-200/60 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4 max-w-xl">
            <div className="w-12 h-12 rounded-xl bg-primary-container text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <HugeiconsIcon icon={Add01Icon} className="size-[26px]" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <h2 className="font-headline-sm text-base font-bold text-text-primary">Buka Rombongan Belajar Baru</h2>
              <p className="font-body-md text-sm text-text-muted">
                Buat kelas baru, lalu bagikan kode masuknya kepada siswa.
              </p>
            </div>
          </div>
          <CreateClassForm />
        </div>
      </div>
      {classes.length === 0 && (
        <p className="text-muted-foreground">Belum ada kelas. Buat kelas pertama di atas.</p>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <ul className="lg:col-span-8 flex flex-col gap-6">
          {classes.map((c) =>
            c.isActive ? (
              <li key={c.id} className="min-w-0 bg-white rounded-2xl p-6 md:p-7 shadow-xs border border-stone-200/60 flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-tone-success-bg text-tone-success flex items-center justify-center shrink-0">
                      <HugeiconsIcon icon={LibraryIcon} className="size-[26px]" aria-hidden="true" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2.5">
                        <h2 className="font-headline-md text-lg font-bold text-text-primary">{c.name}</h2>
                        <span className="px-2.5 py-0.5 rounded-full bg-tone-success-bg text-tone-success font-label-sm text-xs font-bold inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-tone-success" aria-hidden="true"></span> Aktif
                        </span>
                      </div>
                      <span className="font-body-md text-xs text-text-muted">{c.studentCount} Siswa terdaftar</span>
                      <span className="font-body-md text-xs text-tone-success font-semibold">Hadir hari ini {hadir.get(c.id)?.present ?? 0}/{hadir.get(c.id)?.total ?? 0}</span>
                    </div>
                  </div>
                </div>
                {/* Masked: this page may be projected. The dialog reveals the code. */}
                <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-stone-500 font-label-sm text-xs font-semibold uppercase tracking-wider">
                      <HugeiconsIcon icon={PinCodeIcon} className="size-4 text-primary-strong" aria-hidden="true" />
                      <span>Kode Masuk Ujian</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-code-mono text-2xl font-bold tracking-widest text-text-primary">
                        <span className="sr-only">Kode kelas disembunyikan. Tekan Tampilkan kode.</span>
                        <span aria-hidden="true">••••••</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-amber-200 text-primary-strong font-label-sm text-xs font-semibold">Terselubung Proyektor</span>
                    </div>
                    <span className="font-body-md text-xs text-stone-500">Aman saat layar laptop guru disambungkan ke infocus kelas.</span>
                  </div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <ClassCodeDialog name={c.name} code={c.code} />
                    <RotateCodeButton classId={c.id} />
                  </div>
                </div>
                <div className="bg-[#fbf9f8] border border-stone-200/60 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <RenameClassForm classId={c.id} name={c.name} />
                  <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
                    <RevokeSessionsButton classId={c.id} />
                    <ToggleActiveButton classId={c.id} isActive={c.isActive} />
                  </div>
                </div>
              </li>
            ) : (
              <li key={c.id} className="min-w-0 bg-white rounded-2xl p-5 border border-stone-200/60 shadow-xs opacity-90 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-stone-100 text-stone-400 flex items-center justify-center shrink-0">
                      <HugeiconsIcon icon={PauseCircleIcon} className="size-6" aria-hidden="true" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <h2 className="font-headline-md text-base font-bold text-text-primary">{c.name}</h2>
                        <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 font-label-sm text-xs font-semibold">Nonaktif</span>
                      </div>
                      <span className="font-body-md text-xs text-text-muted">{c.studentCount} Siswa terdaftar</span>
                    </div>
                  </div>
                  <ToggleActiveButton classId={c.id} isActive={c.isActive} />
                </div>
                <div className="bg-[#fbf9f8] border border-stone-200/60 rounded-xl p-4">
                  <RenameClassForm classId={c.id} name={c.name} />
                </div>
              </li>
            ),
          )}
        </ul>
        <aside className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white rounded-2xl p-6 border border-stone-200/60 shadow-xs flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-tone-warning-bg text-tertiary flex items-center justify-center shrink-0">
                <HugeiconsIcon icon={Shield01Icon} className="size-6" aria-hidden="true" />
              </div>
              <div className="flex flex-col">
                <h2 className="font-headline-sm text-base font-bold text-text-primary leading-tight">Panduan Proyektor &amp; Keamanan</h2>
                <span className="font-label-sm text-xs text-text-muted">Prosedur ruang kelas ujian</span>
              </div>
            </div>
            <p className="font-body-md text-xs text-text-muted leading-relaxed">
              Kode kelas sengaja disamarkan (••••••) agar aman saat layar laptop guru ditayangkan ke infocus / proyektor kelas.
            </p>
            <ol className="flex flex-col gap-2.5 pt-1">
              {STEPS.map(({ icon, tone, t, d }) => (
                <li key={t} className="p-3.5 rounded-xl bg-canvas-peach/80 border border-amber-100 flex items-start gap-3">
                  <HugeiconsIcon icon={icon} className={`size-5 shrink-0 mt-0.5 ${tone}`} aria-hidden="true" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-label-md text-xs font-bold text-text-primary">{t}</span>
                    <span className="font-body-md text-xs text-stone-500 leading-normal">{d}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </>
  );
}
