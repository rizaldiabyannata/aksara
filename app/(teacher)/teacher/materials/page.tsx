import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  AddCircleIcon,
  ArrowDown01Icon,
  BookOpen01Icon,
  Bookmark01Icon,
  CheckmarkBadge01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Edit02Icon,
  File01Icon,
  Flag01Icon,
  ViewIcon,
  Book02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { requireTeacher } from "@/lib/auth/guard";
import { formatWita } from "@/lib/format";
import type { MaterialStatus } from "@/lib/generated/prisma/enums";
import { countMaterialsByStatus, listMaterials } from "@/lib/materials";
import { getSubjectTree, listChapterOptions } from "@/lib/subjects";
import { MoveButtons } from "./material-form";
import { STATUS_LABEL } from "./status-label";

export const metadata: Metadata = { title: "Materi" };

const STATUS_CHIP: Record<MaterialStatus, { icon: IconSvgElement; cls: string }> = {
  PUBLISHED: { icon: CheckmarkBadge01Icon, cls: "bg-tone-success-bg text-tone-success" },
  REVIEWED: { icon: CheckmarkCircle02Icon, cls: "bg-tone-info-bg text-tone-info" },
  DRAFT: { icon: Edit02Icon, cls: "bg-surface-container text-on-surface-variant" },
};

const selectClass =
  "w-full min-h-12 pl-11 pr-10 rounded-xl bg-canvas-peach font-body-md text-body-md text-text-primary outline-none focus:bg-surface-card focus-visible:ring-[3px] focus-visible:ring-ring appearance-none cursor-pointer transition-all";
const iconL = "absolute left-3.5 size-5 text-text-muted pointer-events-none";

