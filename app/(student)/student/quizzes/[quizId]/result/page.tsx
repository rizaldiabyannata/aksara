import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Markdown } from "@/components/material-view";
import { QuestionView } from "@/components/question-view";
import { requireStudent } from "@/lib/auth/guard";
import { readable } from "@/lib/export";
import { formatScore, formatWita } from "@/lib/format";
import { getStudentResult } from "@/lib/results";

export const metadata: Metadata = { title: "Hasil ulangan" };

export default function ResultPage({ params }: PageProps<"/student/quizzes/[quizId]/result">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4">
      <Suspense fallback={<p>Memuat…</p>}>
        <Result params={params} />
      </Suspense>
    </main>
  );
}

// Renders only getStudentResult's projection: keys and explanations are absent unless the server allowed them.
async function Result({ params }: { params: Promise<{ quizId: string }> }) {
  const user = await requireStudent();
  const { quizId } = await params;
  const r = await getStudentResult(user.id, quizId);
  if (!r) notFound();
  return (
    <>
      <Link href="/student/quizzes" className="inline-flex min-h-11 items-center self-start underline underline-offset-4">
        Kembali ke daftar ulangan
      </Link>
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Hasil: {r.quizTitle}</h1>
        {r.recap === null ? (
          <p className="text-lg">Nilaimu belum final. Gurumu masih memeriksa jawaban uraian.</p>
        ) : (
          <p className="text-lg font-medium">Nilaimu {formatScore(r.recap)}</p>
        )}
        {r.kkm !== null && (
          <p>
            KKM {r.kkm}
            {r.passed !== null && ` · ${r.passed ? "Tuntas" : "Belum tuntas"}`}
          </p>
        )}
      </section>
      {r.attempts.map((a) => (
        <section key={a.label} aria-label={a.label} className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">{a.label}</h2>
          <p>
            {a.submittedAt && `Dikumpulkan ${formatWita(a.submittedAt)} · `}
            {a.score === null ? "Nilai belum final" : `Nilai ${formatScore(a.score)}`}
          </p>
          <ol className="flex flex-col gap-4">
            {a.answers.map((x) => (
              <li key={x.question.id} className="flex flex-col gap-3 rounded-lg border p-3">
                <h3 className="font-medium">Soal {x.number}</h3>
                <QuestionView question={x.question} />
                <p className="whitespace-pre-wrap"><span className="font-medium">Jawabanmu:</span> {readable(x.question, x.answer)}</p>
                <p>
                  {x.correct === null
                    ? x.earned === null ? "Belum dinilai guru" : `Poin ${formatScore(x.earned)} dari ${x.points}`
                    : `${x.correct ? "Benar" : "Salah"} · poin ${x.earned} dari ${x.points}`}
                </p>
                {x.answerKey && <p><span className="font-medium">Jawaban benar:</span> {readable(x.question, x.answerKey)}</p>}
                {x.explanation && (
                  <div className="flex flex-col gap-1">
                    <p className="font-medium">Pembahasan</p>
                    <Markdown source={x.explanation} images={x.explanationImages ?? []} />
                  </div>
                )}
                {x.feedback && <p className="whitespace-pre-wrap"><span className="font-medium">Pesan guru:</span> {x.feedback}</p>}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </>
  );
}
