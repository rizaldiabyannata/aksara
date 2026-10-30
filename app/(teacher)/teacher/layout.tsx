import { Suspense } from "react";
import { Calendar03Icon, Logout01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { logoutAction } from "@/app/(auth)/actions";
import { requireTeacher } from "@/lib/auth/guard";
import { BottomNav, BottomNavItems, NavItems, NavLinks } from "./nav-links";

function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-xl font-extrabold text-primary-foreground shadow-[0_2px_8px_rgba(234,88,12,0.25)]"
      >
        A
      </span>
      <div className="min-w-0 leading-tight">
        <p className="text-xl font-extrabold tracking-tight text-primary-strong">Aksara</p>
        {!compact && <p className="text-sm text-muted-foreground">SD/MI Kelas VI</p>}
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
  const profile = (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-strong text-base font-bold text-primary-foreground ring-2 ring-primary-soft"
      >
        {initials(user.displayName)}
      </span>
      <div className={compact ? "sr-only" : "leading-tight"}>
        <p className="font-semibold">{user.displayName}</p>
        <p className="text-sm text-muted-foreground">Guru</p>
      </div>
    </div>
  );
  if (compact) return profile;
  // After the session read, so `new Date()` is request-time, not prerendered.
  return (
    <>
      <Today />
      {profile}
    </>
  );
}

function Today() {
  const today = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Makassar" }).format(new Date());
  return (
    <p className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2 font-semibold text-secondary-foreground">
      <HugeiconsIcon icon={Calendar03Icon} aria-hidden="true" className="size-5 text-primary-strong" />
      {today}
    </p>
  );
}

// Static shell; the profile and every page guard themselves inside <Suspense>.
export default function TeacherLayout({ children }: LayoutProps<"/teacher">) {
  return (
    <div className="flex flex-1 flex-col">
      <aside className="fixed top-4 bottom-4 left-4 z-40 hidden w-72 flex-col overflow-hidden rounded-2xl bg-card shadow-raised lg:flex">
        <div className="p-6 pb-4">
          <Logo />
        </div>
        <div className="px-4">
          <p className="flex items-center justify-between rounded-xl bg-background px-4 py-2 text-sm font-semibold text-muted-foreground">
            Ruang Guru
            <span className="rounded-full bg-primary-soft px-3 py-0.5 text-foreground">Kelas 6</span>
          </p>
        </div>
        <nav aria-label="Menu guru" className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-3">
          <Links />
        </nav>
        <div className="flex flex-col gap-1 p-4">
          <Links bottom />
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-base font-semibold text-destructive hover:bg-destructive-soft focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
            >
              <HugeiconsIcon icon={Logout01Icon} aria-hidden="true" className="size-5" />
              Keluar
            </button>
          </form>
        </div>
      </aside>

      <header className="fixed top-4 right-6 left-80 z-30 hidden h-20 items-center justify-between rounded-2xl bg-card/95 px-6 shadow-card backdrop-blur-xl lg:flex">
        <Suspense fallback={null}>
          <Profile />
        </Suspense>
      </header>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-card/90 px-4 shadow-[0_1px_8px_rgba(230,115,60,0.08)] backdrop-blur-xl lg:hidden">
        <Logo compact />
        <Suspense fallback={null}>
          <Profile compact />
        </Suspense>
      </header>

      <main className="mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col gap-6 px-4 pt-4 pb-28 lg:pt-28 lg:pr-6 lg:pb-12 lg:pl-80">
        {children}
      </main>

      <Suspense fallback={<BottomNavItems />}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
