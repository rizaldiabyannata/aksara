import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  Calendar01Icon, CheckmarkBadge01Icon, CheckmarkCircle02Icon, ChartColumnIcon, Clock01Icon, Edit02Icon,
  File01Icon, PlayCircleIcon, PlusSignCircleIcon, SlidersHorizontalIcon, Table01Icon, Task01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { requireTeacher } from "@/lib/auth/guard";
import { getTeacherDashboard } from "@/lib/dashboard";
import { formatWita } from "@/lib/format";
import { listQuizzes } from "@/lib/quizzes";
import { getSubjectTree } from "@/lib/subjects";
import { POLICY_LABEL } from "./labels";
import { CreateQuizForm } from "./quiz-forms";

export const metadata: Metadata = { title: "Ulangan" };

export default function QuizzesPage() {
  return (
    <section className="flex w-full flex-col px-space-xl py-space-xl">
      <div className="mb-space-xl flex flex-col justify-between gap-space-md lg:flex-row lg:items-center">
        <div className="flex flex-col gap-1">
          <h1 className="font-headline-xl text-headline-xl tracking-tight text-text-primary">Daftar &amp; Penyusunan Ulangan</h1>
          <p className="max-w-3xl font-body-md text-body-md leading-relaxed text-text-muted">
            Susun ulangan, terbitkan ke kelas, lalu lihat hasilnya. Zona waktu: WITA (GMT+8).
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-space-sm">
          <Link
            href="/teacher/quizzes/new"
            className="flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-primary-container px-space-lg font-label-lg text-label-lg text-on-primary shadow-md transition-all hover:opacity-95 lg:hidden"
          >
            <HugeiconsIcon icon={PlusSignCircleIcon} className="size-6" aria-hidden="true" />
            <span>Buat ulangan</span>
          </Link>
        </div>
      </div>
      <Suspense fallback={<p className="text-base">Memuat…</p>}>
        <List />
      </Suspense>
    </section>
  );
}

