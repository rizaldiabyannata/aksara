import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const summaryClass =
  "inline-flex min-h-11 cursor-pointer items-center rounded-4xl px-3 text-sm font-medium underline hover:bg-muted";

export default function SubjectsPage() {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Mapel &amp; Bab</h1>
      <Suspense fallback={<p>Memuat…</p>}>
        <SubjectTree />
      </Suspense>
    </section>
  );
}

async function SubjectTree() {
  await requireTeacher();
  const subjects = await getSubjectTree();
  return (
    <>
      {subjects.length === 0 && (
        <p className="text-muted-foreground">Belum ada mapel. Tambah mapel di bawah ini.</p>
      )}
      {subjects.map((s) => (
        <Card key={s.id}>
          <CardHeader>
            <CardTitle>
              <h2 className="text-lg font-semibold">{s.name}</h2>
            </CardTitle>
            {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-2">
              <details>
                <summary className={summaryClass}>Ubah</summary>
                <div className="mt-3 max-w-sm">
                  <SubjectForm subject={s} />
                </div>
              </details>
              <DeleteSubjectButton id={s.id} />
            </div>

            <ol className="flex flex-col gap-4">
              {s.chapters.map((c, i) => (
                <li key={c.id} className="flex flex-col gap-3 rounded-lg border p-3">
                  <div>
                    <h3 className="font-semibold">
                      Bab {c.order}: {c.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {c.sourceBook} · {c.sourceYearOrEdition} · {c.materialCount} materi
                    </p>
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
                      <summary className={summaryClass}>Ubah</summary>
                      <div className="mt-3 max-w-sm">
                        <ChapterForm subjectId={s.id} chapter={c} />
                      </div>
                    </details>
                    <DeleteChapterButton id={c.id} />
                  </div>

                  <div className="flex flex-col gap-3 border-l-2 pl-3">
                    <h4 className="text-sm font-medium">Subbab</h4>
                    {c.subchapters.length === 0 && (
                      <p className="text-sm text-muted-foreground">Belum ada subbab.</p>
                    )}
                    <ol className="flex flex-col gap-3">
                      {c.subchapters.map((x, j) => (
                        <li key={x.id} className="flex flex-col gap-2">
                          <p className="text-sm">
                            {x.order}. {x.title}
                            {x.sourcePages && ` (hal. ${x.sourcePages})`} · {x.materialCount} materi
                          </p>
                          <div className="flex flex-wrap items-start gap-2">
                            <MoveButtons
                              id={x.id}
                              kind="subbab"
                              title={x.title}
                              isFirst={j === 0}
                              isLast={j === c.subchapters.length - 1}
                            />
                            <details>
                              <summary className={summaryClass}>Ubah</summary>
                              <div className="mt-3 max-w-sm">
                                <SubchapterForm chapterId={c.id} subchapter={x} />
                              </div>
                            </details>
                            <DeleteSubchapterButton id={x.id} />
                          </div>
                        </li>
                      ))}
                    </ol>
                    <details>
                      <summary className={summaryClass}>Tambah subbab</summary>
                      <div className="mt-3 max-w-sm">
                        <SubchapterForm chapterId={c.id} />
                      </div>
                    </details>
                  </div>
                </li>
              ))}
            </ol>

            <details>
              <summary className={summaryClass}>Tambah bab</summary>
              <div className="mt-3 max-w-sm">
                <ChapterForm subjectId={s.id} />
              </div>
            </details>
          </CardContent>
        </Card>
      ))}

      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle>
            <h2 className="text-lg font-semibold">Tambah mapel baru</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SubjectForm />
        </CardContent>
      </Card>
    </>
  );
}
