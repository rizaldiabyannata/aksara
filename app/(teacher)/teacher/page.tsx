import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireTeacher } from "@/lib/auth/guard";
import { countMaterialsByStatus } from "@/lib/materials";
import { STATUS_LABEL } from "./materials/status-label";

export const metadata: Metadata = { title: "Dasbor Guru" };

export default function TeacherDashboardPage() {
  return (
    <Suspense fallback={<p>Memuat…</p>}>
      <Dashboard />
    </Suspense>
  );
}

const LINK = "inline-flex min-h-11 items-center underline underline-offset-4";

async function Dashboard() {
  const user = await requireTeacher();
  const counts = await countMaterialsByStatus();
  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">Halo, {user.displayName}</h1>
      <p className="text-muted-foreground">Mulai dari kelas, lalu tambahkan siswanya.</p>
      <ul className="flex flex-col gap-1">
        <li>
          <Link href="/teacher/classes" className={LINK}>
            Kelas: buat kelas dan bagikan kodenya kepada siswa
          </Link>
        </li>
        <li>
          <Link href="/teacher/students" className={LINK}>
            Siswa: tambah siswa dan atur kelasnya
          </Link>
        </li>
        <li>
          <Link href="/teacher/subjects" className={LINK}>
            Mapel &amp; Bab: atur susunan mapel dan bab
          </Link>
        </li>
      </ul>
      <Card>
        <CardHeader>
          <CardTitle>Materi</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-1">
            {(["DRAFT", "REVIEWED", "PUBLISHED"] as const).map((s) => (
              <li key={s}>
                <Link href={`/teacher/materials?status=${s}`} className={LINK}>
                  {STATUS_LABEL[s]}: {counts[s]}
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
