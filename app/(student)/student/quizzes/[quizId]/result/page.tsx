import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Award01Icon } from "@hugeicons/core-free-icons";
import { Markdown } from "@/components/material-view";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { QuestionView } from "@/components/question-view";
import { Status } from "@/components/status";
import { buttonVariants } from "@/components/ui/button";
import { listStudentQuizzes } from "@/lib/attempts";
import { requireStudent } from "@/lib/auth/guard";
import { readable } from "@/lib/export";
import { formatScore, formatWita } from "@/lib/format";
import { TKA_CATEGORY_LABEL, TKA_CATEGORY_NOTE, TKA_CATEGORY_TONE } from "@/lib/evaluation";
import { getStudentResult } from "@/lib/results";

export const metadata: Metadata = { title: "Hasil ulangan" };

export default function ResultPage({ params }: PageProps<"/student/quizzes/[quizId]/result">) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<p>Memuat…</p>}>
        <Result params={params} />
      </Suspense>
    </div>
  );
}

// Renders only getStudentResult's projection: keys and explanations are absent unless the server allowed them.
async function Result({ params }: { params: Promise<{ quizId: string }> }) {
  const user = await requireStudent();
  const { quizId } = await params;
  const r = await getStudentResult(user.id, quizId);
  if (!r) {
    return (
      <section className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-6 shadow-card">
        <PageHeader title="Hasil ulangan" />
        <Status tone="info">Nilaimu belum keluar</Status>
        <p>Nilaimu akan muncul setelah gurumu membagikannya.</p>
        <Link href="/student" className={buttonVariants({ size: "lg" })}>
          Kembali ke beranda
        </Link>
      </section>
    );
  }
  // Same rule the dashboard uses for "Kamu bisa mencoba lagi": an open retake on the student's own row.
  const retake =
    r.passed === false &&
    (await listStudentQuizzes({ id: user.id, classId: user.classId })).some(
      (q) => q.quizId === quizId && q.state === "AVAILABLE" && q.hasAttempts,
    );
  return (
    <>
      <section className="flex flex-col items-start gap-4">
        <PageHeader title={`Hasil: ${r.quizTitle}`} />
        {r.recap === null ? (
          <p className="rounded-2xl bg-primary-soft p-4 text-lg">Nilaimu belum final. Gurumu masih memeriksa jawaban uraian.</p>
        ) : (
          <div className="w-full max-w-sm">
            <StatCard label="Nilaimu" value={formatScore(r.recap)} icon={Award01Icon} tone={r.passed !== false ? "success" : "primary"} />
          </div>
        )}
        {r.kkm !== null && r.passed !== null && (
          r.passed ? (
            <Status tone="success">Kamu tuntas</Status>
          ) : retake ? (
            <Status tone="info">Kamu bisa mencoba lagi</Status>
          ) : (
            <Status tone="neutral">Belum mencapai KKM {r.kkm}</Status>
          )
        )}
        {retake && (
          <Link href="/student" className={buttonVariants({ size: "lg" })}>
            Coba lagi dari beranda
          </Link>
        )}
        {r.category && (
          <div className="flex flex-col gap-1">
            <Status tone={TKA_CATEGORY_TONE[r.category]}>Kategori: {TKA_CATEGORY_LABEL[r.category]}</Status>
            <p className="text-sm text-muted-foreground">{TKA_CATEGORY_NOTE}</p>
          </div>
        )}
        {r.chapters && r.chapters.length > 1 && (
          <section aria-labelledby="per-bab" className="flex w-full max-w-xl flex-col gap-2">
            <h2 id="per-bab" className="text-lg font-bold">Hasilmu per bagian</h2>
            <ul className="flex flex-col gap-2">
              {r.chapters.map((c) => (
                <li key={c.key} className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3">
                  <span className="flex justify-between gap-2 font-semibold">
                    <span>{c.key}</span>
                    <span className="tabular-nums">{c.earned} dari {c.max} benar</span>
                  </span>
                  <span aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${c.pct}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>
      {r.attempts.map((a) => (
        <section key={a.label} aria-label={a.label} className="flex flex-col gap-3">
          <h2 className="flex items-center gap-3 text-xl font-bold">
            <span aria-hidden="true" className="h-6 w-1.5 rounded-full bg-accent-decor" />
            {a.label}
          </h2>
          <p>
            {a.submittedAt && `Dikumpulkan ${formatWita(a.submittedAt)} · `}
            {a.score === null ? "Nilai belum final" : `Nilai ${formatScore(a.score)}`}
          </p>
          <ol className="flex flex-col gap-4">
            {a.answers.map((x) => (
              <li key={x.question.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
                <h3 className="w-fit rounded-full bg-primary-soft px-3 py-1 font-semibold text-primary-strong">Soal {x.number}</h3>
                <QuestionView question={x.question} />
                <p className="whitespace-pre-wrap"><span className="font-medium">Jawabanmu:</span> {readable(x.question, x.answer)}</p>
                {x.correct === null ? (
                  <p>{x.earned === null ? "Belum dinilai guru" : `Poin ${formatScore(x.earned)} dari ${x.points}`}</p>
                ) : (
                  <p className="flex flex-wrap items-center gap-2">
                    <Status tone={x.correct ? "success" : "warning"}>{x.correct ? "Benar" : "Belum tepat"}</Status>
                    <span>
                      Poin {x.earned} dari {x.points}
                    </span>
                  </p>
                )}
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
