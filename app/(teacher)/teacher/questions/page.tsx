import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BookOpen01Icon, CheckmarkCircle02Icon, FilterIcon, LibraryIcon, Note01Icon, PencilEdit01Icon, ViewIcon,
  FileEditIcon,
} from "@hugeicons/core-free-icons";
import { StatCard } from "@/components/stat-card";
import { formatWita } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { requireTeacher } from "@/lib/auth/guard";
import type { Difficulty, QuestionStatus, QuestionType } from "@/lib/generated/prisma/enums";
import { countQuestionsByStatus, countQuestionsByType, listQuestions, type QuestionRow } from "@/lib/questions";
import { getSubjectTree, listChapterOptions } from "@/lib/subjects";
import { DIFFICULTY_LABEL, STATUS_LABEL, STATUS_TONE, TYPE_LABEL } from "./labels";

export const metadata: Metadata = { title: "Bank soal" };

const selectClass =
  "h-12 w-full rounded-xl border-2 border-input bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring";

export default function QuestionsPage({ searchParams }: PageProps<"/teacher/questions">) {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Bank soal"
        description="Kumpulan soal untuk latihan dan ulangan."
        actions={
          <Link href="/teacher/questions/new" className={buttonVariants()}>
            Soal baru
          </Link>
        }
      />
      <Suspense fallback={<p className="text-base">Memuat…</p>}>
        <List searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

const one = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);
const known = <T extends string>(label: Record<string, string>, v: string | undefined) =>
  v && Object.hasOwn(label, v) ? (v as T) : undefined;
