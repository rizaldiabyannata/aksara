import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireTeacher } from "@/lib/auth/guard";
import { formatWita } from "@/lib/format";
import { listQuizzes } from "@/lib/quizzes";
import { STATUS_LABEL, STATUS_TONE } from "./labels";

export const metadata: Metadata = { title: "Ulangan" };

export default function QuizzesPage() {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Ulangan"
        description="Susun ulangan, terbitkan ke kelas, lalu lihat hasilnya."
        actions={
          <Link href="/teacher/quizzes/new" className={buttonVariants()}>
            Buat ulangan
          </Link>
        }
      />
      <Suspense fallback={<p className="text-base">Memuat…</p>}>
        <List />
      </Suspense>
    </section>
  );
}

async function List() {
  await requireTeacher();
  const rows = await listQuizzes();
  if (rows.length === 0) {
    return <p className="text-base text-muted-foreground">Belum ada ulangan. Tekan Buat ulangan untuk membuat yang pertama.</p>;
  }
  return (
    <ul className="flex flex-col gap-4">
      {rows.map((r) => (
        <li key={r.id}>
          <Card className="text-base!">
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Status tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Status>
                <Badge variant="outline">{r.subjectName}</Badge>
              </div>
              <Link href={`/teacher/quizzes/${r.id}`} className="inline-flex min-h-11 items-center text-lg font-semibold underline-offset-4 hover:underline">
                {r.title}
              </Link>
              <p className="text-muted-foreground">
                {r.questionCount} soal · {r.classNames.length ? r.classNames.join(", ") : "Belum ada kelas"} · Diubah{" "}
                {formatWita(r.updatedAt)}
              </p>
              <div className="flex flex-wrap gap-2">
                <a href={`/api/exports/${r.id}`} download className={buttonVariants({ variant: "outline" })}>
                  Unduh Excel<span className="sr-only">: {r.title}</span>
                </a>
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
