import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  AnalyticsUpIcon, CheckmarkBadge01Icon, Edit02Icon, HourglassIcon, ListViewIcon, Medal01Icon, PlayCircleIcon,
  SlidersHorizontalIcon, Table01Icon, Task01Icon, Timer01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { requireTeacher } from "@/lib/auth/guard";
import { listClasses } from "@/lib/classes";
import type { Difficulty, QuestionType } from "@/lib/generated/prisma/enums";
import { formatWita, toWitaInput } from "@/lib/format";
import { listQuestions } from "@/lib/questions";
import { getQuizForTeacher } from "@/lib/quizzes";
import { getQuizRecap, type QuizRecap, type RecapState } from "@/lib/results";
import { listChapterOptions } from "@/lib/subjects";
import { DIFFICULTY_LABEL, TYPE_LABEL } from "../../questions/labels";
import { AutoRefresh } from "./auto-refresh";
import { MonitorList } from "./monitor-list";
import { TokenCard } from "./token-card";
import { POLICY_LABEL, STATUS_LABEL } from "../labels";
import { AddQuestionButton, ClassesForm, PublishControls, QuestionControls, ResultsControls, SettingsForm } from "../quiz-forms";

export const metadata: Metadata = { title: "Ulangan" };

export default function QuizPage({ params, searchParams }: PageProps<"/teacher/quizzes/[id]">) {
  return (
    <Suspense fallback={<p>Memuat…</p>}>
      <Detail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);
const known = <T extends string>(label: Record<string, string>, v: string | undefined) =>
  v && Object.hasOwn(label, v) ? (v as T) : undefined;
const snippet = (s: string) => {
  const t = s.replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/[*_`#>[\]|]/g, "").replace(/\s+/g, " ").trim();
  return t.length > 120 ? `${t.slice(0, 120)}…` : t;
};
const selectClass =
  "h-12 w-full rounded-xl border-2 border-input bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring";

async function Detail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  await requireTeacher();
  const { id } = await params;
  const sp = await searchParams;
  const quiz = await getQuizForTeacher(id);
  if (!quiz) notFound();
  const published = quiz.status === "PUBLISHED";
  const classes = (await listClasses()).map(({ id, name, isActive }) => ({ id, name, isActive }));
  const total = quiz.questions.reduce((s, x) => s + x.points, 0);
  const essays = quiz.questions.filter((x) => x.type === "ESSAY").length;
  const recap = published ? await getQuizRecap(id) : null;
  const setelan = (
    <>
      <section aria-labelledby="setelan" className="flex scroll-mt-4 flex-col gap-3">
        <h2 id="setelan" className="text-xl font-semibold">Setelan</h2>
        <SettingsForm
          id={id}
          q={{
            title: quiz.title,
            instructions: quiz.instructions,
            durationMinutes: quiz.durationMinutes,
            maxAttempts: quiz.maxAttempts,
            shuffleQuestions: quiz.shuffleQuestions,
            shuffleOptions: quiz.shuffleOptions,
            showFeedbackAfterRelease: quiz.showFeedbackAfterRelease,
            scoringPolicy: quiz.scoringPolicy,
            kkm: quiz.kkm,
            status: quiz.status,
            startsAt: quiz.startsAt ? toWitaInput(quiz.startsAt) : "",
            endsAt: quiz.endsAt ? toWitaInput(quiz.endsAt) : "",
          }}
        />
      </section>

      <section aria-labelledby="kelas" className="flex flex-col gap-3">
        <h2 id="kelas" className="text-xl font-semibold">Kelas</h2>
        <ClassesForm id={id} classes={classes} selected={quiz.classIds} published={published} />
      </section>

      <section aria-labelledby="soal" className="flex scroll-mt-4 flex-col gap-3">
        <h2 id="soal" className="text-xl font-semibold">Soal</h2>
        <p className="text-muted-foreground">
          {quiz.questions.length} soal · total {total} poin · {essays} uraian
        </p>
        <ol className="flex flex-col gap-3">
          {quiz.questions.map((x, i) => (
            <li key={x.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
              <p className="font-medium">{i + 1}. {snippet(x.prompt) || TYPE_LABEL[x.type]}</p>
              <Badge variant="outline" className="self-start">{TYPE_LABEL[x.type]}</Badge>
              {published ? (
                <p>{x.points} poin</p>
              ) : (
                <QuestionControls
                  id={id} qqId={x.id} n={i + 1} prompt={snippet(x.prompt)} points={x.points}
                  isFirst={i === 0} isLast={i === quiz.questions.length - 1}
                />
              )}
            </li>
          ))}
        </ol>
        {!published && (
          <Suspense fallback={<p>Memuat…</p>}>
            <AddPanel quizId={id} subjectId={quiz.subjectId} chosen={quiz.questions.map((x) => x.questionId)} sp={sp} />
          </Suspense>
        )}
      </section>
    </>
  );
  return (
    <section className="flex flex-col gap-space-lg px-space-lg py-space-md">
      <div className="relative overflow-hidden rounded-2xl bg-surface-card p-space-xl shadow-sm">
        <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-canvas-peach-subtle opacity-60" aria-hidden="true" />
        <div className="relative z-10 flex flex-col justify-between gap-space-lg xl:flex-row xl:items-center">
          <div className="min-w-0 max-w-4xl space-y-space-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-tone-info-bg px-3 py-1 font-label-sm text-label-sm text-tone-info">{quiz.subjectName}</span>
              <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 font-label-sm text-label-sm ${published ? "bg-tone-success-bg text-tone-success" : "bg-tone-warning-bg text-tone-warning"}`}>
                <span className={`h-2 w-2 rounded-full ${published ? "bg-tone-success" : "bg-tone-warning"}`} aria-hidden="true" />
                {STATUS_LABEL[quiz.status]}
              </span>
            </div>
            <h1 className="break-words font-headline-xl text-headline-xl tracking-tight text-text-primary">{quiz.title}</h1>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 font-body-md text-on-surface-variant">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <HugeiconsIcon icon={Timer01Icon} className="size-5 text-primary-strong" aria-hidden="true" />
                <span className="font-label-md text-text-primary">{quiz.durationMinutes} Menit</span>
              </div>
              {quiz.kkm !== null && (
                <>
                  <span className="hidden text-surface-variant sm:inline" aria-hidden="true">•</span>
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <HugeiconsIcon icon={Medal01Icon} className="size-5 text-tertiary" aria-hidden="true" />
                    <span>KKM: <strong className="font-label-md text-text-primary">{quiz.kkm}</strong></span>
                  </div>
                </>
              )}
              <span className="hidden text-surface-variant sm:inline" aria-hidden="true">•</span>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <HugeiconsIcon icon={Task01Icon} className="size-5 text-brand-blue" aria-hidden="true" />
                <span>Kebijakan: <strong className="font-label-md text-text-primary">{POLICY_LABEL[quiz.scoringPolicy]}</strong></span>
              </div>
              <span className="hidden text-surface-variant sm:inline" aria-hidden="true">•</span>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span>{quiz.questions.length} Soal <strong className="text-text-primary">({quiz.questions.length - essays} PG + {essays} Uraian)</strong></span>
              </div>
            </div>
          </div>
          {published && (
            <div className="flex shrink-0 flex-wrap items-center gap-space-sm sm:flex-nowrap">
              <a href={`/api/exports/${id}`} download className="flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-canvas-peach px-space-lg font-label-md text-label-md text-on-surface shadow-sm transition-all hover:bg-canvas-peach-subtle focus-visible:ring-[3px] focus-visible:ring-ring">
                <HugeiconsIcon icon={Table01Icon} className="size-[22px] text-tone-success" aria-hidden="true" />
                Unduh Excel
              </a>
            </div>
          )}
        </div>
      </div>
      <nav aria-label="Bagian halaman" className="flex max-w-full items-center gap-2 self-start overflow-x-auto rounded-2xl bg-surface-card p-1.5 shadow-sm">
        {[...(recap ? [["#pemantauan", "Pemantauan & Nilai", AnalyticsUpIcon]] : []), [recap ? "#detail" : "#soal", "Soal & Kunci", ListViewIcon], [recap ? "#detail" : "#setelan", "Setelan", SlidersHorizontalIcon]].map(([href, label, icon], i) => (
          <a key={label as string} href={href as string}
            className={`flex min-h-12 items-center gap-2.5 whitespace-nowrap rounded-xl px-space-lg py-2.5 font-label-md text-label-md transition-all focus-visible:ring-[3px] focus-visible:ring-ring ${i === 0 ? "bg-primary-container text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-canvas-peach hover:text-text-primary"}`}>
            <HugeiconsIcon icon={icon as typeof Timer01Icon} className="size-[22px]" aria-hidden="true" />
            {label as string}
          </a>
        ))}
      </nav>

      {recap ? (
        <>
          <Summary recap={recap} />
          <NextStep id={id} recap={recap} open={!quiz.endsAt || quiz.endsAt > new Date()} />
          <TokenCard quizId={id} title={quiz.title} token={quiz.examToken} />

          <section aria-labelledby="pemantauan" data-slot="pemantauan" className="flex scroll-mt-4 flex-col gap-3">
            <h2 id="pemantauan" className="text-xl font-semibold">Pemantauan</h2>
            <AutoRefresh active={recap.rows.some((r) => r.state === "IN_PROGRESS")} renderedAt={new Date().toISOString()} />
            <MonitorList recap={recap} quizId={id} classFilter={one(sp.kelas)} />
          </section>

          <section aria-labelledby="hasil" className="flex flex-col gap-3">
            <h2 id="hasil" className="text-xl font-semibold">Hasil</h2>
            <Results quizId={id} recap={recap} open={!quiz.endsAt || quiz.endsAt > new Date()} />
          </section>

          <details id="detail" className="scroll-mt-4 flex flex-col gap-8 rounded-2xl border bg-card p-4 shadow-card">
            <summary className="flex min-h-11 cursor-pointer items-center text-lg font-semibold">Lihat setelan ulangan</summary>
            <div className="mt-3 flex flex-col gap-8">
              {setelan}
              <section aria-labelledby="terbit" className="flex flex-col gap-3">
                <h2 id="terbit" className="text-xl font-semibold">Status terbit</h2>
                <PublishControls id={id} published />
              </section>
            </div>
          </details>
        </>
      ) : (
        <>
          {setelan}
          <TokenCard quizId={id} title={quiz.title} token={quiz.examToken} />
          <section aria-labelledby="terbit" className="flex flex-col gap-3">
            <h2 id="terbit" className="text-xl font-semibold">Terbitkan</h2>
            <PublishControls id={id} published={false} />
          </section>
        </>
      )}
    </section>
  );
}

