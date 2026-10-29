import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireStudent } from "@/lib/auth/guard";
import { listStudentQuizzes } from "@/lib/attempts";

export const metadata: Metadata = { title: "Beranda" };

const LINK = "inline-flex min-h-11 items-center underline underline-offset-4";

export default function StudentDashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={<p>Memuat…</p>}>
        <Dashboard />
      </Suspense>
    </div>
  );
}

async function Dashboard() {
  const user = await requireStudent();
  const open = (await listStudentQuizzes({ id: user.id, classId: user.classId })).filter((r) =>
    (["AVAILABLE", "IN_PROGRESS", "REPLACEMENT"] as string[]).includes(r.state),
  ).length;
  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">Halo, {user.displayName}</h1>
      <p className="text-muted-foreground">Materi dan ulangan akan muncul di sini.</p>
      <ul className="flex flex-col gap-1">
        <li>
          <Link href="/student/materials" className={LINK}>
            Materi pelajaran
          </Link>
        </li>
        <li>
          <Link href="/student/quizzes" className={LINK}>
            Ulangan{open > 0 ? ` (${open} bisa dikerjakan)` : ""}
          </Link>
        </li>
      </ul>
    </section>
  );
}
