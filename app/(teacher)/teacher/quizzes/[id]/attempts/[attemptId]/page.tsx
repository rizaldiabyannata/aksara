import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
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
    <section className="flex flex-col gap-6">
      <Link href={`/teacher/quizzes/${id}`} className="inline-flex min-h-11 items-center self-start underline">
        Kembali ke ulangan
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{a.studentName}</h1>
        <p>{a.quizTitle} · {a.className} · percobaan {a.attemptNumber}</p>
        <p>{a.submittedAt ? `Dikumpulkan ${formatWita(a.submittedAt)}` : "Masih dikerjakan."}</p>
        {a.replaced && <p>Percobaan ini diganti ({a.replacementReason}), jadi tidak dihitung.</p>}
        {a.score !== null && !a.replaced && (
          <p className="text-lg font-medium">
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
            <li key={q.quizQuestionId} className="flex flex-col gap-3 rounded-lg border p-3">
              <h2 className="font-medium">Soal {q.number} · {TYPE_LABEL[q.question.type]} · {q.points} poin</h2>
              <QuestionView question={q.question} />
              <dl className="grid gap-1 sm:grid-cols-[10rem_1fr]">
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
            </li>
          );
        })}
      </ol>
    </section>
  );
}
