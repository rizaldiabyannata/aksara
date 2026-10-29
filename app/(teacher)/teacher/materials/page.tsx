import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Status } from "@/components/status";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { requireTeacher } from "@/lib/auth/guard";
import type { MaterialStatus } from "@/lib/generated/prisma/enums";
import { listMaterials } from "@/lib/materials";
import { getSubjectTree, listChapterOptions } from "@/lib/subjects";
import { MoveButtons } from "./material-form";
import { STATUS_LABEL, STATUS_TONE } from "./status-label";

export const metadata: Metadata = { title: "Materi" };

const selectClass =
  "h-12 w-full rounded-lg border-2 border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring";

export default function MaterialsPage({ searchParams }: PageProps<"/teacher/materials">) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Materi</h1>
        <Link href="/teacher/materials/new" className={buttonVariants({ className: "h-11" })}>
          Materi baru
        </Link>
      </div>
      <Suspense fallback={<p>Memuat…</p>}>
        <List searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

const one = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);

async function List({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireTeacher();
  const sp = await searchParams;
  const subjectId = one(sp.subjectId);
  const chapterId = one(sp.chapterId);
  const s = one(sp.status);
  const status = s && Object.hasOwn(STATUS_LABEL, s) ? (s as MaterialStatus) : undefined;
  const [{ rows, capped }, subjects, chapters] = await Promise.all([
    listMaterials({ subjectId, chapterId, status }),
    getSubjectTree(),
    listChapterOptions(),
  ]);
  // ponytail: no pagination; the list is capped at 200 rows. Add paging if the bank outgrows it.
  return (
    <>
      <form method="get" className="grid gap-3 sm:grid-cols-4 sm:items-end">
        <div className="flex flex-col gap-2">
          <Label htmlFor="f-subject">Mapel</Label>
          <select id="f-subject" name="subjectId" defaultValue={subjectId ?? ""} className={selectClass}>
            <option value="">Semua mapel</option>
            {subjects.map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="f-chapter">Bab</Label>
          <select id="f-chapter" name="chapterId" defaultValue={chapterId ?? ""} className={selectClass}>
            <option value="">Semua bab</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="f-status">Status</Label>
          <select id="f-status" name="status" defaultValue={status ?? ""} className={selectClass}>
            <option value="">Semua status</option>
            {Object.entries(STATUS_LABEL).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </div>
        <Button type="submit" className="h-11 text-base">Terapkan</Button>
      </form>

      {rows.length === 0 && <p className="text-muted-foreground">Belum ada materi yang cocok.</p>}
      <ul className="flex flex-col gap-3">
        {rows.map((m, i) => {
          const sameChapter = (j: number) => rows[j]?.chapterId === m.chapterId;
          return (
            <li key={m.id} className="flex flex-col gap-3 rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">{m.title}</h2>
                <Status tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status]}</Status>
              </div>
              <p className="text-sm text-muted-foreground">{m.subjectName} · {m.chapterTitle}</p>
              <div className="flex flex-wrap items-start gap-2">
                <MoveButtons id={m.id} title={m.title} isFirst={!sameChapter(i - 1)} isLast={!sameChapter(i + 1)} />
                <Link href={`/teacher/materials/${m.id}`} className="inline-flex min-h-11 items-center underline">
                  Ubah<span className="sr-only"> materi {m.title}</span>
                </Link>
                <Link href={`/teacher/materials/${m.id}/preview`} className="inline-flex min-h-11 items-center underline">
                  Pratinjau<span className="sr-only"> materi {m.title}</span>
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
      {capped && <p className="text-sm text-muted-foreground">Tampil 200 materi pertama. Persempit filter.</p>}
    </>
  );
}
