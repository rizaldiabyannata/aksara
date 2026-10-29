import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Markdown } from "@/components/material-view";
import { PageHeader } from "@/components/page-header";
import { QuestionView } from "@/components/question-view";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireTeacher } from "@/lib/auth/guard";
import { getQuestionForTeacher, toPublicQuestion } from "@/lib/questions";
import { DIFFICULTY_LABEL, STATUS_LABEL, TYPE_LABEL } from "../../labels";

export const metadata: Metadata = { title: "Pratinjau soal" };

export default function PreviewPage({ params }: PageProps<"/teacher/questions/[id]/preview">) {
  return (
    <Suspense fallback={<p className="text-base">Memuat…</p>}>
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
      <PageHeader
        title="Pratinjau soal"
        actions={
          <Link href={`/teacher/questions/${id}`} className={buttonVariants({ variant: "outline" })}>
            Kembali ke ubah soal
          </Link>
        }
      />
      <div role="note" className="rounded-xl bg-secondary p-4 text-base">
        <p className="font-semibold">
          Pratinjau. {TYPE_LABEL[q.type]} · {DIFFICULTY_LABEL[q.difficulty]} · Status: {STATUS_LABEL[q.status]}
        </p>
      </div>
      <section aria-labelledby="siswa-heading" className="flex flex-col gap-3">
        <h2 id="siswa-heading" className="text-lg font-semibold">Tampilan siswa</h2>
        <Card>
          <CardContent>
            <QuestionView question={toPublicQuestion(q)} />
          </CardContent>
        </Card>
      </section>
      <section aria-labelledby="kunci-heading" className="flex flex-col gap-3">
        <h2 id="kunci-heading" className="text-lg font-semibold">Kunci dan pembahasan</h2>
        <Card>
          <CardContent>
            <dl className="flex flex-col gap-3">
              {key !== null && (
                <div>
                  <dt className="font-semibold">{q.type === "SHORT_ANSWER" ? "Jawaban diterima" : "Jawaban benar"}</dt>
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
                  <dt className="font-semibold">Rubrik</dt>
                  <dd>{q.answerKey.rubric ?? "Belum ada rubrik."}</dd>
                </div>
              )}
              <div>
                <dt className="font-semibold">Poin</dt>
                <dd>{q.defaultPoints}</dd>
              </div>
              {q.explanation && (
                <div>
                  <dt className="font-semibold">Pembahasan</dt>
                  <dd><Markdown source={q.explanation} images={q.images} /></dd>
                </div>
              )}
              {q.verificationNote && (
                <div>
                  <dt className="font-semibold">Catatan verifikasi</dt>
                  <dd>{q.verificationNote}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