// The one thing the teacher should do next, in the order that blocks release (D7).
function NextStep({ id, recap, open }: { id: string; recap: QuizRecap; open: boolean }) {
  const count = (st: RecapState) => recap.rows.filter((r) => r.state === st).length;
  const running = count("IN_PROGRESS");
  const waiting = count("WAITING_REPLACEMENT");
  const pending = recap.rows.flatMap((r) => r.attempts.filter((a) => !a.replaced));
  const essays = pending.reduce((n, a) => n + a.pendingEssays, 0);
  const first = pending.find((a) => a.pendingEssays > 0);
  const released = !!recap.quiz.resultsReleasedAt;
  const absent = count("NOT_STARTED");
  const counted = count("FINAL") + count("NEEDS_GRADING");
  const ready = counted > 0 && (absent === 0 || !open);
  return (
    <Card aria-labelledby="langkah" role="region" className="gap-3! border-2! border-primary/40! px-(--card-spacing)">
      <h2 id="langkah" className="text-xl font-semibold">Langkah berikutnya</h2>
      {running > 0 ? (
        <p>{running} siswa sedang mengerjakan.</p>
      ) : essays > 0 && first ? (
        <Link href={`/teacher/quizzes/${id}/attempts/${first.attemptId}`} className="inline-flex min-h-11 items-center underline">
          Nilai {essays} jawaban uraian.
        </Link>
      ) : waiting > 0 ? (
        <p>{waiting} siswa belum mengerjakan percobaan pengganti.</p>
      ) : released ? (
        <p>Hasil sudah dibagikan.</p>
      ) : ready ? (
        <ResultsControls id={id} released={false} open={open} />
      ) : (
        <p>{absent} siswa belum mengerjakan.</p>
      )}
      {released && <ResultsControls id={id} released open={open} />}
    </Card>
  );
}

