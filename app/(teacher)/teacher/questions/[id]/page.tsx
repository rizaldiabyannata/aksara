import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireTeacher } from "@/lib/auth/guard";
import { formatWita } from "@/lib/format";
import { extractImageIds } from "@/lib/images";
import { getQuestionForTeacher } from "@/lib/questions";
import { listChapterOptions } from "@/lib/subjects";
import { ImagePanel } from "../../image-panel";
import { STATUS_LABEL, STATUS_TONE, TYPE_LABEL } from "../labels";
import { toDefaults } from "../question-defaults";
import { QuestionActions, QuestionForm } from "../question-form";

export const metadata: Metadata = { title: "Ubah soal" };

export default function EditQuestionPage({ params }: PageProps<"/teacher/questions/[id]">) {
  return (
    <Suspense fallback={<p className="text-base">Memuat…</p>}>
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
      <PageHeader
        title="Ubah soal"
        description={
          <span className="flex flex-col gap-2">
            <span className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{TYPE_LABEL[q.type]}</Badge>
              <Status tone={STATUS_TONE[q.status]}>{STATUS_LABEL[q.status]}</Status>
            </span>
            <span className="text-base">
              {q.subjectName} · {q.chapterTitle} · Diubah {formatWita(q.updatedAt)}
            </span>
          </span>
        }
        actions={
          <>
            <Link href={`/teacher/questions/${id}/preview`} className={buttonVariants({ variant: "outline" })}>
              Pratinjau
            </Link>
            <QuestionActions id={id} status={q.status} canDelete={q.status === "DRAFT"} />
          </>
        }
      />
      <QuestionForm chapters={chapters} type={q.type} question={{ id, defaults: toDefaults(q) }} />
      <section aria-labelledby="gambar-heading">
        <h2 id="gambar-heading" className="text-lg font-semibold">Gambar</h2>
        <ImagePanel owner="questionId" ownerId={id} images={q.images} referencedIds={referencedIds} />
      </section>
    </section>
  );
}
