import type { Metadata } from "next";
import { Suspense } from "react";
import { LogoutButton } from "@/components/logout-button";
import { requireTeacher } from "@/lib/auth/guard";

export const metadata: Metadata = { title: "Dasbor Guru" };

export default function TeacherDashboardPage() {
  return (
    <Suspense fallback={<p>Memuat…</p>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const user = await requireTeacher();
  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">Halo, {user.displayName}</h1>
      <p className="text-muted-foreground">Fitur kelas dan siswa sedang disiapkan.</p>
      <div>
        <LogoutButton />
      </div>
    </section>
  );
}
