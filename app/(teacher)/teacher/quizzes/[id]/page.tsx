import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Status } from "@/components/status";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { STATUS_LABEL, STATUS_TONE } from "../labels";
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
  "h-12 w-full rounded-lg border-2 border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring";

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
      <section aria-labelledby="setelan" className="flex flex-col gap-3">
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

      <section aria-labelledby="soal" className="flex flex-col gap-3">
        <h2 id="soal" className="text-xl font-semibold">Soal</h2>
        <p className="text-sm text-muted-foreground">
          {quiz.questions.length} soal · total {total} poin · {essays} uraian
        </p>
        <ol className="flex flex-col gap-3">
          {quiz.questions.map((x, i) => (
            <li key={x.id} className="flex flex-col gap-3 rounded-lg border p-3">
              <p className="font-medium">{i + 1}. {snippet(x.prompt) || TYPE_LABEL[x.type]}</p>
              <Badge variant="outline" className="self-start">{TYPE_LABEL[x.type]}</Badge>
              {published ? (
                <p className="text-sm">{x.points} poin</p>
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
    <section className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{quiz.title}</h1>
        <Status tone={STATUS_TONE[quiz.status]}>{STATUS_LABEL[quiz.status]}</Status>
        <Badge variant="outline">{quiz.subjectName}</Badge>
      </div>

      {recap ? (
        <>
          <NextStep id={id} recap={recap} open={!quiz.endsAt || quiz.endsAt > new Date()} />

          <section aria-labelledby="pemantauan" data-slot="pemantauan" className="flex flex-col gap-3">
            <h2 id="pemantauan" className="text-xl font-semibold">Pemantauan</h2>
            <AutoRefresh active={recap.rows.some((r) => r.state === "IN_PROGRESS")} renderedAt={new Date().toISOString()} />
            <MonitorList recap={recap} quizId={id} classFilter={one(sp.kelas)} />
          </section>

          <section aria-labelledby="hasil" className="flex flex-col gap-3">
            <h2 id="hasil" className="text-xl font-semibold">Hasil</h2>
            <Results quizId={id} recap={recap} open={!quiz.endsAt || quiz.endsAt > new Date()} />
          </section>

          <details className="flex flex-col gap-8 rounded-lg border p-3">
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
    <section aria-labelledby="langkah" className="flex flex-col gap-3 rounded-lg border-2 p-4">
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
    </section>
  );
}

function Results({ quizId, recap, open }: { quizId: string; recap: QuizRecap; open: boolean }) {
  const { resultsReleasedAt } = recap.quiz;
  const absent = recap.rows.filter((r) => r.state === "NOT_STARTED").length;
  const counted = recap.rows.filter((r) => r.state === "FINAL" || r.state === "NEEDS_GRADING").length;
  // Not offered in "Langkah berikutnya" yet: keep release reachable, but not as the main action.
  const early = !resultsReleasedAt && counted > 0 && absent > 0 && open;
  return (
    <>
      <p>
        {resultsReleasedAt ? `Dirilis ${formatWita(resultsReleasedAt)}.` : "Belum dirilis. Siswa belum bisa melihat nilai."}
      </p>
      {early ? <ResultsControls id={quizId} released={false} open={open} primary={false} /> : null}
      <a href={`/api/exports/${quizId}`} download className={buttonVariants({ variant: "outline", className: "h-11 self-start" })}>
        Unduh Excel
      </a>
    </>
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
          <li key={r.id} className="flex flex-col gap-2 rounded-lg border p-3">
            <p className="font-medium">{snippet(r.prompt) || TYPE_LABEL[r.type]}</p>
            <p className="text-sm text-muted-foreground">
              {TYPE_LABEL[r.type]} · {DIFFICULTY_LABEL[r.difficulty]} · {r.chapterTitle} · {r.defaultPoints} poin
            </p>
            {chosen.includes(r.id) ? (
              <p className="text-sm">Sudah dipilih</p>
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
