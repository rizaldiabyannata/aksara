import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Markdown } from "@/components/material-view";
import { Status, type StatusTone } from "@/components/status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStudent } from "@/lib/auth/guard";
import { listStudentQuizzes, type StudentQuizRow } from "@/lib/attempts";
import { formatWita } from "@/lib/format";
import { StartButton } from "./start-button";

export const metadata: Metadata = { title: "Ulangan" };

const LINK = "inline-flex min-h-11 items-center underline underline-offset-4";

export default function StudentQuizzesPage() {
  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={<p>Memuat…</p>}>
        <QuizList />
      </Suspense>
    </div>
  );
}

const STATE_TONE: Record<StudentQuizRow["state"], StatusTone> = {
  AVAILABLE: "info", REPLACEMENT: "info", IN_PROGRESS: "warning", SCHEDULED: "neutral", DONE: "success", CLOSED: "neutral",
};

function stateText(r: StudentQuizRow) {
  switch (r.state) {
    case "AVAILABLE": return "Tersedia";
    case "SCHEDULED": return `Terjadwal, mulai ${r.startsAt ? formatWita(r.startsAt) : ""}`.trim();
    case "IN_PROGRESS": return "Sedang dikerjakan";
    case "REPLACEMENT": return "Guru membukakan percobaan pengganti untukmu";
    case "DONE": return "Selesai";
    case "CLOSED": return "Ditutup";
  }
}

function startLabel(r: StudentQuizRow) {
  if (r.state === "IN_PROGRESS") return "Lanjutkan";
  if (r.state === "AVAILABLE" || r.state === "REPLACEMENT") return r.hasAttempts ? "Ulangi" : "Mulai";
  return null;
}

async function QuizList() {
  const user = await requireStudent();
  const rows = await listStudentQuizzes({ id: user.id, classId: user.classId });
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Ulangan</h1>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">Belum ada ulangan untukmu.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((r) => {
            const label = startLabel(r);
            return (
              <li key={r.quizId}>
                <Card>
                  <CardHeader>
                    <CardTitle>{r.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{r.subjectName}</p>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <div>
                      <Status tone={STATE_TONE[r.state]}>{stateText(r)}</Status>
                    </div>
                    <p className="text-sm">
                      Durasi {r.durationMinutes} menit · {r.questionCount} soal · Sisa percobaan {r.remainingAttempts}
                    </p>
                    {r.instructions ? <Markdown source={r.instructions} images={[]} /> : null}
                    {label ? <StartButton quizId={r.quizId} title={r.title} label={label} /> : null}
                    {r.hasAttempts && r.state !== "IN_PROGRESS" && (r.resultsReleased ? (
                      <Link href={`/student/quizzes/${r.quizId}/result`} className={LINK} aria-label={`Lihat hasil ${r.title}`}>
                        Lihat hasil
                      </Link>
                    ) : (
                      <p className="text-sm">Sudah dikumpulkan. Tunggu gurumu merilis hasil.</p>
                    ))}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