function Tile({ label, value, unit, hint, icon, tile, text, labelCls, box }: {
    label: string; value: number; unit: string; hint: string; icon: typeof HourglassIcon; tile: string; text: string; labelCls: string; box: string;
  }) {
  return (
    <div className={`flex flex-col justify-between rounded-2xl p-space-md shadow-sm ${tile}`}>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className={`font-label-sm text-label-sm ${labelCls}`}>{label}</span>
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${box}`}>
            <HugeiconsIcon icon={icon} className="size-[18px]" aria-hidden="true" />
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`font-headline-xl text-headline-xl ${text}`}>{value}</span>
          <span className="font-body-md text-on-surface-variant">{unit}</span>
        </div>
      </div>
      <p className="mt-2 break-words font-label-sm leading-relaxed text-on-surface-variant">{hint}</p>
    </div>
  );
}

function Summary({ recap }: { recap: QuizRecap }) {
  const n = (st: RecapState) => recap.rows.filter((r) => r.state === st).length;
  const notStarted = n("NOT_STARTED") + n("WAITING_REPLACEMENT");
  return (
    <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-4">
      <Tile label="Belum Mulai" value={notStarted} unit="siswa" hint="Belum mengerjakan" icon={HourglassIcon} tile="bg-surface-card" text="text-text-primary" labelCls="text-on-surface-variant" box="bg-surface-container-high text-on-surface-variant" />
      <Tile label="Sedang Mengerjakan" value={n("IN_PROGRESS")} unit="siswa" hint="Sesi sedang berjalan" icon={PlayCircleIcon} tile="bg-surface-card" text="text-tone-info" labelCls="font-semibold text-tone-info" box="bg-tone-info-bg text-tone-info" />
      <Tile label="Perlu Dinilai Uraian" value={n("NEEDS_GRADING")} unit="siswa" hint="Ada soal uraian butuh skor guru" icon={Edit02Icon} tile="border-2 border-primary-container/40 bg-canvas-peach-subtle" text="font-bold text-primary-strong" labelCls="font-bold text-primary-strong" box="bg-primary-container text-on-primary" />
      <Tile label="Selesai (Final)" value={n("FINAL")} unit="siswa" hint="Nilai akhir sudah dihitung" icon={CheckmarkBadge01Icon} tile="bg-surface-card" text="text-tone-success" labelCls="font-semibold text-tone-success" box="bg-tone-success-bg text-tone-success" />
    </div>
  );
}

function Results({ quizId, recap, open }: { quizId: string; recap: QuizRecap; open: boolean }) {
  const { resultsReleasedAt } = recap.quiz;
  const absent = recap.rows.filter((r) => r.state === "NOT_STARTED").length;
  const counted = recap.rows.filter((r) => r.state === "FINAL" || r.state === "NEEDS_GRADING").length;
  // Not offered in "Langkah berikutnya" yet: keep release reachable, but not as the main action.
  const early = !resultsReleasedAt && counted > 0 && absent > 0 && open;
  return (
    <Card className="gap-3! px-(--card-spacing)">
      <p>
        {resultsReleasedAt ? `Dirilis ${formatWita(resultsReleasedAt)}.` : "Belum dirilis. Siswa belum bisa melihat nilai."}
      </p>
      {early ? <ResultsControls id={quizId} released={false} open={open} primary={false} /> : null}
      <a href={`/api/exports/${quizId}`} download className={buttonVariants({ variant: "outline", className: "h-11 self-start" })}>
        Unduh Excel
      </a>
    </Card>
  );
}

async function AddPanel({
  quizId, subjectId, chosen, sp,
}: { quizId: string; subjectId: string; chosen: string[]; sp: SP }) {
  const chapterId = one(sp.chapterId);
  const type = known<QuestionType>(TYPE_LABEL, one(sp.type));
  const difficulty = known<Difficulty>(DIFFICULTY_LABEL, one(sp.difficulty));
  const page = Math.max(1, Math.trunc(Number(one(sp.page))) || 1);
  const [{ rows, hasNext }, chapters] = await Promise.all([
    listQuestions({ subjectId, chapterId, type, difficulty, status: "ACTIVE", page }),
    listChapterOptions(),
  ]);
  const pageHref = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ chapterId, type, difficulty })) if (v) u.set(k, v);
    u.set("page", String(p));
    return `/teacher/quizzes/${quizId}?${u}#tambah`;
  };
  const sel = (name: string, label: string, all: string, current: string | undefined, children: React.ReactNode) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`f-${name}`}>{label}</Label>
      <select id={`f-${name}`} name={name} defaultValue={current ?? ""} className={selectClass}>
        <option value="">{all}</option>
        {children}
      </select>
    </div>
  );
  const labels = (m: Record<string, string>) =>
    Object.entries(m).map(([k, l]) => <option key={k} value={k}>{l}</option>);
  return (
    <div id="tambah" className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold">Tambah soal dari bank</h3>
      <form method="get" action={`/teacher/quizzes/${quizId}`} className="grid gap-3 sm:grid-cols-3 sm:items-end">
        {sel("chapterId", "Bab", "Semua bab", chapterId,
          chapters.map((c) => <option key={c.id} value={c.id}>{c.label}</option>))}
        {sel("type", "Tipe", "Semua tipe", type, labels(TYPE_LABEL))}
        {sel("difficulty", "Kesulitan", "Semua tingkat", difficulty, labels(DIFFICULTY_LABEL))}
        <Button type="submit" className="h-11 text-base">Terapkan</Button>
      </form>
      {rows.length === 0 && <p className="text-muted-foreground">Tidak ada soal aktif yang cocok.</p>}
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
            <p className="font-medium">{snippet(r.prompt) || TYPE_LABEL[r.type]}</p>
            <p className="text-muted-foreground">
              {TYPE_LABEL[r.type]} · {DIFFICULTY_LABEL[r.difficulty]} · {r.chapterTitle} · {r.defaultPoints} poin
            </p>
            {chosen.includes(r.id) ? (
              <p>Sudah dipilih</p>
            ) : (
              <AddQuestionButton id={quizId} questionId={r.id} label={snippet(r.prompt) || TYPE_LABEL[r.type]} />
            )}
          </li>
        ))}
      </ul>
      {(page > 1 || hasNext) && (
        <nav aria-label="Halaman" className="flex gap-4">
          {page > 1 && <Link href={pageHref(page - 1)} className="inline-flex min-h-11 items-center underline">Sebelumnya</Link>}
          {hasNext && <Link href={pageHref(page + 1)} className="inline-flex min-h-11 items-center underline">Berikutnya</Link>}
        </nav>
      )}
    </div>
  );
}