export default function MaterialsPage({ searchParams }: PageProps<"/teacher/materials">) {
  return (
    <div className="flex w-full flex-col px-space-xl py-space-xl">
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-lg pb-space-xl">
        <div className="flex flex-col gap-1 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-canvas-peach text-primary-strong font-label-sm text-label-sm tracking-wide uppercase">
              <HugeiconsIcon icon={BookOpen01Icon} className="size-4" aria-hidden="true" />
              Kurikulum &amp; Materi Ajar
            </span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-text-primary tracking-tight mt-1">Materi</h1>
          <p className="font-body-lg text-body-lg text-text-muted">Kelola bahan bacaan siswa, dari draf sampai terbit.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/teacher/materials/new"
            className="inline-flex items-center justify-center gap-2.5 px-space-xl min-h-12 rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg shadow-[0_8px_20px_rgba(255,112,52,0.28)] hover:brightness-105 active:scale-95 transition-all focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <HugeiconsIcon icon={AddCircleIcon} className="size-6" aria-hidden="true" />
            <span>Materi baru</span>
          </Link>
        </div>
      </header>
      <Suspense fallback={<p>Memuat…</p>}>
        <List searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const one = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);

function Stat({ label, value, unit, icon, box, unitCls }: { label: string; value: number; unit: string; icon: IconSvgElement; box: string; unitCls: string }) {
  return (
    <div className="bg-surface-card rounded-2xl p-space-lg shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between pb-space-sm">
        <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">{label}</span>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${box}`}>
          <HugeiconsIcon icon={icon} className="size-6" aria-hidden="true" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-headline-xl text-headline-xl text-text-primary">{value}</span>
        <span className={`font-label-md text-label-md ${unitCls}`}>{unit}</span>
      </div>
    </div>
  );
}

async function List({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireTeacher();
  const sp = await searchParams;
  const subjectId = one(sp.subjectId);
  const chapterId = one(sp.chapterId);
  const s = one(sp.status);
  const status = s && Object.hasOwn(STATUS_LABEL, s) ? (s as MaterialStatus) : undefined;
  const [{ rows, capped }, subjects, chapters, counts] = await Promise.all([
    listMaterials({ subjectId, chapterId, status }),
    getSubjectTree(),
    listChapterOptions(),
    countMaterialsByStatus(),
  ]);
  // Rows arrive ordered by chapter, so consecutive rows with the same chapter form one group.
  const groups: { chapterId: string; title: string; subject: string; items: { m: (typeof rows)[number]; i: number }[] }[] = [];
  rows.forEach((m, i) => {
    const last = groups.at(-1);
    if (last?.chapterId === m.chapterId) last.items.push({ m, i });
    else groups.push({ chapterId: m.chapterId, title: m.chapterTitle, subject: m.subjectName, items: [{ m, i }] });
  });
  // ponytail: no pagination; the list is capped at 200 rows. Add paging if the bank outgrows it.
  const total = counts.DRAFT + counts.REVIEWED + counts.PUBLISHED;
  return (
    <>
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md pb-space-xl">
        <Stat label="Total Materi Ajar" value={total} unit="Modul" icon={File01Icon} box="bg-canvas-peach text-primary-strong" unitCls="text-text-muted" />
        <Stat label="Siap Dibaca Siswa" value={counts.PUBLISHED} unit="Terbit" icon={CheckmarkBadge01Icon} box="bg-tone-success-bg text-tone-success" unitCls="text-tone-success font-bold" />
        <Stat label="Sudah Ditinjau" value={counts.REVIEWED} unit="Siap Rilis" icon={CheckmarkCircle02Icon} box="bg-tone-info-bg text-tone-info" unitCls="text-tone-info font-bold" />
        <Stat label="Dalam Penulisan" value={counts.DRAFT} unit="Draf" icon={Edit02Icon} box="bg-surface-container text-on-surface-variant" unitCls="text-text-muted" />
      </section>

      <section className="bg-surface-card rounded-2xl p-space-lg shadow-sm mb-space-xl">
        <form method="get" className="flex flex-col gap-space-md">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="f-subject" className="font-label-sm text-label-sm text-text-primary">Mapel</label>
              <div className="relative flex items-center">
                <HugeiconsIcon icon={Book02Icon} className={iconL} aria-hidden="true" />
                <select id="f-subject" name="subjectId" defaultValue={subjectId ?? ""} className={selectClass}>
                  <option value="">Semua mapel</option>
                  {subjects.map((x) => (
                    <option key={x.id} value={x.id}>{x.name}</option>
                  ))}
                </select>
                <HugeiconsIcon icon={ArrowDown01Icon} className="absolute right-3 size-5 text-text-muted pointer-events-none" aria-hidden="true" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="f-chapter" className="font-label-sm text-label-sm text-text-primary">Bab</label>
              <div className="relative flex items-center">
                <HugeiconsIcon icon={Bookmark01Icon} className={iconL} aria-hidden="true" />
                <select id="f-chapter" name="chapterId" defaultValue={chapterId ?? ""} className={selectClass}>
                  <option value="">Semua bab</option>
                  {chapters.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                <HugeiconsIcon icon={ArrowDown01Icon} className="absolute right-3 size-5 text-text-muted pointer-events-none" aria-hidden="true" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="f-status" className="font-label-sm text-label-sm text-text-primary">Status</label>
              <div className="relative flex items-center">
                <HugeiconsIcon icon={Flag01Icon} className={iconL} aria-hidden="true" />
                <select id="f-status" name="status" defaultValue={status ?? ""} className={selectClass}>
                  <option value="">Semua status</option>
                  {Object.entries(STATUS_LABEL).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
                <HugeiconsIcon icon={ArrowDown01Icon} className="absolute right-3 size-5 text-text-muted pointer-events-none" aria-hidden="true" />
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 gap-space-md">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-tone-success" />
              <span className="font-label-sm text-label-sm text-text-muted">
                Menampilkan <strong className="text-text-primary">{rows.length} dari {total} materi</strong>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/teacher/materials" className="min-h-12 px-space-lg rounded-xl bg-surface-container text-text-primary font-label-md text-label-md hover:bg-canvas-peach active:scale-95 transition-all flex items-center focus-visible:ring-[3px] focus-visible:ring-ring">
                Reset Filter
              </Link>
              <button type="submit" className="min-h-12 px-space-xl rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:brightness-110 active:scale-95 transition-all focus-visible:ring-[3px] focus-visible:ring-ring">
                Terapkan
              </button>
            </div>
          </div>
        </form>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-xl items-start">
        <div className="xl:col-span-8 flex flex-col gap-space-xl">
          {rows.length === 0 && (
            <p className="text-text-muted">Belum ada materi yang cocok. Ubah saringan, atau tekan Materi baru untuk menambah.</p>
          )}
          {groups.map((g) => (
            <section key={g.items[0]!.m.id} aria-label={g.title} className="flex flex-col gap-space-md">
              <div className="flex items-center gap-3 px-1">
                <div aria-hidden="true" className="w-9 h-9 rounded-lg bg-primary-soft flex items-center justify-center text-primary-strong">
                  <HugeiconsIcon icon={Bookmark01Icon} className="size-5" />
                </div>
                <div>
                  <h2 className="font-headline-md text-headline-md text-text-primary">{g.title}</h2>
                  <p className="font-label-sm text-label-sm text-text-muted">Mata Pelajaran: {g.subject} · {g.items.length} materi</p>
                </div>
              </div>
              <ul className="flex flex-col gap-space-md">
                {g.items.map(({ m, i }) => {
                  const sameChapter = (j: number) => rows[j]?.chapterId === m.chapterId;
                  const chip = STATUS_CHIP[m.status];
                  return (
                    <li key={m.id}>
                      <article className="bg-surface-card rounded-2xl p-space-lg shadow-sm hover:shadow-md transition-all flex flex-col gap-space-md overflow-hidden">
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm flex items-center gap-1 ${chip.cls}`}>
                              <HugeiconsIcon icon={chip.icon} className="size-4" aria-hidden="true" />
                              {STATUS_LABEL[m.status]}
                            </span>
                            <span className="font-label-sm text-label-sm text-text-muted">{g.subject}</span>
                          </div>
                          <h3 className="font-headline-md text-headline-md text-text-primary pt-1">{m.title}</h3>
                        </div>
                        <p className="line-clamp-2 font-body-md text-body-md text-on-surface-variant leading-relaxed">{m.summary}</p>
                        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-1 font-label-sm text-label-sm text-text-muted">
                          <span className="flex items-center gap-1.5">
                            <HugeiconsIcon icon={Clock01Icon} className="size-[18px]" aria-hidden="true" />
                            Diperbarui {formatWita(m.updatedAt)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-sm bg-surface-container-low/50 -mx-space-lg -mb-space-lg p-space-md rounded-b-2xl">
                          <div className="flex items-center gap-1">
                            <span className="font-label-sm text-label-sm text-text-muted mr-1 hidden md:inline">Urutan:</span>
                            <MoveButtons id={m.id} title={m.title} isFirst={!sameChapter(i - 1)} isLast={!sameChapter(i + 1)} />
                          </div>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <Link
                              href={`/teacher/materials/${m.id}/preview`}
                              className="min-h-12 px-4 rounded-xl bg-surface-card text-text-primary font-label-md text-label-md hover:bg-canvas-peach shadow-sm flex items-center gap-2 active:scale-95 transition-all focus-visible:ring-[3px] focus-visible:ring-ring"
                            >
                              <HugeiconsIcon icon={ViewIcon} className="size-5" aria-hidden="true" />
                              <span>Pratinjau<span className="sr-only"> materi {m.title}</span></span>
                            </Link>
                            <Link
                              href={`/teacher/materials/${m.id}`}
                              className="min-h-12 px-space-lg rounded-xl bg-primary-container text-on-primary font-label-md text-label-md shadow-sm hover:brightness-105 flex items-center gap-2 active:scale-95 transition-all focus-visible:ring-[3px] focus-visible:ring-ring"
                            >
                              <HugeiconsIcon icon={Edit02Icon} className="size-5" aria-hidden="true" />
                              <span>Ubah<span className="sr-only"> materi {m.title}</span></span>
                            </Link>
                          </div>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {capped && <p className="font-label-sm text-label-sm text-text-muted">Tampil 200 materi pertama. Persempit filter.</p>}
        </div>

        <aside className="xl:col-span-4 flex flex-col gap-space-lg">
          <div className="bg-surface-card rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md">
            <h2 className="font-headline-sm text-headline-sm text-text-primary">Alur Terbit Materi</h2>
            <ol className="flex flex-col gap-space-md font-body-md text-body-md text-on-surface-variant">
              <li><strong className="text-text-primary">1. Draf.</strong> Hanya Anda yang bisa melihat. Siswa belum bisa membuka materi.</li>
              <li><strong className="text-tone-info">2. Sudah ditinjau.</strong> Anda sudah memeriksa isinya. Siswa masih belum bisa membuka.</li>
              <li><strong className="text-tone-success">3. Terbit.</strong> Siswa kelas VI bisa membaca materi ini. Materi terbit bisa ditarik kembali menjadi draf.</li>
            </ol>
          </div>
          <div className="bg-surface-card rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md">
            <h2 className="font-headline-sm text-headline-sm text-text-primary">Ketentuan Gambar</h2>
            <ul className="flex flex-col gap-space-sm font-body-md text-body-md text-on-surface-variant">
              <li className="flex items-start gap-2"><HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-5 shrink-0 mt-0.5 text-tone-success" aria-hidden="true" />Ukuran file paling besar 4 MB.</li>
              <li className="flex items-start gap-2"><HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-5 shrink-0 mt-0.5 text-tone-success" aria-hidden="true" />Format: JPG, PNG, atau WebP.</li>
              <li className="flex items-start gap-2"><HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-5 shrink-0 mt-0.5 text-tone-success" aria-hidden="true" />Gambar diperkecil otomatis agar ringan dibuka siswa.</li>
              <li className="flex items-start gap-2"><HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-5 shrink-0 mt-0.5 text-tone-success" aria-hidden="true" />Sisipkan ke materi dengan kode dari panel Gambar di halaman ubah.</li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
