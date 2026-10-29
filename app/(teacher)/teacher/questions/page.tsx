import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireTeacher } from "@/lib/auth/guard";
import type { Difficulty, QuestionStatus, QuestionType } from "@/lib/generated/prisma/enums";
import { listQuestions } from "@/lib/questions";
import { getSubjectTree, listChapterOptions } from "@/lib/subjects";
import { DIFFICULTY_LABEL, STATUS_LABEL, STATUS_TONE, TYPE_LABEL } from "./labels";

export const metadata: Metadata = { title: "Bank soal" };

const selectClass =
  "h-12 w-full rounded-xl border-2 border-input bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30";

export default function QuestionsPage({ searchParams }: PageProps<"/teacher/questions">) {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Evaluasi pembelajaran"
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
  const [{ rows, hasNext }, subjects, chapters] = await Promise.all([
    listQuestions({ subjectId, chapterId, subchapterId, type, difficulty, status, q, page }),
    getSubjectTree(),
    listChapterOptions(),
  ]);
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
      <Card size="sm" className="text-base!">
        <CardContent>
          <details open={filtered}>
            <summary className="flex min-h-11 cursor-pointer items-center font-semibold">Saring soal</summary>
            <form method="get" className="mt-3 grid gap-3 sm:grid-cols-3 sm:items-end">
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
              <Button type="submit">Terapkan</Button>
            </form>
          </details>
        </CardContent>
      </Card>

      {rows.length === 0 && (
        <p className="text-base text-muted-foreground">{filtered ? "Tidak ada soal yang cocok." : "Belum ada soal. Tekan Soal baru untuk menambah."}</p>
      )}
      <ul className="flex flex-col gap-4">
        {rows.map((r) => {
          const name = snippet(r.prompt) || TYPE_LABEL[r.type];
          return (
            <li key={r.id}>
              <Card className="text-base!">
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-base!">{TYPE_LABEL[r.type]}</Badge>
                    <Badge variant="outline" className="text-base!">{DIFFICULTY_LABEL[r.difficulty]}</Badge>
                    <Status tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Status>
                  </div>
                  <p className="text-lg font-semibold">{snippet(r.prompt)}</p>
                  <p className="text-muted-foreground">{r.subjectName} · {r.chapterTitle}</p>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/teacher/questions/${r.id}`} className={buttonVariants({ variant: "outline" })}>
                      Ubah<span className="sr-only"> soal: {name}</span>
                    </Link>
                    <Link href={`/teacher/questions/${r.id}/preview`} className={buttonVariants({ variant: "ghost" })}>
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
    </>
  );
}
