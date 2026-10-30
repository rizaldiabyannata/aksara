import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight01Icon,
  Book02Icon,
  CheckmarkCircle02Icon,
  Edit02Icon,
  FileAddIcon,
  FlashIcon,
  InformationCircleIcon,
  Megaphone01Icon,
  Presentation01Icon,
  RadioIcon,
  SentIcon,
  TaskAdd01Icon,
  UserGroupIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { requireTeacher } from "@/lib/auth/guard";
import { listClasses } from "@/lib/classes";
import { getTeacherDashboard, type TeacherTask } from "@/lib/dashboard";
import { ClassCodeDialog } from "./classes/class-code-dialog";

export const metadata: Metadata = { title: "Dasbor Guru" };

export default function TeacherDashboardPage() {
  return (
    <Suspense fallback={<p>Memuat…</p>}>
      <Dashboard />
    </Suspense>
  );
}

const Icon = ({ icon, className }: { icon: IconSvgElement; className: string }) => (
  <HugeiconsIcon icon={icon} aria-hidden="true" className={className} />
);

async function Dashboard() {
  const user = await requireTeacher();
  const [{ tasks, counts }, allClasses] = await Promise.all([getTeacherDashboard(), listClasses()]);
  const classes = allClasses.filter((c) => c.isActive);
  return (
    <div className="p-space-lg max-w-[1360px] mx-auto w-full flex flex-col gap-space-lg">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-canvas-peach-subtle via-tertiary-fixed to-canvas-peach p-space-lg shadow-sm flex flex-col md:flex-row items-center justify-between gap-space-md">
        <div className="flex flex-col gap-space-xs z-10 max-w-2xl">
          <h1 className="font-headline-lg text-headline-lg text-text-primary tracking-tight">
            Selamat datang, {user.displayName}!
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
            {tasks.length === 0 ? (
              "Tidak ada yang perlu dikerjakan sekarang."
            ) : (
              <>
                Ada <span className="font-semibold text-primary-strong">{tasks.length} hal</span> yang perlu Anda kerjakan hari ini.
              </>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        <Metric label="Koleksi Pembelajaran" value={counts.materialsPublished} valueClass="text-tone-info" title="Materi Terbit Aktif" sub="Materi untuk siswa" icon={Book02Icon} boxClass="bg-tone-info-bg text-tone-info" />
        <Metric label="Perbendaharaan Soal" value={counts.questionsActive} valueClass="text-primary-container" title="Soal Siap Pakai" sub="Pilihan ganda & uraian" icon={Edit02Icon} boxClass="bg-canvas-peach-subtle text-primary-strong" />
        <Metric label="Daftar Siswa" value={counts.activeStudents} valueClass="text-tone-success" title="Siswa Aktif" sub="Semua kelas" icon={UserGroupIcon} boxClass="bg-tone-success-bg text-tone-success" />
      </div>

      {counts.activeStudents === 0 && (
        <div className="bg-surface-card rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-sm">
          <h2 className="font-headline-sm text-headline-sm text-text-primary">Mulai dari sini</h2>
          <ol className="flex list-decimal flex-col gap-space-sm pl-6 font-body-md text-body-md">
            <li><Link href="/teacher/classes" className="inline-flex min-h-11 items-center underline underline-offset-4">Buat kelas</Link></li>
            <li><Link href="/teacher/students" className="inline-flex min-h-11 items-center underline underline-offset-4">Tambah siswa</Link></li>
            <li><Link href="/teacher/materials" className="inline-flex min-h-11 items-center underline underline-offset-4">Tulis materi</Link></li>
          </ol>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        <div className="lg:col-span-8 flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <span aria-hidden="true" className="w-2.5 h-6 rounded-full bg-primary-container" />
              <h2 className="font-headline-md text-headline-md text-text-primary tracking-tight">Perlu tindakan</h2>
            </div>
            {tasks.length > 0 && (
              <span className="px-space-md py-1 rounded-full bg-canvas-peach-subtle text-on-primary-container font-label-sm text-label-sm font-semibold">
                {tasks.length} agenda
              </span>
            )}
          </div>
          {tasks.length === 0 ? (
            <div className="bg-surface-card rounded-2xl p-space-lg shadow-sm flex items-center gap-space-sm text-tone-success">
              <Icon icon={CheckmarkCircle02Icon} className="size-6" />
              <p className="font-label-lg text-label-lg">Tidak ada yang perlu dikerjakan sekarang.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-space-md">
              {tasks.map((task) => (
                <TaskItem key={`${task.kind}-${"quizId" in task ? task.quizId : ""}`} task={task} />
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-4 flex flex-col gap-space-lg">
          {classes.length > 0 && (
            <div className="bg-surface-card rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-xl bg-canvas-peach-subtle text-primary-strong flex items-center justify-center">
                  <Icon icon={Presentation01Icon} className="size-6" />
                </div>
                <div className="flex flex-col">
                  <h2 className="font-label-md text-label-md text-text-primary font-bold">Ruang Kelas</h2>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Kode kelas untuk siswa</span>
                </div>
              </div>
              {classes.map((c) => (
                <div key={c.id} className="flex flex-col gap-space-xs bg-canvas-peach rounded-2xl p-space-md items-center text-center">
                  <span className="font-label-md text-label-md text-text-primary font-bold">{c.name}</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant mb-1">{c.studentCount} siswa</span>
                  <ClassCodeDialog name={c.name} code={c.code} />
                </div>
              ))}
            </div>
          )}

          <div className="bg-surface-card rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-sm text-headline-sm text-text-primary">Akses cepat</h2>
              <Icon icon={FlashIcon} className="size-[22px] text-text-muted" />
            </div>
            <div className="flex flex-col gap-space-sm">
              {QUICK.map(({ href, label, hint, icon, bg, text }) => (
                <Link
                  key={href}
                  href={href}
                  className="min-h-14 p-space-md rounded-2xl bg-canvas-peach hover:bg-canvas-peach-subtle flex items-center justify-between transition-all group focus-visible:ring-[3px] focus-visible:ring-ring outline-none"
                >
                  <div className="flex items-center gap-space-md">
                    <div className={`w-12 h-12 rounded-xl ${bg} text-on-primary flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <Icon icon={icon} className="size-[26px]" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className={`font-label-md text-label-md text-text-primary font-bold transition-colors ${text}`}>{label}</span>
                      <span className="font-label-sm text-label-sm text-text-muted">{hint}</span>
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-surface-card flex items-center justify-center text-primary-strong group-hover:translate-x-1 transition-all">
                    <Icon icon={ArrowRight01Icon} className="size-5" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, valueClass, title, sub, icon, boxClass }: {
  label: string; value: number; valueClass: string; title: string; sub: string; icon: IconSvgElement; boxClass: string;
}) {
  return (
    <div className="bg-surface-card rounded-2xl p-space-lg shadow-sm flex items-center justify-between transition-all hover:shadow-md">
      <div className="flex flex-col gap-1">
        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">{label}</span>
        <span className={`font-headline-xl text-headline-xl font-bold ${valueClass}`}>{value}</span>
        <span className="font-label-md text-label-md text-text-primary font-semibold">{title}</span>
        <span className="font-body-md text-body-md text-text-muted">{sub}</span>
      </div>
      <div className={`w-16 h-16 rounded-2xl ${boxClass} flex items-center justify-center flex-shrink-0`}>
        <Icon icon={icon} className="size-9" />
      </div>
    </div>
  );
}

const QUICK = [
  { href: "/teacher/quizzes/new", label: "Buat ulangan", hint: "Susun soal dan jadwal ulangan", icon: TaskAdd01Icon, bg: "bg-primary-strong", text: "group-hover:text-primary-strong" },
  { href: "/teacher/materials/new", label: "Tulis materi", hint: "Materi baru untuk siswa", icon: FileAddIcon, bg: "bg-tone-info", text: "group-hover:text-tone-info" },
  { href: "/teacher/questions/new", label: "Tambah soal", hint: "Pilihan ganda atau uraian", icon: Edit02Icon, bg: "bg-tertiary", text: "group-hover:text-tertiary" },
];

function TaskItem({ task }: { task: TeacherTask }) {
  const { icon, label, chip, text, action, href, actionClass, ActionIcon, actionIcon } = describe(task);
  return (
    <li className="bg-surface-card rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md transition-all hover:shadow-md">
      <div className="flex items-center gap-space-sm">
        {task.kind === "RUNNING" && (
          <span aria-hidden="true" className="flex h-3.5 w-3.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tone-warning opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-tone-warning" />
          </span>
        )}
        <span className={`px-space-sm py-0.5 rounded-full font-label-sm text-label-sm font-bold flex items-center gap-1 uppercase ${chip}`}>
          <Icon icon={icon} className="size-4" />
          {label}
        </span>
      </div>
      <h3 className="font-headline-sm text-headline-sm text-text-primary">{text}</h3>
      {task.kind === "RUNNING" && task.assigned > 0 && (
        <div className="flex flex-col gap-space-xs bg-canvas-peach/60 p-space-md rounded-xl">
          <div className="flex justify-between items-center font-label-sm text-label-sm">
            <span className="text-text-primary font-semibold flex items-center gap-1">
              <Icon icon={UserGroupIcon} className="size-[18px] text-primary-strong" /> {task.started} siswa telah masuk
            </span>
            <span className="text-primary-strong font-bold">{Math.round((task.started / task.assigned) * 100)}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Siswa yang sudah masuk"
            aria-valuemin={0}
            aria-valuemax={task.assigned}
            aria-valuenow={task.started}
            className="w-full bg-surface-container-high rounded-full h-3.5 overflow-hidden"
          >
            <div className="bg-primary-container h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (task.started / task.assigned) * 100)}%` }} />
          </div>
          <div className="font-label-sm text-label-sm text-on-surface-variant pt-1">
            Dari {task.assigned} siswa di kelas yang ditugaskan
          </div>
        </div>
      )}
      <div className="flex items-center justify-end pt-space-xs">
        <Link
          href={href}
          className={`min-h-12 px-space-lg rounded-xl font-label-lg text-label-lg inline-flex items-center justify-center gap-space-sm transition-all focus-visible:ring-[3px] focus-visible:ring-ring outline-none ${actionClass}`}
        >
          <Icon icon={ActionIcon} className="size-[22px]" />
          {action}
          <Icon icon={actionIcon} className="size-5" />
        </Link>
      </div>
    </li>
  );
}

const PRIMARY_BTN = "bg-primary-container text-on-primary shadow-sm hover:opacity-95";
const SOFT_BTN = "bg-canvas-peach text-primary-strong hover:bg-canvas-peach-subtle";
const SUCCESS_BTN = "bg-tone-success text-on-primary shadow-sm hover:opacity-95";
const CHIPS = {
  warning: "bg-tone-warning-bg text-tone-warning",
  peach: "bg-canvas-peach-subtle text-primary-strong",
  success: "bg-tone-success-bg text-tone-success",
  info: "bg-tone-info-bg text-tone-info",
};

function describe(task: TeacherTask) {
  switch (task.kind) {
    case "RUNNING":
      return {
        icon: RadioIcon, chip: CHIPS.warning, label: "Sedang berlangsung",
        text: `${task.title}: ${task.inProgress} siswa sedang mengerjakan`,
        action: "Pantau", href: `/teacher/quizzes/${task.quizId}#pemantauan`,
        actionClass: PRIMARY_BTN, ActionIcon: ViewIcon, actionIcon: ArrowRight01Icon,
      };
    case "GRADE":
      return {
        icon: Edit02Icon, chip: CHIPS.peach, label: "Menunggu penilaian",
        text: `${task.title}: ${task.essays} jawaban uraian belum dinilai`,
        action: "Nilai sekarang", href: `/teacher/quizzes/${task.quizId}#pemantauan`,
        actionClass: SOFT_BTN, ActionIcon: Edit02Icon, actionIcon: ArrowRight01Icon,
      };
    case "RELEASE":
      return {
        icon: CheckmarkCircle02Icon, chip: CHIPS.success, label: "Lengkap & siap dibagikan",
        text: `${task.title}: semua sudah dinilai, siap dibagikan ke ${task.students} siswa`,
        action: "Rilis hasil", href: `/teacher/quizzes/${task.quizId}#hasil`,
        actionClass: SUCCESS_BTN, ActionIcon: Megaphone01Icon, actionIcon: SentIcon,
      };
    case "OTHER_DEVICE":
      return {
        icon: InformationCircleIcon, chip: CHIPS.info, label: "Perangkat lain",
        text: `${task.students} siswa masuk dari perangkat lain 7 hari terakhir`,
        action: "Lihat siswa", href: "/teacher/students",
        actionClass: SOFT_BTN, ActionIcon: UserGroupIcon, actionIcon: ArrowRight01Icon,
      };
    case "REVIEWED_MATERIALS":
      return {
        icon: Book02Icon, chip: CHIPS.info, label: "Materi",
        text: `${task.count} materi sudah ditinjau, belum diterbitkan`,
        action: "Lihat materi", href: "/teacher/materials?status=REVIEWED",
        actionClass: SOFT_BTN, ActionIcon: Book02Icon, actionIcon: ArrowRight01Icon,
      };
  }
}
