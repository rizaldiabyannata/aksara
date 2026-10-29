import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Status } from "@/components/status";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireTeacher } from "@/lib/auth/guard";
import { formatWita } from "@/lib/format";
import { listQuizzes } from "@/lib/quizzes";
import { STATUS_LABEL, STATUS_TONE } from "./labels";

export const metadata: Metadata = { title: "Ulangan" };

export default function QuizzesPage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Ulangan</h1>
        <Link href="/teacher/quizzes/new" className={buttonVariants({ className: "h-11" })}>Buat ulangan</Link>
      </div>
      <Suspense fallback={<p>Memuat…</p>}>
        <List />
      </Suspense>
    </section>
  );
}

async function List() {
  await requireTeacher();
  const rows = await listQuizzes();
  if (rows.length === 0) return <p className="text-muted-foreground">Belum ada ulangan.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-col gap-2 rounded-lg border p-3">
          <Link href={`/teacher/quizzes/${r.id}`} className="inline-flex min-h-11 items-center font-medium underline">
            {r.title}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Status tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Status>
            <Badge variant="outline">{r.subjectName}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {r.questionCount} soal · {r.classNames.length ? r.classNames.join(", ") : "Belum ada kelas"} · Diubah{" "}
            {formatWita(r.updatedAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}
