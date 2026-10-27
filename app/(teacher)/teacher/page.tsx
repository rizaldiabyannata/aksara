import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireTeacher } from "@/lib/auth/guard";

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
      </ul>
    </section>
  );
}
