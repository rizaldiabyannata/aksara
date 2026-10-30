import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Edit02Icon, CheckmarkCircle02Icon, File01Icon, ChartColumnIcon } from "@hugeicons/core-free-icons";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Status } from "@/components/status";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireTeacher } from "@/lib/auth/guard";
import { formatWita } from "@/lib/format";
import { getTeacherDashboard } from "@/lib/dashboard";
import { getSubjectTree } from "@/lib/subjects";
import { listQuizzes } from "@/lib/quizzes";
import { STATUS_LABEL, STATUS_TONE } from "./labels";
import { CreateQuizForm } from "./quiz-forms";

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
  const [rows, dash, tree] = await Promise.all([listQuizzes(), getTeacherDashboard(), getSubjectTree()]);
  const subjects = tree.map((s) => ({ id: s.id, name: s.name }));
  const published = rows.filter((r) => r.status === "PUBLISHED").length;
  const released = rows.filter((r) => r.resultsReleasedAt).length;
  const toGrade = dash.tasks.reduce((n, t) => (t.kind === "GRADE" ? n + t.essays : n), 0);
  const label = "text-sm font-semibold tracking-wide text-muted-foreground uppercase";
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ulangan terbit" value={published} hint="ulangan" icon={CheckmarkCircle02Icon} tone="success" />
        <StatCard label="Ulangan draf" value={rows.length - published} hint="ulangan" icon={File01Icon} tone="primary" />
        <StatCard label="Perlu penilaian" value={toGrade} hint="uraian" icon={Edit02Icon} tone="warning" />
        <StatCard label="Hasil dirilis" value={released} hint="ulangan" icon={ChartColumnIcon} tone="info" />
      </div>
      <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <div className="flex flex-col gap-4">
          <h2 className="flex items-center gap-3 text-xl font-bold">
            Daftar ulangan <Badge variant="secondary">Total {rows.length}</Badge>
          </h2>
          {rows.length === 0 && (
            <p className="text-base text-muted-foreground">Belum ada ulangan. Isi formulir cepat untuk membuat yang pertama.</p>
          )}
          <ul className="flex flex-col gap-4">
            {rows.map((r) => (
              <li key={r.id}>
                <Card>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Status tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Status>
                      <Badge variant="outline">{r.subjectName}</Badge>
                    </div>
                    <Link href={`/teacher/quizzes/${r.id}`} className="inline-flex min-h-11 items-center text-xl font-bold underline-offset-4 hover:underline">
                      {r.title}
                    </Link>
                    {r.instructions && <p className="line-clamp-2 text-muted-foreground">{r.instructions}</p>}
                    <dl className="grid gap-3 rounded-xl bg-secondary p-4 sm:grid-cols-3">
                      <div>
                        <dt className={label}>Kelas sasaran</dt>
                        <dd className="font-semibold">{r.classNames.length ? r.classNames.join(", ") : "Belum ada kelas"}</dd>
                      </div>
                      <div>
                        <dt className={label}>Durasi & percobaan</dt>
                        <dd className="font-semibold">{r.durationMinutes} menit · {r.maxAttempts}x percobaan</dd>
                      </div>
                      <div>
                        <dt className={label}>Butir soal & KKM</dt>
                        <dd className="font-semibold">{r.questionCount} soal{r.kkm !== null ? ` · KKM ${r.kkm}` : ""}</dd>
                      </div>
                    </dl>
                    <p className="text-muted-foreground">Diubah {formatWita(r.updatedAt)}</p>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/teacher/quizzes/${r.id}`} className={buttonVariants({ className: "h-11" })}>
                        {r.status === "PUBLISHED" ? "Pantau & nilai" : "Lanjutkan penyusunan"}
                      </Link>
                      <a href={`/api/exports/${r.id}`} download className={buttonVariants({ variant: "outline" })}>
                        Unduh Excel<span className="sr-only">: {r.title}</span>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </div>
        <aside aria-label="Formulir cepat" className="flex flex-col gap-4">
          <CreateQuizForm subjects={subjects} />
        </aside>
      </div>
    </div>
  );
}
