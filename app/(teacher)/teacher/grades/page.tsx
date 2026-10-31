import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireTeacher } from "@/lib/auth/guard";
import { getGradebook, getGradeOptions, GRADE_STATE, type Gradebook, type GradeCell } from "@/lib/gradebook";
import { GradebookError, gradeFilterParams, parseGradeFilters, type GradeFilters } from "@/lib/gradebook-filters";
import { formatScore, formatWita } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Status } from "@/components/status";

export const metadata: Metadata = { title: "Buku Nilai" };
type Search = Promise<Record<string, string | string[] | undefined>>;
const control = "min-h-12 w-full rounded-xl border-2 border-input bg-card px-3 focus-visible:ring-[3px] focus-visible:ring-ring";
const card = "min-w-0 rounded-2xl bg-card p-space-lg shadow-sm";

export default function GradesPage({ searchParams }: { searchParams: Search }) {
  return <div className="flex min-w-0 flex-col gap-space-lg px-space-lg py-space-xl">
    <PageHeader title="Buku Nilai" description="Rekap seluruh siswa, telusuri percobaan, dan unduh data penilaian." />
    <Suspense fallback={<p>Memuat buku nilai…</p>}><Content searchParams={searchParams} /></Suspense>
  </div>;
}

function ErrorNotice({ message }: { message: string }) {
  return <Alert variant="destructive"><AlertTitle>Buku nilai belum dapat ditampilkan</AlertTitle><AlertDescription>
    <p>{message}</p><Link href="/teacher/grades" className="inline-flex min-h-11 items-center underline">Atur ulang filter</Link>
  </AlertDescription></Alert>;
}