// Plain-text teaser: drop image codes and Markdown punctuation, then cut to 120 characters.
const snippet = (s: string) => {
  const t = s.replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/[*_`#>[\]|]/g, "").replace(/\s+/g, " ").trim();
  return t.length > 120 ? `${t.slice(0, 120)}…` : t;
};

async function List({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireTeacher();
  const sp = await searchParams;
  const subjectId = one(sp.subjectId);
  const chapterId = one(sp.chapterId);
  const subchapterId = one(sp.subchapterId);
  const type = known<QuestionType>(TYPE_LABEL, one(sp.type));
  const difficulty = known<Difficulty>(DIFFICULTY_LABEL, one(sp.difficulty));
  const status = known<QuestionStatus>(STATUS_LABEL, one(sp.status));
  const q = one(sp.q);
  const page = Math.max(1, Math.trunc(Number(one(sp.page))) || 1);
  const [{ rows, hasNext }, subjects, chapters, byStatus, byType] = await Promise.all([
    listQuestions({ subjectId, chapterId, subchapterId, type, difficulty, status, q, page }),
    getSubjectTree(),
    listChapterOptions(),
    countQuestionsByStatus(),
    countQuestionsByType(),
  ]);
  const total = byStatus.ACTIVE + byStatus.DRAFT;
  const filtered = !!(subjectId || chapterId || subchapterId || type || difficulty || status || q);
  const pageHref = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, val] of Object.entries({ subjectId, chapterId, subchapterId, type, difficulty, status, q })) {
      if (val) u.set(k, val);
    }
    u.set("page", String(p));
    return `/teacher/questions?${u}`;
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
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total soal" value={total} hint="Semua mapel" icon={LibraryIcon} tone="primary" />
        <StatCard label="Aktif" value={byStatus.ACTIVE} hint="Siap dipakai ulangan" icon={CheckmarkCircle02Icon} tone="success" />
        <StatCard label="Draf" value={byStatus.DRAFT} hint="Belum diaktifkan" icon={FileEditIcon} tone="warning" />
        <StatCard label="Uraian" value={byType.ESSAY} hint="Dinilai guru" icon={Note01Icon} tone="info" />
      </div>
      <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
      <div className="flex min-w-0 flex-col gap-6">
      <Card size="sm" className="rounded-2xl shadow-card">
        <CardContent>
          <details open>
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-semibold lg:pointer-events-none">
              <HugeiconsIcon icon={FilterIcon} aria-hidden="true" className="size-5 text-primary-strong" />
              Saring soal
            </summary>
            <form method="get" className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:items-end">
              {sel("subjectId", "Mapel", "Semua mapel", subjectId,
                subjects.map((x) => <option key={x.id} value={x.id}>{x.name}</option>))}
              {sel("chapterId", "Bab", "Semua bab", chapterId,
                chapters.map((c) => <option key={c.id} value={c.id}>{c.label}</option>))}
              {sel("subchapterId", "Subbab", "Semua subbab", subchapterId,
                chapters.map((c) => (
                  <optgroup key={c.id} label={c.label}>
                    {c.subchapters.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </optgroup>
                )))}
              {sel("type", "Tipe", "Semua tipe", type, labels(TYPE_LABEL))}
              {sel("difficulty", "Kesulitan", "Semua tingkat", difficulty, labels(DIFFICULTY_LABEL))}
              {sel("status", "Status", "Semua status", status, labels(STATUS_LABEL))}
              <div className="flex flex-col gap-2">
                <Label htmlFor="f-q">Kata kunci</Label>
                <Input id="f-q" name="q" defaultValue={q ?? ""} autoComplete="off" />
              </div>
              <Button type="submit" className="sm:col-span-2 lg:col-span-3">Terapkan</Button>
            </form>
          </details>
        </CardContent>
      </Card>

      {rows.length === 0 && (
        <p className="text-base text-muted-foreground">{filtered ? "Tidak ada soal yang cocok." : "Belum ada soal. Tekan Soal baru untuk menambah."}</p>
      )}
      {rows.length > 0 && <p className="text-base text-muted-foreground">Menampilkan {rows.length} soal pada halaman {page}.</p>}
      <ul className="flex flex-col gap-4">
        {rows.map((r) => {
          const name = snippet(r.prompt) || TYPE_LABEL[r.type];
          return (
            <li key={r.id}>
              <Card className={cn("rounded-2xl shadow-card", r.status === "DRAFT" && "border-l-4 border-l-accent-decor")}>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{TYPE_LABEL[r.type]}</Badge>
                    <Badge variant="outline">{DIFFICULTY_LABEL[r.difficulty]}</Badge>
                    <span className="ml-auto"><Status tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Status></span>
                  </div>
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <HugeiconsIcon icon={BookOpen01Icon} aria-hidden="true" className="size-5 shrink-0" />
                    {r.subjectName} · {r.chapterTitle}
                  </p>
                  <p className="text-lg font-semibold">{snippet(r.prompt)}</p>
                  <KeyPreview r={r} />
                  <p className="text-base text-muted-foreground">Bobot: {r.defaultPoints} poin · Diperbarui: {formatWita(r.updatedAt)}</p>
                  <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                    <Link href={`/teacher/questions/${r.id}`} className={buttonVariants({ variant: "outline" })}>
                      <HugeiconsIcon icon={PencilEdit01Icon} aria-hidden="true" className="size-5" />
                      Ubah<span className="sr-only"> soal: {name}</span>
                    </Link>
                    <Link href={`/teacher/questions/${r.id}/preview`} className={buttonVariants({ variant: "ghost" })}>
                      <HugeiconsIcon icon={ViewIcon} aria-hidden="true" className="size-5" />
                      Pratinjau<span className="sr-only"> soal: {name}</span>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
      {(page > 1 || hasNext) && (
        <nav aria-label="Halaman" className="flex flex-wrap gap-3">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className={buttonVariants({ variant: "ghost" })}>Sebelumnya</Link>
          )}
          {hasNext && (
            <Link href={pageHref(page + 1)} className={buttonVariants({ variant: "ghost" })}>Berikutnya</Link>
          )}
        </nav>
      )}
      </div>
      <aside className="flex flex-col gap-6">
        <Card className="rounded-2xl shadow-card">
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Sebaran tipe soal</h2>
            <ul className="flex flex-col gap-2">
              {Object.entries(TYPE_LABEL).map(([k, l]) => (
                <li key={k} className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-secondary px-3">
                  <span>{l}</span>
                  <span className="font-mono font-bold">{byType[k as QuestionType]}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-card">
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Kaidah penulisan soal</h2>
            <ul className="flex list-disc flex-col gap-2 pl-5">
              <li>Satu soal menguji satu gagasan.</li>
              <li>Pakai bahasa yang mudah dipahami siswa kelas VI.</li>
              <li>Hindari pertanyaan negatif ganda.</li>
              <li>Pastikan hanya ada satu kunci yang pasti benar.</li>
            </ul>
          </CardContent>
        </Card>
      </aside>
      </div>
    </>
  );
}

function Key() {
  return (
    <span className="ml-auto inline-flex items-center gap-1 text-sm font-bold text-success">
      <HugeiconsIcon icon={CheckmarkCircle02Icon} aria-hidden="true" className="size-5" />
      Kunci jawaban
    </span>
  );
}

function KeyPreview({ r }: { r: QuestionRow }) {
  const k = r.answerKey;
  const box = (right: boolean) =>
    cn("flex min-h-11 items-center gap-3 rounded-xl border-2 px-3 py-2", right ? "border-success bg-success-soft" : "border-border bg-secondary");
  if (r.options && (r.type === "SINGLE_CHOICE" || r.type === "MULTIPLE_SELECT")) {
    const keys = r.type === "SINGLE_CHOICE" ? [k.optionId as string] : (k.optionIds as string[]);
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {r.options.map((o) => (
          <div key={o.id} className={box(keys.includes(o.id))}>
            <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card font-bold">{o.id.toUpperCase()}</span>
            <span className="min-w-0 break-words">{snippet(o.text)}</span>
            {keys.includes(o.id) && <Key />}
          </div>
        ))}
      </div>
    );
  }
  if (r.type === "TRUE_FALSE") {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[[true, "Benar"], [false, "Salah"]].map(([v, l]) => (
          <div key={String(v)} className={box(k.value === v)}>
            <span className="font-bold">{l as string}</span>
            {k.value === v && <Key />}
          </div>
        ))}
      </div>
    );
  }
  if (r.type === "SHORT_ANSWER") {
    return (
      <div className={box(true)}>
        <span>Jawaban diterima: <b>{(k.accepted as string[]).join(" / ")}</b></span>
      </div>
    );
  }
  return typeof k.rubric === "string" && k.rubric ? (
    <div className="rounded-xl border-2 border-border bg-secondary px-3 py-2">
      <b>Rubrik:</b> {snippet(k.rubric)}
    </div>
  ) : null;
}
