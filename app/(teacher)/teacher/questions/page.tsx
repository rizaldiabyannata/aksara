import type { Metadata } from "next";
import Link from "next/link";
import { GuidePanel } from "@/components/guide-panel";
import { Suspense } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Alert02Icon, ArrowDown01Icon, ArrowLeft01Icon, ArrowRight01Icon, BookOpen01Icon, CancelCircleIcon, GridTableIcon,
  CheckListIcon, CheckmarkBadge01Icon, CheckmarkCircle02Icon, ChartIncreaseIcon, Clock01Icon, Edit02Icon,
  FileEditIcon, FilterIcon, LibraryIcon, Menu01Icon, Note01Icon, PlusSignCircleIcon, RadioButtonIcon,
  RefreshIcon, Search01Icon, SmileIcon, TaskDone01Icon, UnfoldMoreIcon, ViewIcon,
} from "@hugeicons/core-free-icons";
import { requireTeacher } from "@/lib/auth/guard";
import { formatWita } from "@/lib/format";
import type { Difficulty, QuestionStatus, QuestionType } from "@/lib/generated/prisma/enums";
import { categoryLabelsOf, countFilteredQuestions, countQuestionsByStatus, countQuestionsByType, listQuestions, type QuestionRow } from "@/lib/questions";
import { getSubjectTree, listChapterOptions } from "@/lib/subjects";
import { cn } from "@/lib/utils";
import { DIFFICULTY_LABEL, STATUS_LABEL, TYPE_LABEL } from "./labels";

import { BulkQuestionProvider, QuestionSelectionCheckbox } from "./bulk-selection";

export const metadata: Metadata = { title: "Bank soal" };

type TypeStyle = { icon: IconSvgElement; chip: string; dot: string; book: string; sub: string };
const TYPE_STYLE: Record<QuestionType, TypeStyle> = {
  SINGLE_CHOICE: { icon: RadioButtonIcon, chip: "bg-tone-info-bg text-brand-blue", dot: "bg-brand-blue", book: "text-primary-strong", sub: "1 jawaban benar" },
  ESSAY: { icon: Note01Icon, chip: "bg-primary-fixed text-primary-strong font-bold", dot: "bg-primary-container", book: "text-primary-strong", sub: "Dinilai guru" },
  MULTIPLE_SELECT: { icon: CheckListIcon, chip: "bg-surface-container-highest text-on-surface-variant", dot: "bg-secondary-container", book: "text-primary-strong", sub: "Lebih dari satu jawaban" },
  TRUE_FALSE: { icon: TaskDone01Icon, chip: "bg-canvas-peach text-tertiary", dot: "bg-tertiary", book: "text-tertiary", sub: "Benar atau salah" },
  SHORT_ANSWER: { icon: Menu01Icon, chip: "bg-tone-success-bg text-tone-success", dot: "bg-tone-success", book: "text-primary-strong", sub: "Kata atau angka" },
  CATEGORY: { icon: GridTableIcon, chip: "bg-tone-info-bg text-brand-blue", dot: "bg-brand-blue", book: "text-primary-strong", sub: "Benar/salah per pernyataan" },
};
const DIFF_STYLE: Record<Difficulty, { icon: IconSvgElement; chip: string }> = {
  EASY: { icon: SmileIcon, chip: "bg-tone-success-bg text-tone-success" },
  MEDIUM: { icon: ChartIncreaseIcon, chip: "bg-tone-warning-bg text-tone-warning" },
  HARD: { icon: Alert02Icon, chip: "bg-tone-danger-bg text-tone-danger" },
};
const ORDER: QuestionType[] = ["SINGLE_CHOICE", "ESSAY", "MULTIPLE_SELECT", "CATEGORY", "TRUE_FALSE", "SHORT_ANSWER"];

const selectClass =
  "w-full min-h-12 px-3 py-2 rounded-xl bg-canvas-peach text-on-surface font-label-sm text-label-sm outline-none appearance-none cursor-pointer focus-visible:ring-[3px] focus-visible:ring-ring";
