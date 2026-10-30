import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserGroupIcon } from "@hugeicons/core-free-icons";
import { requireTeacher } from "@/lib/auth/guard";
import { listClasses } from "@/lib/classes";
import { formatWita } from "@/lib/format";
import { listStudents } from "@/lib/students";
import {
  CreateStudentForm,
  EditStudentDialog,
  RevokeStudentButton,
  ToggleStudentActiveButton,
} from "./student-forms";

export const metadata: Metadata = { title: "Kelola Siswa" };

type Params = Promise<Record<string, string | string[] | undefined>>;

export default function StudentsPage({ searchParams }: { searchParams: Params }) {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Kelola Siswa"
        description="Tambah siswa, cari, dan atur sesi masuk mereka."
      />
      <Suspense fallback={<p>Memuat…</p>}>
        <StudentList searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

const initials = (n: string) =>
  n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

// searchParams is request data, so it is read here inside Suspense.
async function StudentList({ searchParams }: { searchParams: Params }) {
  await requireTeacher();
  const sp = await searchParams;
  const kelas = one(sp.kelas);
  const q = one(sp.q);
  const [allClasses, students] = await Promise.all([
    listClasses(),
    listStudents({ classId: kelas || undefined, q: q || undefined }),
  ]);
  // Never pass the class code to client components.
  const classes = allClasses.map((c) => ({ id: c.id, name: c.name, isActive: c.isActive }));
  return (
    <>
      <StatCard
        label="Siswa ditampilkan"
        value={students.length}
        hint={kelas || q ? "sesuai pencarian" : "semua kelas"}
        icon={UserGroupIcon}
        tone="primary"
      />
      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Tambah siswa</h2>
          <CreateStudentForm
            classes={classes}
            defaultClassId={classes.some((c) => c.id === kelas) ? kelas : undefined}
          />
        </CardContent>
      </Card>
      <form method="get" className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-card sm:flex-row sm:items-end">
        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-kelas">Kelas</Label>
          <select
            id="filter-kelas"
            name="kelas"
            defaultValue={kelas}
            className="h-12 rounded-xl border-2 border-input bg-card px-3 text-base"
          >
            <option value="">Semua kelas</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-q">Cari nama atau NIS</Label>
          <Input id="filter-q" name="q" defaultValue={q} autoComplete="off" />
        </div>
        <Button type="submit">
          Cari
        </Button>
      </form>

      {students.length === 0 && (
        <p className="text-muted-foreground">
          {kelas || q ? "Tidak ada siswa yang cocok." : "Belum ada siswa. Tambah siswa di atas."}
        </p>
      )}
      {students.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="hidden grid-cols-[minmax(12rem,1.5fr)_minmax(6rem,0.6fr)_minmax(6rem,0.6fr)_minmax(0,2fr)] gap-4 border-b bg-secondary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground xl:grid">
              <span>Siswa</span>
              <span>Kelas</span>
              <span>Status</span>
              <span>Aksi</span>
            </div>
            <ul className="divide-y">
              {students.map((s) => (
                <li
                  key={s.id}
                  className={cn(
                    "grid min-w-0 gap-3 p-4 xl:grid-cols-[minmax(12rem,1.5fr)_minmax(6rem,0.6fr)_minmax(6rem,0.6fr)_minmax(0,2fr)] xl:items-center xl:gap-4 xl:px-6",
                    s.replacedCount7d > 0 && "bg-warning-soft",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-info-soft text-sm font-bold text-info">
                      {initials(s.displayName)}
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold break-words">{s.displayName}</h2>
                      <p className="text-sm text-muted-foreground">NIS {s.nis ?? "-"}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">Kelas {s.className}</p>
                  <div>
                    <Status tone={s.isActive ? "success" : "neutral"}>{s.isActive ? "Aktif" : "Nonaktif"}</Status>
                  </div>
                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <EditStudentDialog
                      student={{
                        id: s.id,
                        displayName: s.displayName,
                        nis: s.nis,
                        classId: s.classId,
                      }}
                      classes={classes}
                    />
                    <RevokeStudentButton studentId={s.id} />
                    <ToggleStudentActiveButton studentId={s.id} isActive={s.isActive} />
                  </div>
                  {s.replacedCount7d > 0 && s.lastReplacedAt && (
                    <div className="xl:col-span-4">
                      <Status tone="warning">
                        Masuk dari perangkat lain {s.replacedCount7d}× dalam 7 hari terakhir, terakhir{" "}
                        {formatWita(s.lastReplacedAt)}
                      </Status>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