async function Content({ searchParams }: { searchParams: Search }) {
  await requireTeacher();
  const raw = await searchParams, params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) for (const v of Array.isArray(value) ? value : value ? [value] : []) params.append(key, v);
  let filters: GradeFilters;
  try { filters = parseGradeFilters(params); } catch (e) {
    if (e instanceof GradebookError) return <ErrorNotice message={e.message} />;
    throw e;
  }
  const options = await getGradeOptions(filters);
  let book: Gradebook | undefined, error: string | undefined;
  try { book = await getGradebook(filters); } catch (e) {
    if (e instanceof GradebookError) error = e.message; else throw e;
  }
  const pageCount = Math.max(1, Math.ceil((book?.students.length ?? 0) / 50));
  const requestedPage = Number(params.get("page")) || 1;
  const page = Math.min(pageCount, Math.max(1, Math.floor(requestedPage)));
  const visible = new Set(book?.students.slice((page - 1) * 50, page * 50).map((s) => s.id));
  const pageHref = (n: number) => { const p = gradeFilterParams(filters); p.set("page", String(n)); return `/teacher/grades?${p}`; };
  return <>
    <form method="get" action="/teacher/grades" className={`${card} flex flex-col gap-4`} aria-label="Filter buku nilai">
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Choices title="Kelas" name="classId" selected={filters.classIds} items={options.classes.map((x) => ({ id: x.id, label: x.name }))} />
        <Choices title="Mata pelajaran" name="subjectId" selected={filters.subjectIds} items={options.subjects.map((x) => ({ id: x.id, label: x.name }))} />
        <label className="flex min-w-0 flex-col gap-2">Jenis ulangan<select name="kind" defaultValue={filters.kind ?? ""} className={control}>
          <option value="">Semua jenis</option><option value="REGULAR">Ulangan biasa</option><option value="TRYOUT_TKA">Tryout TKA</option>
        </select></label>
        <label className="flex min-w-0 flex-col gap-2">Dari tanggal (WITA)<Input type="date" name="from" defaultValue={filters.from} /></label>
        <label className="flex min-w-0 flex-col gap-2">Sampai tanggal (WITA)<Input type="date" name="to" defaultValue={filters.to} /></label>
        <label className="flex min-w-0 flex-col gap-2">Cari siswa<Input name="q" placeholder="Nama, NISN, atau nomor induk" defaultValue={filters.q} maxLength={200} /></label>
      </div>
      <Choices title="Pilihan ulangan" name="quizId" selected={filters.quizIds} items={options.quizzes.map((q) => ({ id: q.id, label: q.title }))} />
      <p className="text-sm text-muted-foreground">Tanpa centang berarti semua. Pilihan ulangan mengikuti kelas, mapel, jenis, dan tanggal yang sudah diterapkan.</p>
      <label className="flex min-h-11 items-center gap-3"><input type="checkbox" name="includeHistory" value="1" defaultChecked={filters.includeHistory} className="size-5" />Sertakan riwayat siswa nonaktif atau pindahan</label>
      <div className="flex flex-wrap gap-3"><Button type="submit">Terapkan filter</Button><Link href="/teacher/grades" className={buttonVariants({ variant: "outline" })}>Atur ulang filter</Link></div>
    </form>
    {error && <ErrorNotice message={error} />}
    {book && <>
      <section className={`${card} flex flex-col gap-3`} aria-label="Unduh buku nilai">
        <h2 className="text-xl font-bold">Unduh sesuai filter</h2>
        <p>{book.students.length} siswa · {book.quizzes.length} ulangan · diambil {formatWita(book.capturedAt)} WITA.</p>
        <div className="flex flex-wrap gap-3">{([ ["xlsx", "summary", "Excel ringkas"], ["xlsx", "full", "Excel lengkap"], ["csv", "summary", "CSV ringkas (ZIP)"], ["csv", "full", "CSV lengkap (ZIP)"] ] as const).map(([format, mode, label]) => {
          const p = gradeFilterParams(filters); p.set("format", format); p.set("mode", mode);
          return <a key={label} href={`/api/gradebook-exports?${p}`} className={buttonVariants({ variant: "outline" })}>{label}</a>;
        })}</div>
        <p className="text-sm text-muted-foreground">Unduhan mencakup seluruh hasil filter, bukan hanya halaman ini. Lengkap menyertakan kunci/rubrik dan jawaban; simpan sebagai dokumen guru. Maksimal 100 ulangan dan 100.000 baris per unduhan.</p>
      </section>
      <aside className={`${card} text-sm`}>
        Rata-rata hanya memakai nilai final dengan bobot sama. Kosong bukan nol. Ulangan tanpa KKM tidak masuk jumlah ketuntasan.
        Kelas siswa adalah kelas saat ini; kelas tujuan ulangan bukan riwayat keanggotaan kelas. Hasil belum dirilis tetap terlihat oleh guru.
      </aside>
      {!book.groups.length && <p className={card}>Tidak ada siswa atau ulangan yang cocok dengan filter.</p>}
      {book.groups.filter((g) => g.rows.some((r) => visible.has(r.student.id))).map((g) => <section key={`${g.classId}:${g.subjectId}:${g.kind}`} className={`${card} flex flex-col gap-3`}>
        <h2 className="text-xl font-bold">{g.className} · {g.subjectName} · {g.kind === "TRYOUT_TKA" ? "Tryout TKA" : "Ulangan biasa"}</h2>
        <div role="region" aria-label={`Tabel ${g.className} ${g.subjectName}`} tabIndex={0} className="relative max-w-full overflow-x-auto rounded-xl border focus-visible:ring-[3px] focus-visible:ring-ring">
          <table className="w-full border-collapse text-sm"><caption className="sr-only">Buku nilai {g.className} {g.subjectName}</caption>
            <thead><tr><th scope="col" className="sticky left-0 z-10 min-w-40 bg-muted p-3 text-left">Siswa / NISN / No. induk</th>
              {g.quizzes.map((q) => <th key={q.id} scope="col" className="min-w-48 p-3 text-left"><Link className="inline-flex min-h-11 items-center underline" href={`/teacher/quizzes/${q.id}`}>{q.title}</Link><p className="font-normal">KKM {q.kkm ?? "—"} · {q.resultsReleasedAt ? "Hasil dirilis" : "Belum dirilis"}</p><p className="font-normal">Kelas tujuan: {q.classes.map((c) => c.class.name).join(", ")}</p></th>)}
              {["Rata-rata", "Nilai terhitung", "Tuntas", "Belum tuntas"].map((s) => <th key={s} scope="col" className="min-w-28 p-3">{s}</th>)}</tr></thead>
            <tbody>{g.rows.filter((r) => visible.has(r.student.id)).map((r) => <tr key={r.student.id} className="border-t align-top">
              <th scope="row" className="sticky left-0 bg-card p-3 text-left font-normal"><p className="font-bold">{r.student.displayName}</p><p>{r.student.nis ?? "Tanpa NISN"}</p><p>No. induk {r.student.studentNo ?? "—"}</p>{!r.student.isActive && <Status tone="neutral">Nonaktif</Status>}</th>
              {r.cells.map((c, i) => <td key={c.quizId} className="p-3"><Cell cell={c} name={r.student.displayName} title={g.quizzes[i].title} /></td>)}
              <td className="p-3 text-center font-bold">{r.average === null ? "—" : formatScore(r.average)}</td><td className="p-3 text-center">{r.counted}</td><td className="p-3 text-center">{r.passed}</td><td className="p-3 text-center">{r.failed}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>)}
      <nav aria-label="Halaman siswa" className="flex flex-wrap items-center gap-3">
        {page > 1 && <Link className={buttonVariants({ variant: "outline" })} href={pageHref(page - 1)}>Sebelumnya</Link>}
        <span>Halaman {page} dari {pageCount} · maksimal 50 siswa per halaman</span>
        {page < pageCount && <Link className={buttonVariants({ variant: "outline" })} href={pageHref(page + 1)}>Berikutnya</Link>}
      </nav>
    </>}
  </>;
}

function Choices({ title, name, items, selected = [] }: { title: string; name: string; items: { id: string; label: string }[]; selected?: string[] }) {
  return <details className="min-w-0 rounded-xl border-2 border-input p-3"><summary className="min-h-11 cursor-pointer font-semibold focus-visible:ring-[3px] focus-visible:ring-ring">{title} · {selected.length ? `${selected.length} dipilih` : "Semua"}</summary>
    <fieldset className="max-h-52 overflow-auto"><legend className="sr-only">{title}</legend>
      {items.map((x) => <label key={x.id} className="flex min-h-11 items-center gap-3 break-words"><input type="checkbox" name={name} value={x.id} defaultChecked={selected.includes(x.id)} className="size-5 shrink-0" />{x.label}</label>)}
      {!items.length && <p className="py-2 text-muted-foreground">Belum ada pilihan yang sesuai.</p>}
    </fieldset>
  </details>;
}

function Cell({ cell: c, name, title }: { cell: GradeCell; name: string; title: string }) {
  return <details><summary className="min-h-11 cursor-pointer rounded-lg py-2 focus-visible:ring-[3px] focus-visible:ring-ring">
    <span className="sr-only">Rincian {name} — {title}</span>
    <span className="block font-bold">{c.score === null ? "—" : formatScore(c.score)}</span>
    <Status tone={c.state === "FINAL" ? "success" : c.state === "NEEDS_GRADING" ? "warning" : "neutral"}>{GRADE_STATE[c.state]}</Status>
  </summary><div className="flex min-w-48 max-w-72 flex-col gap-2 py-2">
    {c.passed !== null && <p>{c.passed ? "Tuntas" : "Belum tuntas"}</p>}
    <p>Nilai utama: {c.primary === null ? "—" : formatScore(c.primary)} · tertinggi: {c.highest === null ? "—" : formatScore(c.highest)}</p>
    {!c.attempts.length && <p>Belum ada percobaan.</p>}
    {c.attempts.map((a) => <div key={a.id} className="border-t py-2"><p>Percobaan {a.attemptNumber} · {a.replaced ? "Diganti, tidak dihitung" : a.status === "IN_PROGRESS" ? "Sedang mengerjakan" : "Dikumpulkan"}</p>
      <p>Mulai {formatWita(a.startedAt)} WITA{a.submittedAt ? ` · kumpul ${formatWita(a.submittedAt)} WITA` : ""}</p>
      <Link href={`/teacher/quizzes/${c.quizId}/attempts/${a.id}`} className="inline-flex min-h-11 items-center underline">Buka penilaian percobaan {a.attemptNumber}</Link>
    </div>)}
  </div></details>;
}
