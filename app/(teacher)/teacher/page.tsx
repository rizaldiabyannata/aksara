import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  Book02Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Edit02Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Status } from "@/components/status";
import { requireTeacher } from "@/lib/auth/guard";
import { getTeacherDashboard, type TeacherTask } from "@/lib/dashboard";

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
  const { tasks, counts } = await getTeacherDashboard();
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">Halo, {user.displayName}</h1>
      <p className="text-muted-foreground">
        {counts.materialsPublished} materi terbit · {counts.questionsActive} soal aktif ·{" "}
        {counts.activeStudents} siswa aktif
      </p>

      {counts.activeStudents === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mulai dari sini</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex list-decimal flex-col gap-2 pl-6">
              <li>
                <Link href="/teacher/classes" className="inline-flex min-h-11 items-center underline underline-offset-4">
                  Buat kelas
                </Link>
              </li>
              <li>
                <Link href="/teacher/students" className="inline-flex min-h-11 items-center underline underline-offset-4">
                  Tambah siswa
                </Link>
              </li>
              <li>
                <Link href="/teacher/materials" className="inline-flex min-h-11 items-center underline underline-offset-4">
                  Tulis materi
                </Link>
              </li>
            </ol>
          </CardContent>
        </Card>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold">Perlu tindakan</h2>
        {tasks.length === 0 ? (
          <Status tone="success">Tidak ada yang perlu dikerjakan sekarang.</Status>
        ) : (
          <ul className="flex flex-col gap-3">
            {tasks.map((task) => (
              <TaskItem key={`${task.kind}-${"quizId" in task ? task.quizId : ""}`} task={task} />
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

function TaskItem({ task }: { task: TeacherTask }) {
  const { icon, text, action, href } = describe(task);
  return (
    <li className="flex flex-col gap-3 rounded-2xl p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-3">
        <HugeiconsIcon icon={icon} aria-hidden="true" className="mt-1 shrink-0" />
        <span>{text}</span>
      </p>
      <Link href={href} className={buttonVariants()}>
        {action}
      </Link>
    </li>
  );
}

function describe(task: TeacherTask): {
  icon: typeof Clock01Icon;
  text: string;
  action: string;
  href: string;
} {
  switch (task.kind) {
    case "RUNNING":
      return {
        icon: Clock01Icon,
        text: `${task.title}: ${task.inProgress} siswa sedang mengerjakan`,
        action: "Pantau",
        href: `/teacher/quizzes/${task.quizId}#pemantauan`,
      };
    case "GRADE":
      return {
        icon: Edit02Icon,
        text: `${task.title}: ${task.essays} jawaban uraian belum dinilai`,
        action: "Nilai sekarang",
        href: `/teacher/quizzes/${task.quizId}#pemantauan`,
      };
    case "RELEASE":
      return {
        icon: CheckmarkCircle02Icon,
        text: `${task.title}: semua sudah dinilai, siap dibagikan ke ${task.students} siswa`,
        action: "Rilis hasil",
        href: `/teacher/quizzes/${task.quizId}#hasil`,
      };
    case "OTHER_DEVICE":
      return {
        icon: InformationCircleIcon,
        text: `${task.students} siswa masuk dari perangkat lain minggu ini`,
        action: "Lihat siswa",
        href: "/teacher/students",
      };
    case "REVIEWED_MATERIALS":
      return {
        icon: Book02Icon,
        text: `${task.count} materi sudah ditinjau, belum diterbitkan`,
        action: "Lihat materi",
        href: "/teacher/materials?status=REVIEWED",
      };
  }
}
