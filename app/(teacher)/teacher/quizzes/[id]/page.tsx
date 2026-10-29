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
import { listQuizAttempts } from "@/lib/attempts";
import { formatScore, formatWita, toWitaInput } from "@/lib/format";
import { listQuestions } from "@/lib/questions";
import { getQuizForTeacher } from "@/lib/quizzes";
import { getQuizRecap } from "@/lib/results";
import { listChapterOptions } from "@/lib/subjects";
import { DIFFICULTY_LABEL, TYPE_LABEL } from "../../questions/labels";
import { AttemptsTable } from "./attempts-table";
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
  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{quiz.title}</h1>
        <Status tone={STATUS_TONE[quiz.status]}>{STATUS_LABEL[quiz.status]}</Status>
        <Badge variant="outline">{quiz.subjectName}</Badge>
      </div>

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

      <section aria-labelledby="terbit" className="flex flex-col gap-3">
        <h2 id="terbit" className="text-xl font-semibold">{published ? "Status terbit" : "Terbitkan"}</h2>
        <PublishControls id={id} published={published} />
      </section>

      {published && (
        <section aria-labelledby="pemantauan" data-slot="pemantauan" className="flex flex-col gap-3">
          <h2 id="pemantauan" className="text-xl font-semibold">Pemantauan</h2>
          <Monitor quizId={id} />
        </section>
      )}

      {published && (
        <section aria-labelledby="hasil" className="flex flex-col gap-3">
          <h2 id="hasil" className="text-xl font-semibold">Hasil</h2>
          <Results quizId={id} endsAt={quiz.endsAt} />
        </section>
      )}
    </section>
  );
}

const ATTEMPT_LABEL = { running: "Sedang dikerjakan", done: "Terkumpul", timeout: "Waktu habis", replaced: "Diganti" };

// Fresh read each render: listQuizAttempts finalizes expired attempts before listing.
async function Monitor({ quizId }: { quizId: string }) {
  const rows = (await listQuizAttempts(quizId)).map((r) => ({
    attemptId: r.attemptId, studentName: r.studentName, className: r.className, attemptNumber: r.attemptNumber,
    replaced: r.replaced,
    status: r.replaced ? ATTEMPT_LABEL.replaced
      : r.status === "IN_PROGRESS" ? ATTEMPT_LABEL.running
      : r.submitReason === "TIMEOUT" ? ATTEMPT_LABEL.timeout : ATTEMPT_LABEL.done,
    startedAt: formatWita(r.startedAt), submittedAt: r.submittedAt ? formatWita(r.submittedAt) : "",
    score: r.score === null || r.replaced ? ""
      : r.pendingEssays > 0 ? `Sementara ${formatScore(r.score)}: ${r.pendingEssays} uraian belum dinilai`
      : formatScore(r.score),
    href: `/teacher/quizzes/${quizId}/attempts/${r.attemptId}`,
  }));
  return <AttemptsTable rows={rows} />;
}

// Not final yet → every score says so, not only the recap column (PRD §7.9).
const shown = (n: number | null, final: boolean) => (n === null ? "-" : `${final ? "" : "Sementara "}${formatScore(n)}`);

// Same rows as the "Rekap Nilai" sheet, so the app and the Excel file always agree.
async function Results({ quizId, endsAt }: { quizId: string; endsAt: Date | null }) {
  const recap = await getQuizRecap(quizId);
  if (!recap) return null;
  const { resultsReleasedAt, kkm } = recap.quiz;
  return (
    <>
      <p>
        {resultsReleasedAt ? `Dirilis ${formatWita(resultsReleasedAt)}.` : "Belum dirilis. Siswa belum bisa melihat nilai."}
      </p>
      <div className="flex flex-wrap gap-3">
        <ResultsControls id={quizId} released={!!resultsReleasedAt} open={!endsAt || endsAt > new Date()} />
        <a href={`/api/exports/${quizId}`} download className={buttonVariants({ variant: "outline", className: "h-11" })}>
          Unduh Excel
        </a>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Rekap nilai per siswa</caption>
          <thead>
            <tr className="border-b">
              {["Siswa", "Kelas", "Percobaan", "Nilai utama", "Tertinggi asli", "Nilai rekap", "Ketuntasan", "Status"].map((h) => (
                <th key={h} scope="col" className="p-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recap.rows.map((r) => (
              <tr key={r.studentId} className="border-b">
                <th scope="row" className="p-2 font-medium">{r.name}</th>
                <td className="p-2">{r.className}</td>
                <td className="p-2">{r.attemptsUsed}</td>
                <td className="p-2">{shown(r.recap.primary, r.recap.final)}</td>
                <td className="p-2">{shown(r.recap.highest, r.recap.final)}</td>
                <td className="p-2">{shown(r.recap.recap, r.recap.final)}</td>
                <td className="p-2">
                  {kkm === null || r.recap.passed === null || !r.recap.final ? "-" : r.recap.passed ? "Tuntas" : "Belum tuntas"}
                </td>
                <td className="p-2">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
