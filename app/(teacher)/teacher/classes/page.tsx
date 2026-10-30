import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Status } from "@/components/status";
import { Card, CardContent } from "@/components/ui/card";
import { Add01Icon, DoorIcon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard label="Kelas aktif" value={active} hint={`dari ${classes.length} kelas`} icon={DoorIcon} tone="info" />
        <StatCard label="Siswa terdaftar" value={total} icon={UserGroupIcon} tone="primary" />
      </div>
      <Card>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex items-start gap-4 md:w-2/5">
            <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <HugeiconsIcon icon={Add01Icon} />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Tambah kelas</h2>
              <p className="text-sm text-muted-foreground">Buat kelas baru, lalu bagikan kode masuknya kepada siswa.</p>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <CreateClassForm />
          </div>
        </CardContent>
      </Card>
      {classes.length === 0 && (
        <p className="text-muted-foreground">Belum ada kelas. Buat kelas pertama di atas.</p>
      )}
      <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
      <ul className="flex flex-col gap-6">
        {classes.map((c) => (
          <li key={c.id} className="min-w-0">
            <Card>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success">
                    <HugeiconsIcon icon={DoorIcon} />
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold">{c.name}</h2>
                      <Status tone={c.isActive ? "success" : "neutral"}>{c.isActive ? "Aktif" : "Nonaktif"}</Status>
                    </div>
                    <p className="text-sm text-muted-foreground">{c.studentCount} siswa terdaftar</p>
                  </div>
                </div>
                {/* Masked: this page may be projected. The dialog reveals the code. */}
                <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Kode masuk kelas</p>
                    <p className="font-mono text-2xl font-bold tracking-widest">
                      <span className="sr-only">Kode kelas disembunyikan. Tekan Tampilkan kode.</span>
                      <span aria-hidden="true">••• •••</span>
                    </p>
                    <p className="text-sm text-muted-foreground">Disembunyikan agar aman saat layar diproyeksikan.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ClassCodeDialog name={c.name} code={c.code} />
                    <RotateCodeButton classId={c.id} />
                  </div>
                </div>
                <div className="flex flex-col gap-4 rounded-2xl bg-secondary p-4">
                  <RenameClassForm classId={c.id} name={c.name} />
                  <div className="flex flex-wrap gap-2">
                    <RevokeSessionsButton classId={c.id} />
                    <ToggleActiveButton classId={c.id} isActive={c.isActive} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      <aside>
        <Card>
          <CardContent className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Panduan proyektor dan keamanan</h2>
            <p className="text-sm text-muted-foreground">Kode kelas disembunyikan supaya aman saat layar diproyeksikan.</p>
            <ol className="flex flex-col gap-3">
              {[
                ["1. Tampilkan kode", "Tekan Tampilkan kode sebelum siswa masuk. Kode muncul sangat besar agar mudah dibaca dari belakang kelas."],
                ["2. Ganti kode jika bocor", "Kode lama tidak bisa dipakai lagi. Siswa yang sudah masuk tetap masuk."],
                ["3. Keluarkan semua siswa", "Pakai setelah sesi selesai. Semua siswa kelas itu keluar dan harus masuk lagi dengan kode."],
              ].map(([t, d]) => (
                <li key={t} className="rounded-xl bg-warning-soft p-4">
                  <p className="font-semibold">{t}</p>
                  <p className="text-sm text-muted-foreground">{d}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </aside>
      </div>
    </>
  );
}
