import Link from "next/link";
import { Status, type StatusTone } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatScore, formatWitaTime } from "@/lib/format";
import type { QuizRecap, RecapRow, RecapState } from "@/lib/results";
import { ReplaceButton } from "./replace-button";

const STATE: Record<RecapState, { tone: StatusTone; label: string }> = {
  NOT_STARTED: { tone: "neutral", label: "Belum mulai" },
  IN_PROGRESS: { tone: "info", label: "Sedang mengerjakan" },
  WAITING_REPLACEMENT: { tone: "warning", label: "Menunggu pengganti" },
  NEEDS_GRADING: { tone: "warning", label: "Perlu dinilai" },
  FINAL: { tone: "success", label: "Selesai" },
};
const ATTEMPT_LABEL = { running: "Sedang dikerjakan", done: "Terkumpul", replaced: "Diganti" };
const selectClass =
  "h-12 w-full rounded-lg border-2 border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring";

function StateStatus({ row, now }: { row: RecapRow; now: Date }) {
  const { tone, label } = STATE[row.state];
  const run = row.running;
  if (!run) return <Status tone={tone}>{label}</Status>;
  // Inside the 60 s network grace the deadline is already past: say so instead of a negative time.
  const end = run.deadlineAt > now ? `selesai pukul ${formatWitaTime(run.deadlineAt)}` : "waktu habis";
  return <Status tone={tone}>{label} · {run.answered}/{run.total} terjawab · {end}</Status>;
}

function Scores({ row, quiz }: { row: RecapRow; quiz: QuizRecap["quiz"] }) {
  const { recap, highest, final } = row.recap;
  if (recap === null) return <p className="text-muted-foreground">Belum ada nilai</p>;
  return (
    <div className="flex flex-col">
      <span className="font-medium">Nilai {final ? "" : "sementara "}{formatScore(recap)}</span>
      {quiz.scoringPolicy === "REMEDIAL" && highest !== null && highest > recap && (
        <span className="text-sm text-muted-foreground">Nilai asli {formatScore(highest)}</span>
      )}
    </div>
  );
}

function Tuntas({ row, kkm }: { row: RecapRow; kkm: number | null }) {
  // A provisional score (ungraded essays) must not claim passed or not.
  if (kkm === null) return null;
  if (row.recap.passed === null || !row.recap.final) return <p className="text-muted-foreground">Ketuntasan belum ada</p>;
  return row.recap.passed ? <Status tone="success">Tuntas</Status> : <Status tone="warning">Belum tuntas</Status>;
}

function Attempts({ row, quizId }: { row: RecapRow; quizId: string }) {
  return (
    <details className="mt-3">
      <summary className="flex min-h-11 cursor-pointer items-center underline">Lihat percobaan</summary>
      {row.attempts.length === 0 ? (
        <p className="py-2 text-muted-foreground">{row.name} belum mengerjakan.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-3">
          {row.attempts.map((a) => {
            const href = `/teacher/quizzes/${quizId}/attempts/${a.attemptId}`;
            const who = `${row.name}, percobaan ${a.attemptNumber}`;
            return (
              <li key={a.attemptId} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border p-3">
                <p className="font-medium">Percobaan {a.attemptNumber}</p>
                <p>
                  {a.replaced ? ATTEMPT_LABEL.replaced : a.status === "IN_PROGRESS" ? ATTEMPT_LABEL.running : ATTEMPT_LABEL.done}
                  {a.score !== null && !a.replaced && ` · ${formatScore(a.score)}`}
                </p>
                <Link href={href} className="inline-flex min-h-11 items-center underline" aria-label={`Lihat jawaban ${who}`}>
                  Lihat jawaban
                </Link>
                {a.pendingEssays > 0 && !a.replaced && (
                  <Link href={href} className="inline-flex min-h-11 items-center underline" aria-label={`Nilai uraian ${who}`}>
                    Nilai uraian
                  </Link>
                )}
                {!a.replaced && <ReplaceButton attemptId={a.attemptId} student={row.name} attemptNumber={a.attemptNumber} />}
              </li>
            );
          })}
        </ul>
      )}
    </details>
  );
}

export function MonitorList({ recap, quizId, classFilter }: { recap: QuizRecap; quizId: string; classFilter?: string }) {
  const { quiz } = recap;
  const chosen = quiz.classes.find((c) => c.id === classFilter);
  const rows = chosen ? recap.rows.filter((r) => r.className === chosen.name) : recap.rows;
  const now = new Date();
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-wrap gap-2" aria-label="Ringkasan status siswa">
        {(Object.keys(STATE) as RecapState[]).map((st) => {
          const n = rows.filter((r) => r.state === st).length;
          // A zero count is not news; a yellow "0" only draws the eye for nothing.
          return n > 0 && (
            <li key={st}>
              <Status tone={STATE[st].tone}>{STATE[st].label}: {n}</Status>
            </li>
          );
        })}
      </ul>
      {quiz.classes.length > 1 && (
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="f-kelas">Kelas</Label>
            <select id="f-kelas" name="kelas" defaultValue={chosen?.id ?? ""} className={selectClass}>
              <option value="">Semua kelas</option>
              {quiz.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Button type="submit" size="sm">Tampilkan</Button>
        </form>
      )}
      {rows.length === 0 ? (
        <p className="text-muted-foreground">Belum ada siswa di kelas ini. Tambahkan siswa di halaman Siswa.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.studentId} className="rounded-lg border p-3">
              <div className="grid gap-3 md:grid-cols-5 md:items-center">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-sm text-muted-foreground">{r.className}{r.nis && ` · NIS ${r.nis}`}</p>
                </div>
                <div><StateStatus row={r} now={now} /></div>
                <p>Percobaan {r.attemptsUsed}/{quiz.maxAttempts}</p>
                <Scores row={r} quiz={quiz} />
                <div><Tuntas row={r} kkm={quiz.kkm} /></div>
              </div>
              <Attempts row={r} quizId={quizId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
