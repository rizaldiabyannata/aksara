import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Status } from "@/components/status";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { requireTeacher } from "@/lib/auth/guard";
import type { MaterialStatus } from "@/lib/generated/prisma/enums";
import { listMaterials } from "@/lib/materials";
import { getSubjectTree, listChapterOptions } from "@/lib/subjects";
import { MoveButtons } from "./material-form";
import { STATUS_LABEL, STATUS_TONE } from "./status-label";

export const metadata: Metadata = { title: "Materi" };

const selectClass =
  "h-12 w-full rounded-xl border-2 border-input bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring";

export default function MaterialsPage({ searchParams }: PageProps<"/teacher/materials">) {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Materi"
        description="Kelola bahan bacaan siswa, dari draf sampai terbit."
        actions={
          <Link href="/teacher/materials/new" className={buttonVariants()}>
            Materi baru
          </Link>
        }
      />
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
  // Rows arrive ordered by chapter, so consecutive rows with the same chapter form one group.
  const groups: { chapterId: string; title: string; subject: string; items: { m: (typeof rows)[number]; i: number }[] }[] = [];
  rows.forEach((m, i) => {
    const last = groups.at(-1);
    if (last?.chapterId === m.chapterId) last.items.push({ m, i });
    else groups.push({ chapterId: m.chapterId, title: m.chapterTitle, subject: m.subjectName, items: [{ m, i }] });
  });
  // ponytail: no pagination; the list is capped at 200 rows. Add paging if the bank outgrows it.
  return (
    <>
      <Card>
        <CardContent>
          <form method="get" className="grid gap-4 sm:grid-cols-4 sm:items-end">
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
            <Button type="submit" className="h-12 text-base">Terapkan</Button>
          </form>
        </CardContent>
      </Card>

      {rows.length === 0 && (
        <p className="text-muted-foreground">Belum ada materi yang cocok. Ubah saringan, atau tekan Materi baru untuk menambah.</p>
      )}
      {groups.map((g) => (
        <section key={g.items[0]!.m.id} aria-label={g.title} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold">{g.title}</h2>
            <p className="text-sm text-muted-foreground">{g.subject}</p>
          </div>
          <ul className="flex flex-col gap-3">
            {g.items.map(({ m, i }) => {
              const sameChapter = (j: number) => rows[j]?.chapterId === m.chapterId;
              return (
                <li key={m.id}>
                  <Card>
                    <CardContent className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Status tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status]}</Status>
                      </div>
                      <h3 className="text-lg font-bold">{m.title}</h3>
                      <div className="flex flex-wrap items-start gap-3">
                        <MoveButtons id={m.id} title={m.title} isFirst={!sameChapter(i - 1)} isLast={!sameChapter(i + 1)} />
                        <Link href={`/teacher/materials/${m.id}`} className={buttonVariants({ className: "h-11" })}>
                          Ubah<span className="sr-only"> materi {m.title}</span>
                        </Link>
                        <Link href={`/teacher/materials/${m.id}/preview`} className={buttonVariants({ variant: "outline", className: "h-11" })}>
                          Pratinjau<span className="sr-only"> materi {m.title}</span>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {capped && <p className="text-sm text-muted-foreground">Tampil 200 materi pertama. Persempit filter.</p>}
    </>
  );
}
