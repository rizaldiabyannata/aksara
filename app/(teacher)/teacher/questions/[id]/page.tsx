import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ViewIcon } from "@hugeicons/core-free-icons";
import { Status } from "@/components/status";
import { Badge } from "@/components/ui/badge";
import { requireTeacher } from "@/lib/auth/guard";
import { formatWita } from "@/lib/format";
import { extractImageIds } from "@/lib/images";
import { getQuestionForTeacher } from "@/lib/questions";
import { listChapterOptions } from "@/lib/subjects";
import { ImagePanel } from "../../image-panel";
import { EditorHeader } from "../editor-header";
import { TypeStrip } from "../type-strip";
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
    <section className="w-full max-w-[1400px] mx-auto flex-1 px-space-xl py-space-lg">
      <EditorHeader
        title="Ubah soal"
        badges={
          <>
            <Badge variant="secondary">{TYPE_LABEL[q.type]}</Badge>
            <Status tone={STATUS_TONE[q.status]}>{STATUS_LABEL[q.status]}</Status>
          </>
        }
        description={`${q.subjectName} · ${q.chapterTitle} · Diubah ${formatWita(q.updatedAt)}`}
        actions={
          <>
            <Link
              href={`/teacher/questions/${id}/preview`}
              className="h-11 px-4 rounded-xl bg-surface-card border border-border-subtle text-text-primary hover:bg-surface-container transition-all flex items-center gap-2 text-sm font-semibold shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              <HugeiconsIcon icon={ViewIcon} className="size-[19px] text-text-muted" aria-hidden="true" />
              Pratinjau
            </Link>
            <QuestionActions id={id} status={q.status} canDelete={q.status === "DRAFT"} />
          </>
        }
      />
      <TypeStrip current={q.type} links={false} />
      <QuestionForm chapters={chapters} type={q.type} question={{ id, defaults: toDefaults(q) }} />
      <section aria-labelledby="gambar-heading" className="bg-surface-card rounded-2xl p-space-lg border border-border-subtle shadow-sm flex flex-col gap-4 mb-16">
        <h2 id="gambar-heading" className="text-base font-bold text-text-primary pb-3 border-b border-border-subtle">Panel Gambar Soal</h2>
        <ImagePanel owner="questionId" ownerId={id} images={q.images} referencedIds={referencedIds} />
      </section>
    </section>
  );
}
