import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        eyebrow="Data siswa"
        title="Kelola Siswa"
        description="Tambah siswa, cari, dan atur sesi masuk mereka."
      />
      <Suspense fallback={<p>Memuat…</p>}>
        <StudentList searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

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
        <CardHeader>
          <CardTitle>
            <h2 className="text-xl font-semibold">Tambah siswa</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CreateStudentForm
            classes={classes}
            defaultClassId={classes.some((c) => c.id === kelas) ? kelas : undefined}
          />
        </CardContent>
      </Card>
      <form method="get" className="flex rounded-2xl border bg-card p-4 flex-col gap-3 sm:flex-row sm:items-end">
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
      <ul className="grid gap-4 md:grid-cols-2">
        {students.map((s) => (
          <li key={s.id} className="min-w-0">
            <Card className={s.replacedCount7d > 0 ? "ring-2 ring-warning" : undefined}>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{s.displayName}</h2>
                  <Status tone={s.isActive ? "success" : "neutral"}>{s.isActive ? "Aktif" : "Nonaktif"}</Status>
                </div>
                <p className="text-sm text-muted-foreground">
                  Kelas {s.className} · NIS {s.nis ?? "-"}
                </p>
                {s.replacedCount7d > 0 && s.lastReplacedAt && (
                  <Status tone="warning">
                    Masuk dari perangkat lain {s.replacedCount7d}× dalam 7 hari terakhir, terakhir{" "}
                    {formatWita(s.lastReplacedAt)}
                  </Status>
                )}
                <div className="flex flex-wrap gap-2">
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
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
