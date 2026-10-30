import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight01Icon,
  Book02Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Edit02Icon,
  InformationCircleIcon,
  Presentation01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Status } from "@/components/status";
import { requireTeacher } from "@/lib/auth/guard";
import { listClasses } from "@/lib/classes";
import { ClassCodeDialog } from "./classes/class-code-dialog";
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
  const [{ tasks, counts }, allClasses] = await Promise.all([getTeacherDashboard(), listClasses()]);
  const classes = allClasses.filter((c) => c.isActive);
  return (
    <section className="flex flex-col gap-6">
      <div className="rounded-2xl border bg-linear-to-r from-primary-soft to-card p-6 shadow-card">
        <PageHeader
          title={`Selamat datang, ${user.displayName}!`}
          description={
            tasks.length === 0
              ? "Tidak ada yang perlu dikerjakan sekarang."
              : `Ada ${tasks.length} hal yang perlu Anda kerjakan hari ini.`
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
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

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="flex flex-col gap-4">
          <h2 className="flex items-center gap-3 text-xl font-bold">
            <span aria-hidden="true" className="h-6 w-1.5 rounded-full bg-accent-decor" />
            Perlu tindakan
          </h2>
          {tasks.length === 0 ? (
            <Status tone="success">Tidak ada yang perlu dikerjakan sekarang.</Status>
          ) : (
            <ul className="flex flex-col gap-4">
              {tasks.map((task) => (
                <TaskItem key={`${task.kind}-${"quizId" in task ? task.quizId : ""}`} task={task} />
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-6 self-start">
          {classes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary-strong">
                    <HugeiconsIcon icon={Presentation01Icon} aria-hidden="true" />
                  </span>
                  Ruang kelas
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {classes.map((c) => (
                  <div key={c.id} className="flex flex-col gap-2 rounded-xl bg-secondary p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold">{c.name}</p>
                      <p className="text-muted-foreground">{c.studentCount} siswa</p>
                    </div>
                    <ClassCodeDialog name={c.name} code={c.code} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Akses cepat</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {QUICK.map(({ href, label, hint, icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex min-h-11 items-center gap-3 rounded-xl bg-secondary p-3 outline-none hover:bg-primary-soft focus-visible:ring-[3px] focus-visible:ring-ring"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <HugeiconsIcon icon={icon} aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-bold">{label}</span>
                    <span className="text-muted-foreground">{hint}</span>
                  </span>
                  <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" className="shrink-0 text-primary-strong" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

const QUICK = [
  { href: "/teacher/quizzes/new", label: "Buat ulangan", hint: "Susun soal dan jadwal ulangan", icon: Clock01Icon },
  { href: "/teacher/materials/new", label: "Tulis materi", hint: "Materi baru untuk siswa", icon: Book02Icon },
  { href: "/teacher/questions/new", label: "Tambah soal", hint: "Pilihan ganda atau uraian", icon: Edit02Icon },
];

const CHIP = {
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
} as const;

function TaskItem({ task }: { task: TeacherTask }) {
  const { icon, tone, label, text, action, href } = describe(task);
  return (
    <li>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 font-bold tracking-wide uppercase ${CHIP[tone]}`}>
            <HugeiconsIcon icon={icon} aria-hidden="true" />
            {label}
          </span>
          <p className="text-lg font-bold">{text}</p>
          {task.kind === "RUNNING" && task.assigned > 0 && (
            <div className="flex flex-col gap-2 rounded-xl bg-secondary p-4">
              <div className="flex justify-between gap-2 font-semibold">
                <span>{task.started} dari {task.assigned} siswa sudah masuk</span>
                <span className="text-primary-strong">{Math.round((task.started / task.assigned) * 100)}%</span>
              </div>
              <div
                role="progressbar"
                aria-label="Siswa yang sudah masuk"
                aria-valuemin={0}
                aria-valuemax={task.assigned}
                aria-valuenow={task.started}
                className="h-3 overflow-hidden rounded-full bg-card"
              >
                <div className="h-full rounded-full bg-accent-decor" style={{ width: `${Math.min(100, (task.started / task.assigned) * 100)}%` }} />
              </div>
            </div>
          )}
          <Link
            href={href}
            className={buttonVariants({ variant: tone === "success" ? "success" : "default" }) + " self-end"}
          >
            {action}
            <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>
    </li>
  );
}

function describe(task: TeacherTask): {
  icon: typeof Clock01Icon;
  tone: "info" | "warning" | "success";
  label: string;
  text: string;
  action: string;
  href: string;
} {
  switch (task.kind) {
    case "RUNNING":
      return {
        icon: Clock01Icon,
        tone: "info",
        label: "Sedang berlangsung",
        text: `${task.title}: ${task.inProgress} siswa sedang mengerjakan`,
        action: "Pantau",
        href: `/teacher/quizzes/${task.quizId}#pemantauan`,
      };
    case "GRADE":
      return {
        icon: Edit02Icon,
        tone: "warning",
        label: "Menunggu penilaian",
        text: `${task.title}: ${task.essays} jawaban uraian belum dinilai`,
        action: "Nilai sekarang",
        href: `/teacher/quizzes/${task.quizId}#pemantauan`,
      };
    case "RELEASE":
      return {
        icon: CheckmarkCircle02Icon,
        tone: "success",
        label: "Siap dibagikan",
        text: `${task.title}: semua sudah dinilai, siap dibagikan ke ${task.students} siswa`,
        action: "Rilis hasil",
        href: `/teacher/quizzes/${task.quizId}#hasil`,
      };
    case "OTHER_DEVICE":
      return {
        icon: InformationCircleIcon,
        tone: "info",
        label: "Perangkat lain",
        text: `${task.students} siswa masuk dari perangkat lain 7 hari terakhir`,
        action: "Lihat siswa",
        href: "/teacher/students",
      };
    case "REVIEWED_MATERIALS":
      return {
        icon: Book02Icon,
        tone: "info",
        label: "Materi",
        text: `${task.count} materi sudah ditinjau, belum diterbitkan`,
        action: "Lihat materi",
        href: "/teacher/materials?status=REVIEWED",
      };
  }
}
