import { Suspense } from "react";
import { Calendar03Icon, Logout01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { logoutAction } from "@/app/(auth)/actions";
import { requireTeacher } from "@/lib/auth/guard";
import { BottomNav, BottomNavItems, NavItems, NavLinks } from "./nav-links";

function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-space-sm">
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary font-headline-md text-headline-md shadow-[0_2px_8px_rgba(255,112,52,0.25)]"
      >
        A
      </span>
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

async function Profile({ compact }: { compact?: boolean }) {
  const user = await requireTeacher();
  const avatar = (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-primary-strong text-on-primary font-label-md text-label-md ring-2 ring-primary-container ${compact ? "size-8" : "size-11"}`}
    >
      {initials(user.displayName)}
    </span>
  );
  if (compact) {
    return (
      <div className="flex min-h-12 min-w-12 items-center justify-center" aria-label={`Profil: ${user.displayName}`} role="img">
        {avatar}
      </div>
    );
  }
  // After the session read, so `new Date()` is request-time, not prerendered.
  return (
    <div className="flex items-center gap-space-lg">
      <Today />
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

function Today() {
  const today = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Makassar" }).format(new Date());
  return (
    <p className="flex items-center gap-space-xs px-space-md py-space-sm rounded-full bg-canvas-peach-subtle text-on-primary-container font-label-sm text-label-sm">
      <HugeiconsIcon icon={Calendar03Icon} aria-hidden="true" className="size-[18px] text-primary-strong" />
      {today}
    </p>
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

      <header className="fixed top-4 left-80 right-6 h-20 bg-surface-card/95 backdrop-blur-xl rounded-xl shadow-[0_4px_20px_-2px_rgba(230,115,60,0.07),0_2px_6px_-1px_rgba(0,0,0,0.03)] z-40 px-space-lg hidden lg:flex items-center justify-end">
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

      <main className="flex w-full min-w-0 flex-1 flex-col pt-16 pb-28 lg:pt-20 lg:pr-6 lg:pb-space-2xl lg:pl-80">
        {children}
      </main>

      <Suspense fallback={<BottomNavItems />}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