function Stat({ label, value, hint, icon, box, tone }: {
  label: string; value: number; hint: string; icon: typeof PlayCircleIcon; box: string; tone: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-2xl bg-surface-card p-space-lg shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-text-muted">{label}</span>
          <span className="mt-1 font-headline-lg text-headline-lg text-text-primary">{value} Ulangan</span>
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${box}`}>
          <HugeiconsIcon icon={icon} className="size-[26px]" aria-hidden="true" />
        </div>
      </div>
      <div className={`mt-4 flex items-center gap-1.5 font-label-sm text-label-sm ${tone}`}>
        <HugeiconsIcon icon={Clock01Icon} className="size-[18px]" aria-hidden="true" />
        <span>{hint}</span>
      </div>
    </div>
  );
}

async function List() {
  await requireTeacher();
  const [rows, dash, tree] = await Promise.all([listQuizzes(), getTeacherDashboard(), getSubjectTree()]);
  const subjects = tree.map((s) => ({ id: s.id, name: s.name }));
  const published = rows.filter((r) => r.status === "PUBLISHED").length;
  const released = rows.filter((r) => r.resultsReleasedAt).length;
  const toGrade = dash.tasks.filter((t) => t.kind === "GRADE").length;
  const ghost =
    "flex min-h-12 items-center gap-2 rounded-xl bg-surface-container-high px-4 font-label-sm text-label-sm text-on-surface transition-all hover:bg-canvas-peach-subtle";
  return (
    <>
      <div className="mb-space-xl grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Ulangan Aktif / Terbit" value={published} hint="Sedang berlangsung & terjadwal" icon={PlayCircleIcon} box="bg-tone-success-bg text-tone-success" tone="text-tone-success" />
        <Stat label="Ulangan Draf" value={rows.length - published} hint="Sedang dirakit butir soalnya" icon={File01Icon} box="bg-canvas-peach text-primary-strong" tone="text-text-muted" />
        <Stat label="Memerlukan Penilaian" value={toGrade} hint="Uraian siswa menunggu diperiksa" icon={Edit02Icon} box="bg-tone-warning-bg text-tone-warning" tone="text-tone-warning" />
        <Stat label="Selesai & Rilis Nilai" value={released} hint="Nilai dibagikan & ekspor siap" icon={CheckmarkBadge01Icon} box="bg-tone-info-bg text-tone-info" tone="text-tone-info" />
      </div>

      <div className="grid grid-cols-1 items-start gap-space-xl lg:grid-cols-12">
        <div className="flex flex-col gap-space-lg lg:col-span-7 xl:col-span-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-headline-md text-headline-md tracking-tight text-text-primary">Daftar Pelaksanaan Ujian</h2>
              <span className="rounded-full bg-canvas-peach px-2.5 py-0.5 font-label-sm text-label-sm text-primary-strong">Total {rows.length}</span>
            </div>
          </div>
          {rows.length === 0 && (
            <p className="font-body-md text-body-md text-text-muted">Belum ada ulangan. Isi formulir cepat untuk membuat yang pertama.</p>
          )}
          {rows.map((r) => {
            const pub = r.status === "PUBLISHED";
            return (
              <article key={r.id} className="flex flex-col gap-space-md rounded-2xl bg-surface-card p-space-lg shadow-sm transition-all hover:shadow-md">
                <div className="flex flex-wrap items-center gap-2">
                  {pub ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-tone-success-bg px-3 py-1 font-label-sm text-label-sm text-tone-success">
                      <span className="h-2 w-2 rounded-full bg-tone-success" aria-hidden="true" />
                      Terbit
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full bg-tone-warning-bg px-3 py-1 font-label-sm text-label-sm text-tone-warning">
                      <HugeiconsIcon icon={Edit02Icon} className="size-4" aria-hidden="true" />
                      Draf Perakitan
                    </span>
                  )}
                  <span className="rounded-full bg-canvas-peach px-3 py-1 font-label-sm text-label-sm text-primary-strong">{r.subjectName}</span>
                  {r.resultsReleasedAt && (
                    <span className="rounded-full bg-tone-info-bg px-3 py-1 font-label-sm text-label-sm text-tone-info">Hasil dirilis</span>
                  )}
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md text-text-primary">
                    <Link href={`/teacher/quizzes/${r.id}`} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring">{r.title}</Link>
                  </h3>
                  {r.instructions && <p className="mt-0.5 line-clamp-2 font-body-md text-body-md text-text-muted">{r.instructions}</p>}
                </div>
                <div className="grid grid-cols-1 gap-3 rounded-xl bg-canvas-peach p-space-md sm:grid-cols-2 xl:grid-cols-3">
                  <div className="flex items-center gap-2.5">
                    <HugeiconsIcon icon={UserGroupIcon} className="size-5 text-text-muted" aria-hidden="true" />
                    <div className="flex flex-col">
                      <span className="font-label-sm text-[12px] text-text-muted">Kelas Sasaran</span>
                      <span className="font-label-sm text-label-sm text-text-primary">{r.classNames.length ? r.classNames.join(" & ") : "Belum ada kelas"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <HugeiconsIcon icon={Clock01Icon} className="size-5 text-text-muted" aria-hidden="true" />
                    <div className="flex flex-col">
                      <span className="font-label-sm text-[12px] text-text-muted">Durasi &amp; Batas Coba</span>
                      <span className="font-label-sm text-label-sm text-text-primary">{r.durationMinutes} Menit · {r.maxAttempts}x Coba ({POLICY_LABEL[r.scoringPolicy]})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <HugeiconsIcon icon={Task01Icon} className="size-5 text-text-muted" aria-hidden="true" />
                    <div className="flex flex-col">
                      <span className="font-label-sm text-[12px] text-text-muted">Butir Soal &amp; KKM</span>
                      <span className="font-label-sm text-label-sm text-text-primary">{r.questionCount} Soal{r.kkm !== null ? ` · KKM ${r.kkm}` : ""}</span>
                    </div>
                  </div>
                </div>
                {(r.startsAt || r.endsAt) && (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-container-high/40 px-3.5 py-2.5 font-body-md text-body-md text-text-muted">
                    <HugeiconsIcon icon={Calendar01Icon} className="size-5 text-primary-strong" aria-hidden="true" />
                    <span>
                      Jadwal: <strong>{r.startsAt ? formatWita(r.startsAt) : "—"} – {r.endsAt ? formatWita(r.endsAt) : "—"}</strong>
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-space-sm pt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/teacher/quizzes/${r.id}`}
                      className="flex min-h-12 items-center gap-2 rounded-xl bg-primary-container px-space-md font-label-md text-label-md text-on-primary shadow-sm transition-all hover:opacity-90 focus-visible:ring-[3px] focus-visible:ring-ring"
                    >
                      <HugeiconsIcon icon={pub ? PlayCircleIcon : CheckmarkCircle02Icon} className="size-5" aria-hidden="true" />
                      <span>{pub ? "Pantau & nilai" : "Lanjutkan penyusunan"}</span>
                    </Link>
                    {pub ? (
                      <Link
                        href={`/teacher/quizzes/${r.id}#hasil`}
                        className="flex min-h-12 items-center gap-2 rounded-xl bg-canvas-peach px-space-md font-label-md text-label-md text-primary-strong transition-all hover:bg-canvas-peach-subtle focus-visible:ring-[3px] focus-visible:ring-ring"
                      >
                        <HugeiconsIcon icon={ChartColumnIcon} className="size-5" aria-hidden="true" />
                        <span>Hasil &amp; Nilai</span>
                      </Link>
                    ) : (
                      <Link
                        href={`/teacher/quizzes/${r.id}#setelan`}
                        className="flex min-h-12 items-center gap-2 rounded-xl bg-canvas-peach px-space-md font-label-md text-label-md text-primary-strong transition-all hover:bg-canvas-peach-subtle focus-visible:ring-[3px] focus-visible:ring-ring"
                      >
                        <HugeiconsIcon icon={SlidersHorizontalIcon} className="size-5" aria-hidden="true" />
                        <span>Setelan Ulangan</span>
                      </Link>
                    )}
                  </div>
                  <a href={`/api/exports/${r.id}`} download className={`${ghost} focus-visible:ring-[3px] focus-visible:ring-ring`}>
                    <HugeiconsIcon icon={Table01Icon} className="size-[18px]" aria-hidden="true" />
                    <span>Unduh Excel<span className="sr-only">: {r.title}</span></span>
                  </a>
                </div>
              </article>
            );
          })}
        </div>
        <aside aria-label="Formulir cepat" className="flex flex-col gap-space-md lg:col-span-5 xl:col-span-4">
          <CreateQuizForm subjects={subjects} />
        </aside>
      </div>
    </>
  );
}
