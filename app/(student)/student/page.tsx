import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Markdown } from "@/components/material-view";
import { Status, type StatusTone } from "@/components/status";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStudent } from "@/lib/auth/guard";
import { listStudentQuizzes, type StudentQuizRow } from "@/lib/attempts";
import { formatWita, formatWitaTime } from "@/lib/format";
import { listPublishedTree } from "@/lib/materials";
import { StartButton } from "./quizzes/start-button";

export const metadata: Metadata = { title: "Beranda" };

export default function StudentDashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={<p>Memuat…</p>}>
        <Dashboard />
      </Suspense>
    </div>
  );
}

// Lower rank first: continue, can do, result out, upcoming, waiting for teacher.
function rank(r: StudentQuizRow) {
  if (r.state === "IN_PROGRESS") return 1;
  if (r.state === "AVAILABLE" || r.state === "REPLACEMENT") return 2;
  if (r.resultsReleased && r.hasAttempts) return 3;
  if (r.state === "SCHEDULED") return 4;
  return 5;
}

function Row({ r }: { r: StudentQuizRow }) {
  const rk = rank(r);
  let tone: StatusTone = "neutral";
  let text = "";
  let action: React.ReactNode = null;
  if (rk === 1) {
    tone = "warning";
    text = `Waktu habis pukul ${r.deadlineAt ? formatWitaTime(r.deadlineAt) : ""}`.trim();
    action = (
      <Link href={`/student/quizzes/${r.quizId}/attempt`} className={buttonVariants({ size: "lg" })} aria-label={`Lanjutkan ${r.title}`}>
        Lanjutkan
      </Link>
    );
  } else if (rk === 2) {
    tone = "info";
    text = r.state === "REPLACEMENT" ? "Gurumu membukakan kesempatan baru untukmu" : r.hasAttempts ? "Kamu bisa mencoba lagi" : "Siap dikerjakan";
    action = (
      <>
        <StartButton quizId={r.quizId} title={r.title} label={r.hasAttempts ? "Ulangi" : "Mulai"} />
        {r.resultsReleased && r.hasAttempts ? (
          <Link href={`/student/quizzes/${r.quizId}/result`} className={buttonVariants({ size: "lg", variant: "outline" })} aria-label={`Lihat nilai ${r.title}`}>
            Lihat nilai
          </Link>
        ) : null}
      </>
    );
  } else if (rk === 3) {
    tone = "success";
    text = "Nilaimu sudah keluar";
    action = (
      <Link href={`/student/quizzes/${r.quizId}/result`} className={buttonVariants({ size: "lg", variant: "outline" })} aria-label={`Lihat nilai ${r.title}`}>
        Lihat nilai
      </Link>
    );
  } else if (rk === 4) {
    text = `Mulai ${r.startsAt ? formatWita(r.startsAt) : ""}`.trim();
  } else {
    text = r.hasAttempts ? "Nilaimu akan muncul setelah gurumu membagikannya" : "Ulangan ini sudah ditutup.";
  }
  return (
    <li>
      <Card className={rk === 1 ? "border-2 border-primary" : undefined}>
        <CardHeader>
          {rk === 1 ? <p className="font-semibold">Lanjutkan ulangan</p> : null}
          <CardTitle>{r.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{r.subjectName}</p>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-3">
          <Status tone={tone}>{text}</Status>
          {rk <= 2 ? (
            <>
              <p className="text-sm text-muted-foreground">
                {r.durationMinutes} menit · {r.questionCount} soal
              </p>
              {r.instructions ? <Markdown source={r.instructions} images={[]} /> : null}
            </>
          ) : null}
          {action}
        </CardContent>
      </Card>
    </li>
  );
}

async function Dashboard() {
  const user = await requireStudent();
  const [rows, subjects] = await Promise.all([
    listStudentQuizzes({ id: user.id, classId: user.classId }),
    listPublishedTree(),
  ]);
  const sorted = rows.map((r) => ({ r, k: rank(r) })).sort((a, b) => a.k - b.k).map((x) => x.r); // stable
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Halo, {user.displayName}</h1>
      <section aria-labelledby="ulangan" className="flex flex-col gap-3">
        <h2 id="ulangan" className="text-xl font-semibold">Ulangan</h2>
        {sorted.length === 0 ? (
          <p className="text-muted-foreground">Belum ada ulangan. Sambil menunggu, baca materi dulu.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {sorted.map((r) => (
              <Row key={r.quizId} r={r} />
            ))}
          </ul>
        )}
      </section>
      {subjects.length > 0 ? (
        <section aria-labelledby="materi" className="flex flex-col gap-3">
          <h2 id="materi" className="text-xl font-semibold">Materi</h2>
          <div className="flex flex-wrap gap-3">
            {subjects.map((s) => (
              <Link key={s.id} href={`/student/materials#${s.id}`} className={buttonVariants({ size: "lg", variant: "outline" })}>
                {s.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
