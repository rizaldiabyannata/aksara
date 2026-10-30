import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Add01Icon,
  AddCircleIcon,
  ArrowUpDownIcon,
  Book02Icon,
  BookOpen01Icon,
  CheckmarkBadge01Icon,
  CheckmarkCircle02Icon,
  Edit02Icon,
  Idea01Icon,
  ListViewIcon,
  Shield01Icon,
  TouchInteraction01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { requireTeacher } from "@/lib/auth/guard";
import { getSubjectTree } from "@/lib/subjects";
import {
  ChapterForm,
  DeleteChapterButton,
  DeleteSubchapterButton,
  DeleteSubjectButton,
  MoveButtons,
  SubchapterForm,
  SubjectForm,
} from "./subject-forms";

export const metadata: Metadata = { title: "Mapel & Bab" };

// Disclosure triggers (<summary>) wear Stitch's button classes directly.
const disclosure = "cursor-pointer list-none [&::-webkit-details-marker]:hidden";
const editTrigger = `${disclosure} min-h-12 px-space-md rounded-xl bg-surface-container-lowest text-on-surface hover:bg-canvas-peach font-label-sm text-label-sm flex items-center gap-1 shadow-sm transition-all focus-visible:ring-[3px] focus-visible:ring-ring`;
const subEditTrigger = `${disclosure} min-h-12 px-space-sm rounded-lg bg-canvas-peach text-primary-strong hover:bg-canvas-peach-subtle font-label-sm text-label-sm flex items-center gap-1 transition-all focus-visible:ring-[3px] focus-visible:ring-ring`;
const addTrigger = `${disclosure} min-h-12 mt-1 w-full rounded-xl bg-surface-container-lowest text-primary-strong hover:bg-canvas-peach font-label-sm text-label-sm flex items-center justify-center gap-2 transition-all focus-visible:ring-[3px] focus-visible:ring-ring`;

export default function SubjectsPage() {
  return (
    <div className="flex w-full flex-col gap-space-xl px-space-xl py-space-xl">
      <section className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-lg bg-surface-container-lowest p-space-xl rounded-2xl shadow-sm">
        <div className="flex flex-col gap-space-xs max-w-2xl">
          <div className="inline-flex items-center gap-2 self-start px-space-md py-1 rounded-full bg-canvas-peach text-primary-strong font-label-sm text-label-sm tracking-wide">
            <HugeiconsIcon icon={BookOpen01Icon} className="size-[18px]" aria-hidden="true" />
            <span>KURIKULUM &amp; STRUKTUR PEMBELAJARAN</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">Mapel &amp; Bab</h1>
          <p className="font-body-lg text-body-lg text-text-muted leading-relaxed">
            Atur urutan bab buku teks dan subbab bahan ajar kelas VI.
          </p>
        </div>
        <div className="flex items-center gap-space-md shrink-0">
          <a
            href="#tambah-mapel"
            className="min-h-12 px-space-lg bg-primary-container text-on-primary rounded-xl font-label-lg text-label-lg flex items-center justify-center gap-space-sm shadow-md hover:opacity-95 active:scale-[0.98] transition-all focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <HugeiconsIcon icon={Add01Icon} className="size-6" aria-hidden="true" />
            <span>Tambah mapel baru</span>
          </a>
        </div>
      </section>
      <Suspense fallback={<p>Memuat…</p>}>
        <SubjectTree />
      </Suspense>
    </div>
  );
}

