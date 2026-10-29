import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Status } from "@/components/status";
import { Badge } from "@/components/ui/badge";
import { requireTeacher } from "@/lib/auth/guard";
import { formatWita } from "@/lib/format";
import { extractImageIds } from "@/lib/images";
import { getQuestionForTeacher } from "@/lib/questions";
import { listChapterOptions } from "@/lib/subjects";
import { ImagePanel } from "../../image-panel";
import { STATUS_LABEL, STATUS_TONE, TYPE_LABEL } from "../labels";
import { QuestionActions, QuestionForm, toDefaults } from "../question-form";

export const metadata: Metadata = { title: "Ubah soal" };

export default function EditQuestionPage({ params }: PageProps<"/teacher/questions/[id]">) {
  return (
    <Suspense fallback={<p>Memuat…</p>}>
      <Edit params={params} />
    </Suspense>
  );
}

async function Edit({ params }: { params: Promise<{ id: string }> }) {
  await requireTeacher();
  const { id } = await params;
  const [q, chapters] = await Promise.all([getQuestionForTeacher(id), listChapterOptions()]);
  if (!q) notFound();
  const referencedIds = extractImageIds(
    [q.prompt, ...(q.options ?? []).map((o) => o.text), q.explanation ?? ""].join("\n"),
  );
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Ubah soal</h1>
        <Badge variant="outline">{TYPE_LABEL[q.type]}</Badge>
        <Status tone={STATUS_TONE[q.status]}>{STATUS_LABEL[q.status]}</Status>
      </div>
      <p className="text-sm text-muted-foreground">
        {q.subjectName} · {q.chapterTitle} · Diubah {formatWita(q.updatedAt)}
      </p>
      <div className="flex flex-wrap items-start gap-2">
        <Link href={`/teacher/questions/${id}/preview`} className="inline-flex min-h-11 items-center underline">
          Pratinjau
        </Link>
        <QuestionActions id={id} status={q.status} canDelete={q.status === "DRAFT"} />
      </div>
      <QuestionForm chapters={chapters} type={q.type} question={{ id, defaults: toDefaults(q) }} />
      <section aria-labelledby="gambar-heading">
        <h2 id="gambar-heading" className="text-lg font-semibold">Gambar</h2>
        <ImagePanel owner="questionId" ownerId={id} images={q.images} referencedIds={referencedIds} />
      </section>
    </section>
  );
}
