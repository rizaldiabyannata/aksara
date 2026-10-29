import type { Metadata } from "next";
import { Suspense } from "react";
import { Status } from "@/components/status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireTeacher } from "@/lib/auth/guard";
import { listClasses } from "@/lib/classes";
import {
  CreateClassForm,
  RenameClassForm,
  RevokeSessionsButton,
  RotateCodeButton,
  ShowCodeDialog,
  ToggleActiveButton,
} from "./class-forms";

export const metadata: Metadata = { title: "Kelola Kelas" };

export default function ClassesPage() {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Kelas</h1>
      <Suspense fallback={<p>Memuat…</p>}>
        <ClassList />
      </Suspense>
    </section>
  );
}

async function ClassList() {
  await requireTeacher();
  const classes = await listClasses();
  return (
    <>
      {classes.length === 0 && (
        <p className="text-muted-foreground">
          Belum ada kelas. Buat kelas pertama di bawah ini.
        </p>
      )}
      <ul className="grid gap-4 md:grid-cols-2">
        {classes.map((c) => (
          <li key={c.id}>
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
                  <ShowCodeDialog name={c.name} code={c.code} />
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
      <Card className="max-w-sm">
        <CardContent>
          <CreateClassForm />
        </CardContent>
      </Card>
    </>
  );
}
