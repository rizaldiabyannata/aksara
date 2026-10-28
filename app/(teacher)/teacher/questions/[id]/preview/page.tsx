import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Markdown } from "@/components/material-view";
import { QuestionView } from "@/components/question-view";
import { requireTeacher } from "@/lib/auth/guard";
import { getQuestionForTeacher, toPublicQuestion } from "@/lib/questions";
import { DIFFICULTY_LABEL, STATUS_LABEL, TYPE_LABEL } from "../../labels";

export const metadata: Metadata = { title: "Pratinjau soal" };

export default function PreviewPage({ params }: PageProps<"/teacher/questions/[id]/preview">) {
  return (
    <Suspense fallback={<p>Memuat…</p>}>
      <Preview params={params} />
    </Suspense>
  );
}

async function Preview({ params }: { params: Promise<{ id: string }> }) {
  await requireTeacher();
  const { id } = await params;
  const q = await getQuestionForTeacher(id);
  if (!q) notFound();
  const optionText = (oid: string) =>
    `${oid.toUpperCase()}. ${q.options?.find((o) => o.id === oid)?.text ?? ""}`;
  const key =
    q.type === "SINGLE_CHOICE" ? optionText(q.answerKey.optionId)
    : q.type === "TRUE_FALSE" ? (q.answerKey.value ? "Benar" : "Salah")
    : q.type === "MULTIPLE_SELECT" ? q.answerKey.optionIds.map(optionText).join("; ")
    : q.type === "SHORT_ANSWER" ? q.answerKey.accepted.join(" / ")
    : null;
  return (
    <div className="flex flex-col gap-6">
      <div role="note" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted p-3">
        <p className="font-medium">
          Pratinjau. {TYPE_LABEL[q.type]} · {DIFFICULTY_LABEL[q.difficulty]} · Status: {STATUS_LABEL[q.status]}
        </p>
        <Link href={`/teacher/questions/${id}`} className="inline-flex min-h-11 items-center underline">
          Kembali ke ubah soal
        </Link>
      </div>
      <section aria-labelledby="siswa-heading" className="flex flex-col gap-3">
        <h2 id="siswa-heading" className="text-lg font-semibold">Tampilan siswa</h2>
        <QuestionView question={toPublicQuestion(q)} />
      </section>
      <section aria-labelledby="kunci-heading" className="flex flex-col gap-3">
        <h2 id="kunci-heading" className="text-lg font-semibold">Kunci dan pembahasan</h2>
        <dl className="flex flex-col gap-3">
          {key !== null && (
            <div>
              <dt className="font-medium">{q.type === "SHORT_ANSWER" ? "Jawaban diterima" : "Jawaban benar"}</dt>
              <dd>
                {key}
                {q.type === "SHORT_ANSWER" && (
                  <span className="text-muted-foreground">
                    {" "}({q.answerKey.caseSensitive ? "huruf besar dan kecil dibedakan" : "huruf besar dan kecil tidak dibedakan"})
                  </span>
                )}
              </dd>
            </div>
          )}
          {q.type === "ESSAY" && (
            <div>
              <dt className="font-medium">Rubrik</dt>
              <dd>{q.answerKey.rubric ?? "Belum ada rubrik."}</dd>
            </div>
          )}
          <div>
            <dt className="font-medium">Poin</dt>
            <dd>{q.defaultPoints}</dd>
          </div>
          {q.explanation && (
            <div>
              <dt className="font-medium">Pembahasan</dt>
              <dd><Markdown source={q.explanation} images={q.images} /></dd>
            </div>
          )}
          {q.verificationNote && (
            <div>
              <dt className="font-medium">Catatan verifikasi</dt>
              <dd>{q.verificationNote}</dd>
            </div>
          )}
        </dl>
      </section>
    </div>
  );
}
