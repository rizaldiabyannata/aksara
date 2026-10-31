import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { Calendar03Icon, Logout01Icon, Notification01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { logoutAction } from "@/app/(auth)/actions";
import { requireTeacher } from "@/lib/auth/guard";
import { getTeacherDashboard } from "@/lib/dashboard";
import { schoolTerm } from "@/lib/school-term";
import { taskLine } from "@/lib/task-text";
import { BottomNav, BottomNavItems, NavItems, NavLinks } from "./nav-links";

function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-space-sm">
      <Image src="/brand/aksara-mark.png" alt="" width={1254} height={1254} className="size-10 shrink-0 object-contain" />
      <div className="flex min-w-0 flex-col">
        <span className="font-headline-md text-headline-md text-primary-strong tracking-tight leading-none">Aksara</span>
        <span className="font-label-sm text-label-sm text-on-surface-variant">{compact ? "SD VI" : "SD/MI Kelas VI"}</span>
      </div>
    </div>
  );
}

function Links({ bottom }: { bottom?: boolean }) {
  return (
    <Suspense fallback={<NavItems bottom={bottom} />}>
      <NavLinks bottom={bottom} />
    </Suspense>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// The layout also wraps /teacher/password, so its guards must allow a pending password change
// (a plain requireTeacher() here redirects /teacher/password to itself forever).
async function Profile({ compact }: { compact?: boolean }) {
  const user = await requireTeacher({ allowPasswordChange: true });
  const size = compact ? "size-8" : "size-11";
  const avatar = user.avatarImageId ? (
    // eslint-disable-next-line @next/next/no-img-element -- presigned redirect; alt is the profile label
    <img src={`/api/images/${user.avatarImageId}`} alt={`Foto profil ${user.displayName}`} className={`${size} shrink-0 rounded-full object-cover ring-2 ring-primary-container`} />
  ) : (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-primary-strong text-on-primary font-label-md text-label-md ring-2 ring-primary-container ${size}`}
    >
      {initials(user.displayName)}
    </span>
  );
  if (compact) {
    return (
      <div className="flex items-center">
        <Link href="/teacher/search" aria-label="Cari" className={ICON_BTN}>
          <HugeiconsIcon icon={Search01Icon} aria-hidden="true" className="size-6" />
        </Link>
        <Suspense fallback={null}>
          <Bell compact />
        </Suspense>
        <div className="flex min-h-12 min-w-12 items-center justify-center" aria-label={`Profil: ${user.displayName}`} role="img">
          {avatar}
        </div>
      </div>
    );
  }
  // After the session read, so `new Date()` is request-time, not prerendered.
  return (
    <div className="flex items-center gap-space-lg">
      <Today />
      <Suspense fallback={null}>
        <Bell />
      </Suspense>
      <div className="flex items-center gap-space-md pl-space-sm">
        {avatar}
        <div className="flex flex-col text-left">
          <span className="font-label-md text-label-md text-on-surface leading-tight">{user.displayName}</span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">Guru</span>
        </div>
      </div>
    </div>
  );
}

const ICON_BTN = "relative min-h-12 w-12 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-canvas-peach-subtle focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none list-none [&::-webkit-details-marker]:hidden cursor-pointer";

function Today() {
  const now = new Date();
  const today = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Makassar" }).format(now);
  return (
    <div className="flex items-center gap-space-sm">
      <p className="flex items-center gap-space-xs px-space-md py-space-sm rounded-full bg-canvas-peach-subtle text-on-primary-container font-label-sm text-label-sm">
        <HugeiconsIcon icon={Calendar03Icon} aria-hidden="true" className="size-[18px] text-primary-strong" />
        {today}
      </p>
      <p className="px-space-md py-space-sm rounded-full bg-canvas-peach-subtle text-on-primary-container font-label-sm text-label-sm">{schoolTerm(now).label}</p>
    </div>
  );
}

// Notifications are the dashboard's "Perlu tindakan" tasks; nothing is stored, so no read state.
async function Bell({ compact }: { compact?: boolean }) {
  const user = await requireTeacher({ allowPasswordChange: true });
  if (user.mustChangePassword) return null;
  const { tasks } = await getTeacherDashboard();
  return (
    <details className="relative">
      <summary aria-label={`Notifikasi, ${tasks.length}`} className={ICON_BTN}>
        <HugeiconsIcon icon={Notification01Icon} aria-hidden="true" className="size-6" />
        {tasks.length > 0 && (
          <span aria-hidden="true" className="absolute top-1.5 right-1 min-w-5 h-5 px-1 rounded-full bg-primary-strong text-on-primary font-label-sm text-[12px] leading-5 text-center ring-2 ring-surface-card">
            {tasks.length}
          </span>
        )}
      </summary>
      <div className={`${compact ? "fixed inset-x-4 top-[4.5rem]" : "absolute right-0 top-full mt-space-sm w-96"} z-50 max-h-[70vh] overflow-y-auto rounded-xl bg-surface-card p-space-sm shadow-[0_12px_32px_-4px_rgba(230,115,60,0.18),0_4px_12px_-2px_rgba(0,0,0,0.08)]`}>
        <p className="px-space-md py-space-sm font-label-md text-label-md text-text-primary">Perlu tindakan</p>
        {tasks.length === 0 ? (
          <p className="px-space-md pb-space-md font-body-md text-body-md text-on-surface-variant">Tidak ada yang perlu dikerjakan sekarang.</p>
        ) : (
          <ul>
            {tasks.map((t, i) => {
              const { text, href } = taskLine(t);
              return (
                <li key={i}>
                  <Link href={href} className="min-h-12 flex items-center px-space-md py-space-sm rounded-lg font-body-md text-body-md text-text-primary hover:bg-canvas-peach focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none">
                    {text}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </details>
  );
}

// Static shell; the profile and every page guard themselves inside <Suspense>.
export default function TeacherLayout({ children }: LayoutProps<"/teacher">) {
  return (
    <div className="flex flex-1 flex-col bg-canvas-peach">
      <aside className="fixed left-4 top-4 bottom-4 w-72 bg-surface-card rounded-xl shadow-[0_12px_32px_-4px_rgba(230,115,60,0.12),0_4px_12px_-2px_rgba(0,0,0,0.05)] z-50 hidden lg:flex flex-col overflow-hidden">
        <div className="p-space-lg bg-surface-card">
          <Logo />
        </div>
        <div className="px-space-md py-space-xs">
          <div className="bg-canvas-peach rounded-lg px-space-md py-space-sm flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Ruang Guru</span>
            <span className="px-space-sm py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm">Kelas 6</span>
          </div>
        </div>
        <nav aria-label="Menu guru" className="flex-1 px-space-md py-space-sm flex flex-col gap-space-xs overflow-y-auto">
          <Links />
        </nav>
        <div className="p-space-md bg-surface-card flex flex-col gap-space-xs">
          <Links bottom />
          <form action={logoutAction}>
            <button
              type="submit"
              className="min-h-12 w-full flex items-center px-space-md rounded-xl text-tone-danger hover:bg-tone-danger-bg font-label-md text-label-md transition-all focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
            >
              <HugeiconsIcon icon={Logout01Icon} aria-hidden="true" className="mr-space-md size-[22px]" />
              Keluar
            </button>
          </form>
        </div>
      </aside>

      <header className="fixed top-4 left-80 right-6 h-20 bg-surface-card/95 backdrop-blur-xl rounded-xl shadow-[0_4px_20px_-2px_rgba(230,115,60,0.07),0_2px_6px_-1px_rgba(0,0,0,0.03)] z-40 px-space-lg hidden lg:flex items-center justify-between gap-space-lg">
        <form action="/teacher/search" method="get" role="search" className="flex-1 max-w-lg">
          <label htmlFor="cari-global" className="sr-only">Cari kelas, siswa, materi, soal, atau ulangan</label>
          <div className="w-full flex items-center bg-canvas-peach rounded-xl px-space-md py-space-sm text-on-surface-variant focus-within:ring-2 focus-within:ring-primary-container">
            <HugeiconsIcon icon={Search01Icon} aria-hidden="true" className="mr-space-sm size-[22px]" />
            <input id="cari-global" name="q" type="search" placeholder="Cari materi, siswa, atau ulangan..." className="w-full min-h-11 bg-transparent border-0 outline-none rounded-md focus-visible:ring-[3px] focus-visible:ring-ring text-on-surface font-body-md text-body-md placeholder:text-on-surface-variant" />
          </div>
        </form>
        <Suspense fallback={null}>
          <Profile />
        </Suspense>
      </header>

      <header className="fixed top-0 inset-x-0 z-50 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(230,115,60,0.06)] lg:hidden">
        <div className="h-16 px-gutter-mobile flex items-center justify-between gap-space-sm">
          <Logo compact />
          <Suspense fallback={null}>
            <Profile compact />
          </Suspense>
        </div>
      </header>

      <main className="flex w-full min-w-0 flex-1 flex-col pt-16 pb-28 lg:pt-24 lg:pr-6 lg:pb-space-2xl lg:pl-80">
        {children}
      </main>

      <Suspense fallback={<BottomNavItems />}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
