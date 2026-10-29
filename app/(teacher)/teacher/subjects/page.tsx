import type { Metadata } from "next";
import { Suspense } from "react";
import { Add01Icon, Book02Icon, Edit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireTeacher } from "@/lib/auth/guard";
import { getSubjectTree } from "@/lib/subjects";
import { cn } from "@/lib/utils";
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

// Disclosure triggers styled as buttons. The summary is not a <button>, so the classes are applied directly.
const disclosureBase = "cursor-pointer list-none [&::-webkit-details-marker]:hidden";
const iconTrigger = cn(buttonVariants({ variant: "outline", size: "icon" }), disclosureBase);
const textTrigger = cn(buttonVariants({ variant: "secondary" }), "w-full", disclosureBase);

export default function SubjectsPage() {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Mapel & Bab"
        description="Atur urutan bab buku teks dan subbab bahan ajar kelas VI."
        actions={
          <a href="#tambah-mapel" className={buttonVariants()}>
            <HugeiconsIcon icon={Add01Icon} aria-hidden="true" />
            Tambah mapel baru
          </a>
        }
      />
      <Suspense fallback={<p>Memuat…</p>}>
        <SubjectTree />
      </Suspense>
    </section>
  );
}

async function SubjectTree() {
  await requireTeacher();
  const subjects = await getSubjectTree();
  const chapterCount = subjects.reduce((n, s) => n + s.chapters.length, 0);
  const subchapterCount = subjects.reduce(
    (n, s) => n + s.chapters.reduce((m, c) => m + c.subchapters.length, 0),
    0,
  );
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Mapel" value={subjects.length} />
        <Stat label="Bab" value={chapterCount} />
        <Stat label="Subbab" value={subchapterCount} />
      </div>

      {subjects.length === 0 && (
        <p className="text-muted-foreground">Belum ada mapel. Tambah mapel di bawah ini.</p>
      )}
      {subjects.map((s) => (
        <Card key={s.id}>
          <CardHeader>
            <div className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-strong"
              >
                <HugeiconsIcon icon={Book02Icon} />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <CardTitle>
                  <h2 className="text-xl font-bold">{s.name}</h2>
                </CardTitle>
                {s.description && <p className="text-base text-muted-foreground">{s.description}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <details>
                <summary aria-label={`Ubah mapel ${s.name}`} className={iconTrigger}>
                  <HugeiconsIcon icon={Edit02Icon} aria-hidden="true" />
                  <span className="sr-only">Ubah mapel {s.name}</span>
                </summary>
                <div className="mt-3 max-w-sm">
                  <SubjectForm subject={s} />
                </div>
              </details>
              <DeleteSubjectButton id={s.id} name={s.name} />
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            <ol className="flex flex-col gap-3">
              {s.chapters.map((c, i) => (
                <li key={c.id} className="flex flex-col gap-4 rounded-2xl bg-secondary p-4">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="grid size-10 shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-foreground"
                    >
                      {c.order}
                    </span>
                    <div className="flex min-w-0 flex-col gap-1">
                      <h3 className="text-lg font-semibold">
                        <span className="sr-only">Bab {c.order}: </span>
                        {c.title}
                      </h3>
                      <p className="text-base text-muted-foreground">
                        {c.sourceBook} · {c.sourceYearOrEdition} · {c.materialCount} materi
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    <MoveButtons
                      id={c.id}
                      kind="bab"
                      title={c.title}
                      isFirst={i === 0}
                      isLast={i === s.chapters.length - 1}
                    />
                    <details>
                      <summary aria-label={`Ubah bab ${c.title}`} className={iconTrigger}>
                        <HugeiconsIcon icon={Edit02Icon} aria-hidden="true" />
                        <span className="sr-only">Ubah bab {c.title}</span>
                      </summary>
                      <div className="mt-3 max-w-sm">
                        <ChapterForm subjectId={s.id} chapter={c} />
                      </div>
                    </details>
                    <DeleteChapterButton id={c.id} title={c.title} />
                  </div>

                  <div className="flex flex-col gap-3">
                    <h4 className="font-semibold">Subbab</h4>
                    {c.subchapters.length === 0 && (
                      <p className="text-base text-muted-foreground">Belum ada subbab.</p>
                    )}
                    <ol className="flex flex-col gap-3">
                      {c.subchapters.map((x, j) => (
                        <li key={x.id} className="flex flex-col gap-3 rounded-xl bg-card p-3">
                          <div className="flex items-start gap-3">
                            <span
                              aria-hidden="true"
                              className="shrink-0 rounded-lg bg-primary-soft px-2 py-1 font-bold text-primary-strong"
                            >
                              {c.order}.{x.order}
                            </span>
                            <p className="text-base">
                              {x.title}
                              {x.sourcePages && <span className="text-muted-foreground"> (hal. {x.sourcePages})</span>}
                              <span className="text-muted-foreground"> · {x.materialCount} materi</span>
                            </p>
                          </div>
                          <div className="flex flex-wrap items-start gap-2">
                            <MoveButtons
                              id={x.id}
                              kind="subbab"
                              title={x.title}
                              isFirst={j === 0}
                              isLast={j === c.subchapters.length - 1}
                            />
                            <details>
                              <summary aria-label={`Ubah subbab ${x.title}`} className={iconTrigger}>
                                <HugeiconsIcon icon={Edit02Icon} aria-hidden="true" />
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
                      <summary className={textTrigger}>
                        <HugeiconsIcon icon={Add01Icon} aria-hidden="true" />
                        Tambah subbab
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
              <summary className={textTrigger}>
                <HugeiconsIcon icon={Add01Icon} aria-hidden="true" />
                Tambah bab
                <span className="sr-only"> di mapel {s.name}</span>
              </summary>
              <div className="mt-3 max-w-sm">
                <ChapterForm subjectId={s.id} />
              </div>
            </details>
          </CardContent>
        </Card>
      ))}

      <Card id="tambah-mapel" className="max-w-xl">
        <CardHeader>
          <CardTitle>
            <h2 className="text-xl font-bold">Tambah mapel baru</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SubjectForm />
        </CardContent>
      </Card>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card size="sm">
      <CardContent className="flex items-baseline justify-between gap-3">
        <span className="text-base text-muted-foreground">{label}</span>
        <span className="text-3xl font-extrabold text-primary-strong">{value}</span>
      </CardContent>
    </Card>
  );
}