const cardShadow = "shadow-[0_2px_16px_rgba(230,115,60,0.04)]";

export default function QuestionsPage({ searchParams }: PageProps<"/teacher/questions">) {
  return (
    <section className="flex flex-col w-full gap-space-xl px-space-xl py-space-xl bg-surface min-h-screen">
      <div className="relative rounded-3xl bg-surface-container-lowest p-space-xl shadow-[0_4px_24px_rgba(230,115,60,0.06)]">
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-primary-fixed/30 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg">
          <div className="flex flex-col max-w-2xl">
            <div className="inline-flex items-center gap-2 self-start px-space-md py-1 rounded-full bg-canvas-peach text-primary-strong mb-3">
              <HugeiconsIcon icon={CheckmarkBadge01Icon} className="size-4" aria-hidden="true" />
              <span className="font-label-sm text-label-sm tracking-wide uppercase">Evaluasi Pembelajaran &amp; Asesmen</span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-text-primary tracking-tight">Bank soal</h1>
            <p className="mt-2 font-body-lg text-body-lg text-text-muted leading-relaxed">
              Kumpulan soal untuk latihan dan ulangan. Tersedia 6 tipe soal dengan kunci jawaban yang hanya terlihat oleh guru.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
          <Link href="/teacher/quizzes/import" className="flex min-h-12 items-center rounded-xl border bg-card px-4 font-semibold focus-visible:ring-[3px] focus-visible:ring-ring">Impor dari Excel</Link>
          <details className="relative shrink-0 group">
            <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer min-h-12 px-space-lg py-3 rounded-xl bg-primary text-primary-foreground font-label-lg text-label-lg font-bold shadow-[0_6px_20px_rgba(255,112,52,0.28)] hover:brightness-105 active:scale-95 transition-all flex items-center gap-3 focus-visible:ring-[3px] focus-visible:ring-ring">
              <HugeiconsIcon icon={PlusSignCircleIcon} className="size-6" aria-hidden="true" />
              <span>Soal baru</span>
              <HugeiconsIcon icon={ArrowDown01Icon} className="size-[18px]" aria-hidden="true" />
            </summary>
            <div className="absolute right-0 top-14 mt-2 w-72 bg-surface-container-lowest rounded-2xl shadow-[0_16px_36px_rgba(40,20,10,0.12)] p-2 z-30 flex flex-col gap-1">
              <div className="px-3 py-2 text-text-muted font-label-sm text-label-sm uppercase tracking-wider">Pilih Format Soal</div>
              {ORDER.map((k) => (
                <Link key={k} href={`/teacher/questions/new?type=${k}`} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-canvas-peach text-on-surface flex items-center gap-3 font-label-md text-label-md transition-all focus-visible:ring-[3px] focus-visible:ring-ring">
                  <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", TYPE_STYLE[k].chip)}>
                    <HugeiconsIcon icon={TYPE_STYLE[k].icon} className="size-[18px]" aria-hidden="true" />
                  </span>
                  <span className="flex flex-col">
                    <span className="font-bold">{TYPE_LABEL[k]}</span>
                    <span className="text-xs text-text-muted">{TYPE_STYLE[k].sub}</span>
                  </span>
                </Link>
              ))}
            </div>
          </details>
          </div>
        </div>
      </div>
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
  const filter = { subjectId, chapterId, subchapterId, type, difficulty, status, q: q?.trim() || undefined };
  const [{ rows, hasNext }, subjects, chapters, byStatus, byType, matchingTotal] = await Promise.all([
    listQuestions({ ...filter, page }),
    getSubjectTree(),
    listChapterOptions(),
    countQuestionsByStatus(),
    countQuestionsByType(),
    countFilteredQuestions(filter),
  ]);
  const total = byStatus.ACTIVE + byStatus.DRAFT;
  const pct = total ? Math.round((byStatus.ACTIVE / total) * 100) : 0;
  const filtered = !!(subjectId || chapterId || subchapterId || type || difficulty || status || q);
  const pageHref = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, val] of Object.entries({ subjectId, chapterId, subchapterId, type, difficulty, status, q })) {
      if (val) u.set(k, val);
    }
    u.set("page", String(p));
    return `/teacher/questions?${u}`;
  };
  const hrefWith = (over: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, val] of Object.entries({ subjectId, chapterId, subchapterId, type, difficulty, status, q, ...over })) {
      if (val) u.set(k, val);
    }
    const t = u.toString();
    return `/teacher/questions${t ? `?${t}` : ""}`;
  };
  const sel = (name: string, label: string, all: string, current: string | undefined, children: React.ReactNode, span = "") => (
    <div className={cn("relative", span)}>
      <select aria-label={label} name={name} defaultValue={current ?? ""} className={selectClass}>
        <option value="">{all}</option>
        {children}
      </select>
      <HugeiconsIcon icon={UnfoldMoreIcon} className="pointer-events-none absolute right-3 top-3.5 size-[18px] text-text-muted" aria-hidden="true" />
    </div>
  );
  const labels = (m: Record<string, string>) =>
    Object.entries(m).map(([k, l]) => <option key={k} value={k}>{l}</option>);
  const pill = "px-3.5 py-1.5 rounded-full font-label-sm text-label-sm min-h-11 inline-flex items-center focus-visible:ring-[3px] focus-visible:ring-ring";
  const tray = "min-h-12 px-3 py-2 rounded-xl bg-surface-container-lowest hover:bg-canvas-peach font-label-sm text-label-sm flex items-center gap-1.5 transition-all focus-visible:ring-[3px] focus-visible:ring-ring";
  const stat = "bg-surface-container-lowest p-space-lg rounded-2xl shadow-[0_2px_12px_rgba(230,115,60,0.04)] flex items-center gap-4";
  return (
    <BulkQuestionProvider key={JSON.stringify(filter)} filter={filter} total={matchingTotal} pageIds={rows.map(row => row.id)} header={<>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className={stat}>
          <div className="w-14 h-14 rounded-2xl bg-canvas-peach flex items-center justify-center text-primary-strong shrink-0">
            <HugeiconsIcon icon={LibraryIcon} className="size-[30px]" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-text-muted">Total Bank Soal</span>
            <span className="font-headline-md text-headline-md text-text-primary">{total} Butir</span>
            <span className="text-xs text-text-muted mt-0.5">Seluruh mapel</span>
          </div>
        </div>
        <div className={stat}>
          <div className="w-14 h-14 rounded-2xl bg-tone-success-bg flex items-center justify-center text-tone-success shrink-0">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-[30px]" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-text-muted">Aktif &amp; Siap Ujian</span>
            <div className="flex items-center gap-2">
              <span className="font-headline-md text-headline-md text-text-primary">{byStatus.ACTIVE} Soal</span>
              <span className="px-2 py-0.5 rounded-full bg-tone-success-bg text-tone-success font-label-sm text-label-sm">{pct}%</span>
            </div>
            <span className="text-xs text-tone-success mt-0.5">Siap dipakai ulangan</span>
          </div>
        </div>
        <div className={stat}>
          <div className="w-14 h-14 rounded-2xl bg-tone-warning-bg flex items-center justify-center text-tone-warning shrink-0">
            <HugeiconsIcon icon={FileEditIcon} className="size-[30px]" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-text-muted">Draf Guru</span>
            <span className="font-headline-md text-headline-md text-text-primary">{byStatus.DRAFT} Soal</span>
            <span className="text-xs text-text-muted mt-0.5">Belum diaktifkan</span>
          </div>
        </div>
        <div className={stat}>
          <div className="w-14 h-14 rounded-2xl bg-tone-info-bg flex items-center justify-center text-tone-info shrink-0">
            <HugeiconsIcon icon={Note01Icon} className="size-[30px]" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-text-muted">Soal Uraian</span>
            <span className="font-headline-md text-headline-md text-text-primary">{byType.ESSAY} Butir</span>
            <span className="text-xs text-text-muted mt-0.5">Dinilai guru</span>
          </div>
        </div>
      </div>

      <form method="get" className={cn("bg-surface-container-lowest p-space-lg rounded-2xl flex flex-col gap-space-md", cardShadow)}>
        {status && <input type="hidden" name="status" value={status} />}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-text-primary font-label-md text-label-md">
            <HugeiconsIcon icon={FilterIcon} className="size-5 text-primary-strong" aria-hidden="true" />
            <span>Penyaring Data Bank Soal</span>
          </div>
          <span className="text-xs font-label-sm text-label-sm text-text-muted">Menampilkan {rows.length} butir (halaman {page})</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2 relative flex items-center">
            <HugeiconsIcon icon={Search01Icon} className="absolute left-3.5 size-5 text-text-muted" aria-hidden="true" />
            <input
              name="q"
              maxLength={500}
              defaultValue={q ?? ""}
              autoComplete="off"
              aria-label="Kata kunci"
              placeholder="Cari cuplikan soal atau kata kunci..."
              className="w-full min-h-12 pl-11 pr-4 rounded-xl bg-canvas-peach text-on-surface font-body-md text-body-md placeholder:text-text-muted outline-none focus:bg-surface-container-lowest shadow-sm transition-all focus-visible:ring-[3px] focus-visible:ring-ring"
            />
          </div>
          {sel("subjectId", "Mapel", "Semua Mapel", subjectId,
            subjects.map((x) => <option key={x.id} value={x.id}>{x.name}</option>))}
          {sel("chapterId", "Bab", "Semua Bab", chapterId,
            chapters.map((c) => <option key={c.id} value={c.id}>{c.label}</option>))}
          {sel("type", "Tipe", "Semua Tipe", type, labels(TYPE_LABEL))}
          {sel("difficulty", "Kesulitan", "Semua Kesulitan", difficulty, labels(DIFFICULTY_LABEL))}
          {sel("subchapterId", "Subbab", "Semua Subbab", subchapterId,
            chapters.map((c) => (
              <optgroup key={c.id} label={c.label}>
                {c.subchapters.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </optgroup>
            )), "lg:col-span-2")}
        </div>
        <div className="flex flex-wrap items-center justify-between pt-2 gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-label-sm text-label-sm text-text-muted mr-1">Status:</span>
            <Link href={hrefWith({ status: undefined })} aria-current={!status ? "true" : undefined} className={cn(pill, !status ? "bg-primary text-primary-foreground font-bold" : "bg-canvas-peach text-on-surface hover:bg-canvas-peach-subtle")}>Semua</Link>
            <Link href={hrefWith({ status: "ACTIVE" })} aria-current={status === "ACTIVE" ? "true" : undefined} className={cn(pill, status === "ACTIVE" ? "bg-primary text-primary-foreground font-bold" : "bg-canvas-peach text-on-surface hover:bg-canvas-peach-subtle")}>{STATUS_LABEL.ACTIVE} ({byStatus.ACTIVE})</Link>
            <Link href={hrefWith({ status: "DRAFT" })} aria-current={status === "DRAFT" ? "true" : undefined} className={cn(pill, status === "DRAFT" ? "bg-primary text-primary-foreground font-bold" : "bg-canvas-peach text-on-surface hover:bg-canvas-peach-subtle")}>{STATUS_LABEL.DRAFT} ({byStatus.DRAFT})</Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/teacher/questions" className="min-h-12 px-space-md py-2.5 rounded-xl bg-canvas-peach text-on-surface font-label-sm text-label-sm hover:bg-canvas-peach-subtle flex items-center gap-2 transition-all focus-visible:ring-[3px] focus-visible:ring-ring">
              <HugeiconsIcon icon={RefreshIcon} className="size-[18px]" aria-hidden="true" />
              <span>Reset Filter</span>
            </Link>
            <button type="submit" className="min-h-12 px-space-lg py-2.5 rounded-xl bg-primary text-primary-foreground font-label-sm text-label-sm font-bold hover:brightness-110 flex items-center gap-2 shadow-sm transition-all focus-visible:ring-[3px] focus-visible:ring-ring">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-[18px]" aria-hidden="true" />
              <span>Terapkan</span>
            </button>
          </div>
        </div>
      </form>
      </>}>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        <div className="lg:col-span-8 flex flex-col gap-space-md">
          {rows.length === 0 && (
            <p className="text-base text-muted-foreground">{filtered ? "Tidak ada soal yang cocok." : "Belum ada soal. Tekan Soal baru untuk menambah."}</p>
          )}
          {rows.map((r) => {
            const name = snippet(r.prompt) || TYPE_LABEL[r.type];
            const ts = TYPE_STYLE[r.type];
            const ds = DIFF_STYLE[r.difficulty];
            const draft = r.status === "DRAFT";
            return (
              <article key={r.id} className={cn("bg-surface-container-lowest rounded-2xl p-space-lg shadow-[0_3px_16px_rgba(230,115,60,0.05)] hover:shadow-[0_8px_24px_rgba(230,115,60,0.09)] transition-all", draft && "border-l-4 border-primary-container")}>
                <QuestionSelectionCheckbox id={r.id} name={name} />
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("px-3 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1.5", ts.chip)}>
                      <HugeiconsIcon icon={ts.icon} className="size-[15px]" aria-hidden="true" />
                      <span>{TYPE_LABEL[r.type]}</span>
                    </span>
                    <span className={cn("px-3 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1", ds.chip)}>
                      <HugeiconsIcon icon={ds.icon} className="size-3.5" aria-hidden="true" />
                      <span>{DIFFICULTY_LABEL[r.difficulty]}</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold">
                      Bobot: {r.defaultPoints} Poin
                    </span>
                  </div>
                  <span className={cn("inline-flex items-center gap-1 font-label-sm text-label-sm px-2.5 py-0.5 rounded-full", draft ? "text-tone-warning bg-tone-warning-bg" : "text-tone-success bg-tone-success-bg")}>
                    <span aria-hidden="true" className={cn("w-1.5 h-1.5 rounded-full", draft ? "bg-tone-warning" : "bg-tone-success")} />
                    <span>{STATUS_LABEL[r.status]}</span>
                  </span>
                </div>
                <div className="text-xs font-label-sm text-label-sm text-text-muted mb-2 flex items-center gap-1.5">
                  <HugeiconsIcon icon={BookOpen01Icon} className={cn("size-4", ts.book)} aria-hidden="true" />
                  <span>{r.subjectName}</span>
                  <span>·</span>
                  <span>{r.chapterTitle}</span>
                </div>
                <h2 className="font-headline-sm text-headline-sm text-text-primary leading-snug mb-space-md">{snippet(r.prompt)}</h2>
                <KeyPreview r={r} />
                <div className="flex flex-wrap items-center justify-between pt-3 gap-2 bg-surface-container-low/40 -mx-space-lg -mb-space-lg px-space-lg py-3 rounded-b-2xl">
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <HugeiconsIcon icon={Clock01Icon} className="size-4" aria-hidden="true" />
                    <span>Diperbarui: {formatWita(r.updatedAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/teacher/questions/${r.id}/preview`} className={cn(tray, "text-on-surface")}>
                      <HugeiconsIcon icon={ViewIcon} className="size-[18px]" aria-hidden="true" />
                      <span>Pratinjau<span className="sr-only"> soal: {name}</span></span>
                    </Link>
                    <Link href={`/teacher/questions/${r.id}`} className={cn(tray, "text-primary-strong")}>
                      <HugeiconsIcon icon={Edit02Icon} className="size-[18px]" aria-hidden="true" />
                      <span>Ubah soal<span className="sr-only">: {name}</span></span>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
          {(page > 1 || hasNext) && (
            <nav aria-label="Halaman" className="flex flex-wrap items-center justify-between bg-surface-container-lowest p-space-md rounded-2xl shadow-[0_2px_12px_rgba(230,115,60,0.04)] mt-2 gap-2">
              <div className="text-xs font-label-sm text-label-sm text-text-muted">Halaman <span className="font-bold text-text-primary">{page}</span></div>
              <div className="flex items-center gap-1.5">
                {page > 1 && (
                  <Link href={pageHref(page - 1)} className="min-h-12 px-3.5 rounded-xl bg-canvas-peach hover:bg-canvas-peach-subtle text-on-surface font-label-sm text-label-sm flex items-center gap-1 transition-all focus-visible:ring-[3px] focus-visible:ring-ring">
                    <HugeiconsIcon icon={ArrowLeft01Icon} className="size-[18px]" aria-hidden="true" />
                    <span>Sebelumnya</span>
                  </Link>
                )}
                {hasNext && (
                  <Link href={pageHref(page + 1)} className="min-h-12 px-3.5 rounded-xl bg-canvas-peach hover:bg-canvas-peach-subtle text-on-surface font-label-sm text-label-sm flex items-center gap-1 transition-all focus-visible:ring-[3px] focus-visible:ring-ring">
                    <span>Berikutnya</span>
                    <HugeiconsIcon icon={ArrowRight01Icon} className="size-[18px]" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </nav>
          )}
        </div>

        <aside className="lg:col-span-4 flex flex-col gap-space-lg lg:sticky lg:top-28">
          <div className={cn("bg-surface-container-lowest p-space-lg rounded-2xl flex flex-col", cardShadow)}>
            <div className="flex items-center justify-between mb-space-md">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={LibraryIcon} className="size-[22px] text-primary-strong" aria-hidden="true" />
                <h2 className="font-headline-sm text-headline-sm text-text-primary">Sebaran Tipe Soal</h2>
              </div>
              <span className="text-xs text-text-muted">5 Format</span>
            </div>
            <div className="flex flex-col gap-2">
              {ORDER.map((k) => (
                <Link key={k} href={hrefWith({ type: k, page: undefined })} className="w-full p-3 min-h-12 rounded-xl bg-canvas-peach hover:bg-canvas-peach-subtle flex items-center justify-between transition-all focus-visible:ring-[3px] focus-visible:ring-ring">
                  <span className="flex items-center gap-2.5">
                    <span aria-hidden="true" className={cn("w-2.5 h-2.5 rounded-full", TYPE_STYLE[k].dot)} />
                    <span className="font-label-sm text-label-sm text-on-surface">{TYPE_LABEL[k]}</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest text-text-primary font-code-mono text-xs font-bold shadow-xs">{byType[k]} butir</span>
                </Link>
              ))}
            </div>
          </div>
          <GuidePanel
            title="Kaidah Penilaian Soal"
            items={[
              { head: "Pilihan ganda majemuk", body: "Nilai penuh hanya jika semua pilihan yang benar dipilih. Kurang atau lebih satu pilihan, nilainya nol." },
              { head: "Isian singkat", body: "Jawaban dicocokkan persis setelah spasi dirapikan. Atur sendiri apakah huruf besar dan kecil dibedakan." },
              { head: "Uraian", body: "Dinilai manual oleh Anda. Hasil ulangan belum final sebelum semua uraian dinilai." },
              { head: "Soal yang sudah dipakai", body: "Ulangan yang sudah terbit menyimpan salinan soalnya, jadi mengedit soal di sini tidak mengubahnya." },
            ]}
          />
        </aside>
      </div>
    </BulkQuestionProvider>
  );
}

function Key({ solid }: { solid?: boolean }) {
  return solid ? (
    <span className="text-xs bg-tone-success text-primary-foreground px-2 py-0.5 rounded-full font-bold">Kunci Jawaban</span>
  ) : (
    <span className="flex items-center gap-1 text-xs text-tone-success font-label-sm text-label-sm font-bold">
      <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-4" aria-hidden="true" />
      Kunci Jawaban
    </span>
  );
}

function KeyPreview({ r }: { r: QuestionRow }) {
  const k = r.answerKey;
  if (r.options && (r.type === "SINGLE_CHOICE" || r.type === "MULTIPLE_SELECT")) {
    const keys = r.type === "SINGLE_CHOICE" ? [k.optionId as string] : (k.optionIds as string[]);
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm mb-space-md">
        {r.options.map((o) =>
          keys.includes(o.id) ? (
            <div key={o.id} className="p-3 rounded-xl bg-tone-success-bg text-on-surface flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-tone-success text-primary-foreground font-label-sm text-label-sm flex items-center justify-center font-bold shrink-0">{o.id.toUpperCase()}</span>
                <span className="font-body-md text-body-md font-bold text-tone-success break-words">{snippet(o.text)}</span>
              </div>
              <Key />
            </div>
          ) : (
            <div key={o.id} className="p-3 rounded-xl bg-surface-container flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-surface-container-lowest text-on-surface font-label-sm text-label-sm flex items-center justify-center shrink-0">{o.id.toUpperCase()}</span>
              <span className="font-body-md text-body-md text-on-surface break-words min-w-0">{snippet(o.text)}</span>
            </div>
          ),
        )}
      </div>
    );
  }
  if (r.type === "TRUE_FALSE") {
    return (
      <div className="mb-space-md flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        {[[true, "BENAR", CheckmarkCircle02Icon], [false, "SALAH", CancelCircleIcon]].map(([v, l, icon]) =>
          k.value === v ? (
            <div key={String(v)} className="flex-1 p-3.5 rounded-xl bg-tone-success-bg flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <HugeiconsIcon icon={icon as IconSvgElement} className="size-5 text-tone-success" aria-hidden="true" />
                <span className="font-label-md text-label-md text-tone-success font-bold">{l as string}</span>
              </div>
              <Key solid />
            </div>
          ) : (
            <div key={String(v)} className="flex-1 p-3.5 rounded-xl bg-surface-container flex items-center gap-2.5 opacity-60">
              <HugeiconsIcon icon={icon as IconSvgElement} className="size-5 text-text-muted" aria-hidden="true" />
              <span className="font-label-md text-label-md text-text-muted font-medium">{l as string}</span>
            </div>
          ),
        )}
      </div>
    );
  }
  if (r.type === "CATEGORY" && r.options) {
    const values = k.values as Record<string, boolean>;
    const [yes, no] = categoryLabelsOf(r.categoryLabels);
    return (
      <ol className="flex flex-col gap-space-sm mb-space-md">
        {r.options.map((o, i) => (
          <li key={o.id} className="p-3 rounded-xl bg-surface-container flex items-center justify-between gap-3">
            <span className="font-body-md text-body-md text-on-surface break-words min-w-0">{i + 1}. {snippet(o.text)}</span>
            <span className="shrink-0 px-2.5 py-1 rounded-lg bg-tone-success-bg font-label-sm text-label-sm font-bold text-tone-success">{values[o.id] ? yes : no}</span>
          </li>
        ))}
      </ol>
    );
  }
  if (r.type === "SHORT_ANSWER") {
    return (
      <div className="p-3 rounded-xl bg-tone-success-bg flex items-center justify-between gap-2 mb-space-md">
        <span className="font-body-md text-body-md text-on-surface break-words min-w-0">
          Jawaban diterima: <b className="text-tone-success">{(k.accepted as string[]).join(" / ")}</b>
        </span>
        <Key />
      </div>
    );
  }
  return typeof k.rubric === "string" && k.rubric ? (
    <div className="p-3.5 rounded-xl bg-canvas-peach flex items-start gap-3 my-space-sm">
      <HugeiconsIcon icon={TaskDone01Icon} className="size-[22px] text-tone-info shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex flex-col text-xs text-on-surface">
        <span className="font-bold font-label-sm text-label-sm text-primary-strong mb-1">Memiliki rubrik penilaian guru:</span>
        <span className="text-text-muted">{snippet(k.rubric)}</span>
      </div>
    </div>
  ) : null;
}
