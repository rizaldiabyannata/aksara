import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  Book02Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Edit02Icon,
  InformationCircleIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
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
      <div className="rounded-3xl bg-primary-soft p-6">
        <PageHeader
          title={`Selamat datang, ${user.displayName}!`}
          description={
            tasks.length === 0
              ? "Tidak ada yang perlu dikerjakan sekarang."
              : `Ada ${tasks.length} hal yang perlu Anda kerjakan hari ini.`
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Materi" value={counts.materialsPublished} hint="Materi terbit" icon={Book02Icon} tone="info" />
        <StatCard label="Bank soal" value={counts.questionsActive} hint="Soal aktif" icon={Edit02Icon} tone="primary" />
        <StatCard label="Siswa" value={counts.activeStudents} hint="Siswa aktif" icon={UserGroupIcon} tone="success" />
      </div>

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

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-3 text-xl font-bold">
            <span aria-hidden="true" className="h-6 w-1.5 rounded-full bg-accent-decor" />
            Perlu tindakan
          </h2>
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

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Akses cepat</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {QUICK.map(({ href, label, icon }) => (
              <Link key={href} href={href} className={buttonVariants({ variant: "outline" }) + " justify-start"}>
                <HugeiconsIcon icon={icon} aria-hidden="true" />
                {label}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

const QUICK = [
  { href: "/teacher/quizzes/new", label: "Buat ulangan", icon: Clock01Icon },
  { href: "/teacher/materials/new", label: "Tulis materi", icon: Book02Icon },
  { href: "/teacher/questions/new", label: "Tambah soal", icon: Edit02Icon },
];

function TaskItem({ task }: { task: TeacherTask }) {
  const { icon, tone, text, action, href } = describe(task);
  return (
    <li>
      <Card>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Status tone={tone}>{text}</Status>
          <Link
            href={href}
            className={buttonVariants({ variant: tone === "success" ? "success" : "default" })}
          >
            <HugeiconsIcon icon={icon} aria-hidden="true" />
            {action}
          </Link>
        </CardContent>
      </Card>
    </li>
  );
}

function describe(task: TeacherTask): {
  icon: typeof Clock01Icon;
  tone: "info" | "warning" | "success";
  text: string;
  action: string;
  href: string;
} {
  switch (task.kind) {
    case "RUNNING":
      return {
        icon: Clock01Icon,
        tone: "info",
        text: `${task.title}: ${task.inProgress} siswa sedang mengerjakan`,
        action: "Pantau",
        href: `/teacher/quizzes/${task.quizId}#pemantauan`,
      };
    case "GRADE":
      return {
        icon: Edit02Icon,
        tone: "warning",
        text: `${task.title}: ${task.essays} jawaban uraian belum dinilai`,
        action: "Nilai sekarang",
        href: `/teacher/quizzes/${task.quizId}#pemantauan`,
      };
    case "RELEASE":
      return {
        icon: CheckmarkCircle02Icon,
        tone: "success",
        text: `${task.title}: semua sudah dinilai, siap dibagikan ke ${task.students} siswa`,
        action: "Rilis hasil",
        href: `/teacher/quizzes/${task.quizId}#hasil`,
      };
    case "OTHER_DEVICE":
      return {
        icon: InformationCircleIcon,
        tone: "info",
        text: `${task.students} siswa masuk dari perangkat lain 7 hari terakhir`,
        action: "Lihat siswa",
        href: "/teacher/students",
      };
    case "REVIEWED_MATERIALS":
      return {
        icon: Book02Icon,
        tone: "info",
        text: `${task.count} materi sudah ditinjau, belum diterbitkan`,
        action: "Lihat materi",
        href: "/teacher/materials?status=REVIEWED",
      };
  }
}
