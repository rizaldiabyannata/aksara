import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Status } from "@/components/status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DoorIcon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { requireTeacher } from "@/lib/auth/guard";
import { listClasses } from "@/lib/classes";
import {
  CreateClassForm,
  RenameClassForm,
  RevokeSessionsButton,
  RotateCodeButton,
  ToggleActiveButton,
} from "./class-forms";
import { ClassCodeDialog } from "./class-code-dialog";

export const metadata: Metadata = { title: "Kelola Kelas" };

export default function ClassesPage() {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Ruang kelas"
        title="Kelola Kelas"
        description="Atur kelas, kode masuk, dan sesi siswa."
      />
      <Suspense fallback={<p>Memuat…</p>}>
        <ClassList />
      </Suspense>
    </section>
  );
}

async function ClassList() {
  await requireTeacher();
  const classes = await listClasses();
  const active = classes.filter((c) => c.isActive).length;
  const total = classes.reduce((n, c) => n + c.studentCount, 0);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Kelas aktif" value={active} hint={`dari ${classes.length} kelas`} icon={DoorIcon} tone="info" />
        <StatCard label="Siswa terdaftar" value={total} icon={UserGroupIcon} tone="primary" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-xl font-semibold">Tambah kelas</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CreateClassForm />
        </CardContent>
      </Card>
      {classes.length === 0 && (
        <p className="text-muted-foreground">Belum ada kelas. Buat kelas pertama di atas.</p>
      )}
      <ul className="grid gap-4 md:grid-cols-2">
        {classes.map((c) => (
          <li key={c.id} className="min-w-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{c.name}</h2>
                  <Status tone={c.isActive ? "success" : "neutral"}>{c.isActive ? "Aktif" : "Nonaktif"}</Status>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{c.studentCount} siswa</p>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {/* Masked: this page may be projected. The dialog reveals the code. */}
                <p className="font-mono text-2xl font-bold tracking-widest">
                  <span className="sr-only">Kode kelas disembunyikan. Tekan Tampilkan kode.</span>
                  <span aria-hidden="true">••• •••</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <ClassCodeDialog name={c.name} code={c.code} />
                  <RotateCodeButton classId={c.id} />
                  <RevokeSessionsButton classId={c.id} />
                  <ToggleActiveButton classId={c.id} isActive={c.isActive} />
                </div>
                <RenameClassForm classId={c.id} name={c.name} />
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
