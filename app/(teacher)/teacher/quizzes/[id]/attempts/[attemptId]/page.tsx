import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/material-view";
import { QuestionView } from "@/components/question-view";
import { requireTeacher } from "@/lib/auth/guard";
import { getAttemptForTeacher } from "@/lib/attempts";
import { readable } from "@/lib/export";
import { formatScore, formatWita } from "@/lib/format";
import { TYPE_LABEL } from "../../../../questions/labels";
import { EssayGradeForm } from "./essay-form";

export const metadata: Metadata = { title: "Jawaban siswa" };

export default function AttemptPage({ params }: PageProps<"/teacher/quizzes/[id]/attempts/[attemptId]">) {
  return (
    <Suspense fallback={<p>Memuat…</p>}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: Promise<{ id: string; attemptId: string }> }) {
  await requireTeacher();
  const { id, attemptId } = await params;
  const a = await getAttemptForTeacher(id, attemptId);
  if (!a) notFound();
  const gradable = a.status === "SUBMITTED" && !a.replaced;
  const pending = a.questions.filter((q) => q.question.type === "ESSAY" && q.manualPoints === null).length;
  return (
    <section className="flex flex-col gap-space-lg px-space-lg py-space-md">
      <Link href={`/teacher/quizzes/${id}`} className="inline-flex min-h-11 items-center self-start underline">
        Kembali ke ulangan
      </Link>
      <div className="relative flex flex-col gap-space-md overflow-hidden rounded-2xl bg-surface-card p-space-xl shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-lg font-bold text-primary-strong">
            {a.studentName.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <PageHeader title={a.studentName} description={a.quizTitle} />
          </div>
          {a.score !== null && !a.replaced && (
            <div className="text-right">
              <p className="text-metric font-extrabold text-primary-strong">{formatScore(a.score)}</p>
              <p className="text-sm font-semibold text-muted-foreground">{pending > 0 ? "Nilai sementara" : "Nilai akhir"}</p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{a.className}</Badge>
          <Badge variant="outline">Percobaan {a.attemptNumber}</Badge>
          {pending > 0 && <Status tone="warning">{pending} uraian belum dinilai</Status>}
        </div>
        <p>{a.submittedAt ? `Dikumpulkan ${formatWita(a.submittedAt)}` : "Masih dikerjakan."}</p>
        {a.replaced && <p>Percobaan ini diganti ({a.replacementReason}), jadi tidak dihitung.</p>}
        {a.score !== null && !a.replaced && (
          <p className="sr-only">
            {pending > 0
              ? `Nilai sementara ${formatScore(a.score)}: ${pending} uraian belum dinilai`
              : `Nilai ${formatScore(a.score)}`}
          </p>
        )}
      </div>
      <ol className="flex flex-col gap-4">
        {a.questions.map((q) => {
          const essay = q.question.type === "ESSAY";
          return (
            <li key={q.quizQuestionId}>
             <div className="flex flex-col gap-space-md rounded-2xl bg-surface-card p-space-lg shadow-sm transition-all hover:shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold">
                  Soal {q.number}<span className="sr-only"> · {TYPE_LABEL[q.question.type]} · {q.points} poin</span>
                  <Badge variant="outline" aria-hidden="true">{TYPE_LABEL[q.question.type]}</Badge>
                  <Badge variant="secondary" aria-hidden="true">{q.points} poin</Badge>
                </h2>
                {essay ? (
                  q.manualPoints === null ? <Status tone="warning">Belum dinilai</Status> : <Status tone="success">Sudah dinilai</Status>
                ) : null}
              </div>
              <QuestionView question={q.question} />
              <dl className="grid gap-1 rounded-xl bg-canvas-peach p-space-md sm:grid-cols-[10rem_1fr]">
                <dt className="font-medium">Jawaban siswa</dt>
                <dd className="whitespace-pre-wrap">{readable(q.question, q.answer)}</dd>
                <dt className="font-medium">{essay ? "Rubrik" : "Kunci"}</dt>
                <dd className="whitespace-pre-wrap">{readable(q.question, q.answerKey) || "-"}</dd>
                <dt className="font-medium">Poin</dt>
                <dd>
                  {essay
                    ? q.manualPoints === null ? "Belum dinilai" : `${formatScore(q.manualPoints)} dari ${q.points}`
                    : q.objectivePoints === null ? "-"
                    : `${q.objectivePoints} dari ${q.points} (${q.objectivePoints === q.points ? "benar" : "salah"})`}
                </dd>
              </dl>
              {q.explanation && (
                <details>
                  <summary className="min-h-11 cursor-pointer py-2">Pembahasan</summary>
                  <Markdown source={q.explanation} images={q.explanationImages} />
                </details>
              )}
              {essay && gradable && q.answerId && (
                <EssayGradeForm answerId={q.answerId} n={q.number} max={q.points} points={q.manualPoints}
                  feedback={q.feedback} blank={q.answer === null} />
              )}
             </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
