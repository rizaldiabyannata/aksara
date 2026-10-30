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
const CHIP: Record<StatusTone, string> = {
  neutral: "bg-surface-container-high text-text-muted",
  info: "bg-tone-info-bg text-tone-info",
  warning: "bg-tone-warning-bg font-semibold text-tone-warning",
  success: "bg-tone-success-bg text-tone-success",
  danger: "bg-tone-danger-bg text-tone-danger",
};
const ATTEMPT_LABEL = { running: "Sedang dikerjakan", done: "Terkumpul", replaced: "Diganti" };
const selectClass =
  "h-12 w-full rounded-xl border-2 border-input bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring";

function StateStatus({ row, now }: { row: RecapRow; now: Date }) {
  const { tone, label } = STATE[row.state];
  const run = row.running;
  const chip = `inline-flex items-center gap-1.5 whitespace-normal rounded-full px-3 py-1 font-label-sm text-label-sm ${CHIP[tone]}`;
  if (!run) return <span className={chip}>{label}</span>;
  // Inside the 60 s network grace the deadline is already past: say so instead of a negative time.
  const end = run.deadlineAt > now ? `selesai pukul ${formatWitaTime(run.deadlineAt)}` : "waktu habis";
  return <span className={chip}>{label} · {end}</span>;
}

function Tuntas({ row, kkm }: { row: RecapRow; kkm: number | null }) {
  // A provisional score (ungraded essays) must not claim passed or not.
  if (kkm === null) return <span aria-label="Tidak ada KKM">—</span>;
  if (row.recap.passed === null || !row.recap.final) return <p className="text-muted-foreground">Ketuntasan belum ada</p>;
  return row.recap.passed ? <Status tone="success">Tuntas</Status> : <Status tone="warning">Belum tuntas</Status>;
}

function Attempts({ row, quizId, released }: { row: RecapRow; quizId: string; released: boolean }) {
  return (
    <details className="mt-3">
      <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-primary-strong underline">Lihat percobaan</summary>
      {row.attempts.length === 0 ? (
        <p className="py-2 text-muted-foreground">{row.name} belum mengerjakan.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-3">
          {row.attempts.map((a) => {
            const href = `/teacher/quizzes/${quizId}/attempts/${a.attemptId}`;
            const who = `${row.name}, percobaan ${a.attemptNumber}`;
            return (
              <li key={a.attemptId} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-muted/40 p-3">
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
                {!a.replaced && !released && <ReplaceButton attemptId={a.attemptId} student={row.name} attemptNumber={a.attemptNumber} />}
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
        <p className="font-body-md text-body-md text-text-muted">Belum ada siswa di kelas ini. Tambahkan siswa di halaman Siswa.</p>
      ) : (
        <div className="flex min-w-0 flex-col gap-space-md">
          {rows.map((r) => {
            const run = r.running;
            const pct = run ? Math.round((run.answered / Math.max(1, run.total)) * 100) : 0;
            const { recap, final } = r.recap;
            const initials = r.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
            return (
              <div
                key={r.studentId}
                className={`flex min-w-0 flex-col gap-space-md rounded-2xl bg-surface-card p-space-lg shadow-sm transition-all hover:shadow-md ${r.state === "NEEDS_GRADING" ? "border-l-4 border-l-primary-container" : ""}`}
              >
                <div className="flex flex-col justify-between gap-space-md sm:flex-row sm:items-start">
                  <div className="flex min-w-0 flex-1 items-start gap-space-md">
                    <div aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-canvas-peach-subtle font-headline-md font-bold text-primary-strong">{initials}</div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-headline-sm text-headline-sm text-text-primary">{r.name}</h3>
                        {r.nis && <span className="whitespace-nowrap rounded-md bg-canvas-peach px-2.5 py-0.5 font-code-mono text-label-sm text-on-surface-variant">NIS {r.nis}</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <StateStatus row={r} now={now} />
                        <span className="whitespace-nowrap text-label-sm text-on-surface-variant">• {r.className}</span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 rounded-xl bg-canvas-peach/60 p-2.5 sm:bg-transparent sm:p-0 sm:text-right">
                    {run ? (
                      <>
                        <span className="block font-headline-md font-bold leading-none text-primary-strong">{run.answered} / {run.total}</span>
                        <span className="mt-1 block text-label-sm text-on-surface-variant">Soal Terjawab</span>
                      </>
                    ) : recap === null ? (
                      <span className="block text-label-sm text-on-surface-variant">Belum ada nilai</span>
                    ) : (
                      <>
                        <span className="block font-headline-md font-bold leading-none text-primary-strong">{formatScore(recap)}</span>
                        <span className="mt-1 block text-label-sm text-on-surface-variant">{final ? "Nilai Akhir" : "Nilai Sementara"}</span>
                        {quiz.scoringPolicy === "REMEDIAL" && r.recap.highest !== null && r.recap.highest > recap && (
                          <span className="block text-label-sm text-on-surface-variant">Nilai asli {formatScore(r.recap.highest)}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {run && (
                  <div className="space-y-2 pt-1">
                    <div className="h-3 w-full overflow-hidden rounded-full bg-canvas-peach" aria-hidden="true">
                      <div className="h-full rounded-full bg-primary-container transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-label-sm font-medium text-on-surface-variant">Progress: {pct}% ({run.answered} dari {run.total} soal)</span>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-space-md border-t border-border-subtle/50 pt-2">
                  <span className="flex items-center gap-1.5 text-label-sm text-on-surface-variant">
                    Percobaan {r.attemptsUsed}/{quiz.maxAttempts}
                  </span>
                  <Tuntas row={r} kkm={quiz.kkm} />
                </div>
                <Attempts row={r} quizId={quizId} released={!!quiz.resultsReleasedAt} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