async function SubjectTree() {
  await requireTeacher();
  const subjects = await getSubjectTree();
  const chapterCount = subjects.reduce((n, s) => n + s.chapters.length, 0);
  const materialCount = subjects.reduce((n, s) => n + s.chapters.reduce((m, c) => m + c.materialCount, 0), 0);
  return (
    <>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
        <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm flex items-center gap-space-md">
          <div className="w-14 h-14 rounded-2xl bg-canvas-peach flex items-center justify-center text-primary-strong shrink-0">
            <HugeiconsIcon icon={Book02Icon} className="size-8" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-text-muted">Total Mapel Terdaftar</span>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-lg text-headline-lg text-on-surface">{subjects.length}</span>
              <span className="font-label-md text-label-md text-text-primary">Mata Pelajaran</span>
            </div>
            <span className="font-label-sm text-label-sm text-tone-info">{subjects.map((s) => s.name).join(" & ")}</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm flex items-center gap-space-md">
          <div className="w-14 h-14 rounded-2xl bg-tone-warning-bg flex items-center justify-center text-tone-warning shrink-0">
            <HugeiconsIcon icon={ListViewIcon} className="size-8" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-text-muted">Total Struktur Bab</span>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-lg text-headline-lg text-on-surface">{chapterCount}</span>
              <span className="font-label-md text-label-md text-text-primary">Bab</span>
            </div>
            <span className="font-label-sm text-label-sm text-text-muted">
              {subjects.map((s) => `${s.chapters.length} ${s.name}`).join(" · ")}
            </span>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm flex items-center gap-space-md">
          <div className="w-14 h-14 rounded-2xl bg-tone-success-bg flex items-center justify-center text-tone-success shrink-0">
            <HugeiconsIcon icon={CheckmarkBadge01Icon} className="size-8" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-text-muted">Materi Terhubung</span>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-lg text-headline-lg text-on-surface">{materialCount}</span>
              <span className="font-label-md text-label-md text-text-primary">Dokumen Modul</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
        <div className="lg:col-span-8 flex flex-col gap-space-xl">
          {subjects.length === 0 && (
            <p className="text-text-muted">Belum ada mapel. Tambah mapel di bawah ini.</p>
          )}
          {subjects.map((s) => (
            <article key={s.id} className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-xl flex flex-col gap-space-lg">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-space-md pb-space-md">
                <div className="flex items-start gap-space-md">
                  <div aria-hidden="true" className="w-12 h-12 rounded-xl bg-canvas-peach flex items-center justify-center text-primary-strong shrink-0 mt-1">
                    <HugeiconsIcon icon={Book02Icon} className="size-7" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h2 className="font-headline-md text-headline-md text-on-surface">{s.name}</h2>
                    {s.description && <p className="font-body-md text-body-md text-text-muted">{s.description}</p>}
                  </div>
                </div>
                <div className="flex items-start gap-space-xs shrink-0 self-end sm:self-start">
                  <details>
                    <summary aria-label={`Ubah mapel ${s.name}`} className={`${disclosure} min-h-12 px-space-md rounded-xl bg-canvas-peach hover:bg-canvas-peach-subtle text-on-surface font-label-md text-label-md flex items-center gap-1.5 transition-all focus-visible:ring-[3px] focus-visible:ring-ring`}>
                      <HugeiconsIcon icon={Edit02Icon} className="size-5" aria-hidden="true" />
                      <span>Ubah Nama</span>
                    </summary>
                    <div className="mt-3 max-w-sm">
                      <SubjectForm subject={s} />
                    </div>
                  </details>
                  <DeleteSubjectButton id={s.id} name={s.name} />
                </div>
              </div>

              <div className="flex items-center justify-between px-space-md py-space-sm rounded-xl bg-canvas-peach text-on-surface">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={ArrowUpDownIcon} className="size-5 text-primary-strong" aria-hidden="true" />
                  <span className="font-label-sm text-label-sm text-text-primary">Urutan Bab Buku Teks (Otomatis Terindeks Siswa)</span>
                </div>
                <span className="font-label-sm text-label-sm text-text-muted">{s.chapters.length} Bab Terdata</span>
              </div>

              <ol className="flex flex-col gap-space-md">
                {s.chapters.map((c, i) => (
                  <li key={c.id} className="bg-surface rounded-2xl p-space-lg flex flex-col gap-space-md shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
                      <div className="flex items-start gap-space-md">
                        <span aria-hidden="true" className="w-9 h-9 rounded-lg bg-primary-container text-on-primary font-headline-sm text-headline-sm flex items-center justify-center shrink-0">
                          {c.order}
                        </span>
                        <div className="flex flex-col">
                          <h3 className="font-headline-sm text-headline-sm text-on-surface">
                            <span className="sr-only">Bab {c.order}: </span>
                            {c.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-text-muted font-label-sm text-label-sm">
                            <span className="flex items-center gap-1">
                              <HugeiconsIcon icon={BookOpen01Icon} className="size-4" aria-hidden="true" />
                              {c.sourceBook} {c.sourceYearOrEdition}
                            </span>
                            <span>•</span>
                            <span className="text-tone-info font-label-sm">{c.materialCount} Modul Materi</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-1.5 self-end md:self-auto shrink-0">
                        <MoveButtons
                          id={c.id}
                          kind="bab"
                          title={c.title}
                          isFirst={i === 0}
                          isLast={i === s.chapters.length - 1}
                        />
                        <details>
                          <summary aria-label={`Ubah bab ${c.title}`} className={editTrigger}>
                            <HugeiconsIcon icon={Edit02Icon} className="size-[18px]" aria-hidden="true" />
                            <span>Ubah</span>
                          </summary>
                          <div className="mt-3 max-w-sm">
                            <ChapterForm subjectId={s.id} chapter={c} />
                          </div>
                        </details>
                        <DeleteChapterButton id={c.id} title={c.title} />
                      </div>
                    </div>

                    <div className="ml-2 sm:ml-6 pl-4 flex flex-col gap-2.5">
                      <h4 className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">Subbab Pembelajaran</h4>
                      {c.subchapters.length === 0 && (
                        <p className="font-label-sm text-label-sm text-text-muted">Belum ada subbab.</p>
                      )}
                      <ol className="flex flex-col gap-2.5">
                        {c.subchapters.map((x, j) => (
                          <li key={x.id} className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm hover:shadow transition-shadow">
                            <div className="flex items-center gap-space-md">
                              <span aria-hidden="true" className="min-w-7 h-7 px-1 rounded-md bg-canvas-peach text-primary-strong font-label-sm text-label-sm flex items-center justify-center shrink-0">
                                {c.order}.{x.order}
                              </span>
                              <div className="flex flex-col">
                                <span className="font-label-md text-label-md text-on-surface">{x.title}</span>
                                <span className="font-label-sm text-label-sm text-text-muted">
                                  {x.sourcePages ? `Halaman ${x.sourcePages} · ` : ""}{x.materialCount} Dokumen Materi
                                </span>
                              </div>
                            </div>
                            <div className="flex items-start gap-1 self-end sm:self-auto shrink-0">
                              <MoveButtons
                                id={x.id}
                                kind="subbab"
                                title={x.title}
                                isFirst={j === 0}
                                isLast={j === c.subchapters.length - 1}
                              />
                              <details>
                                <summary aria-label={`Ubah subbab ${x.title}`} className={subEditTrigger}>
                                  <HugeiconsIcon icon={Edit02Icon} className="size-[18px]" aria-hidden="true" />
                                  <span className="sr-only">Ubah subbab {x.title}</span>
                                </summary>
                                <div className="mt-3 max-w-sm">
                                  <SubchapterForm chapterId={c.id} subchapter={x} />
                                </div>
                              </details>
                              <DeleteSubchapterButton id={x.id} title={x.title} />
                            </div>
                          </li>
                        ))}
                      </ol>
                      <details>
                        <summary className={addTrigger}>
                          <HugeiconsIcon icon={AddCircleIcon} className="size-5" aria-hidden="true" />
                          <span>Tambah subbab</span>
                          <span className="sr-only"> di bab {c.title}</span>
                        </summary>
                        <div className="mt-3 max-w-sm">
                          <SubchapterForm chapterId={c.id} />
                        </div>
                      </details>
                    </div>
                  </li>
                ))}
              </ol>

              <details>
                <summary className={`${disclosure} min-h-12 w-full rounded-xl bg-canvas-peach-subtle text-primary-strong hover:bg-primary-soft font-label-md text-label-md flex items-center justify-center gap-2 transition-all focus-visible:ring-[3px] focus-visible:ring-ring`}>
                  <HugeiconsIcon icon={Add01Icon} className="size-5" aria-hidden="true" />
                  <span>Tambah bab</span>
                  <span className="sr-only"> di mapel {s.name}</span>
                </summary>
                <div className="mt-3 max-w-sm">
                  <ChapterForm subjectId={s.id} />
                </div>
              </details>
            </article>
          ))}

          <article id="tambah-mapel" className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-xl flex flex-col gap-space-md max-w-xl">
            <h2 className="font-headline-md text-headline-md text-on-surface">Tambah mapel baru</h2>
            <SubjectForm />
          </article>
        </div>

        <aside className="lg:col-span-4 flex flex-col gap-space-lg lg:sticky lg:top-24">
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-lg flex flex-col gap-space-md">
            <div className="flex items-center gap-space-sm text-primary-strong">
              <HugeiconsIcon icon={Idea01Icon} className="size-6" aria-hidden="true" />
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Panduan Urutan</h2>
            </div>
            <ul className="flex flex-col gap-space-sm font-body-md text-body-md text-on-surface">
              <li className="flex items-start gap-2.5">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-5 shrink-0 mt-0.5 text-tone-success" aria-hidden="true" />
                <span><strong>Urutan Mengalir Otomatis:</strong> Susunan nomor bab dan subbab sama dengan yang dilihat siswa.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <HugeiconsIcon icon={TouchInteraction01Icon} className="size-5 shrink-0 mt-0.5 text-primary-strong" aria-hidden="true" />
                <span><strong>Tombol Naik &amp; Turun:</strong> Setiap klik menukar satu langkah, tanpa seret-dan-lepas.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <HugeiconsIcon icon={Shield01Icon} className="size-5 shrink-0 mt-0.5 text-tone-warning" aria-hidden="true" />
                <span><strong>Perlindungan Data:</strong> Mapel yang masih punya bab atau dipakai ulangan, bab yang masih punya materi atau subbab, dan subbab yang dipakai materi tidak bisa dihapus.</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
