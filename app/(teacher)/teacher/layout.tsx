import { Suspense } from "react";
import { Menu01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { LogoutButton } from "@/components/logout-button";
import { NavItems, NavLinks } from "./nav-links";

function Wordmark() {
  return (
    <div className="leading-tight">
      <p className="text-xl font-extrabold text-primary-strong">Aksara</p>
      <p className="text-base text-muted-foreground">SD/MI Kelas VI</p>
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

// Static shell only: pages guard themselves inside <Suspense>.
export default function TeacherLayout({ children }: LayoutProps<"/teacher">) {
  return (
    <div className="flex flex-1 flex-col md:flex-row md:gap-6 md:p-4">
      <aside className="sticky top-4 hidden h-[calc(100dvh-2rem)] w-72 shrink-0 flex-col rounded-2xl bg-card p-4 shadow-card md:flex">
        <div className="px-3 py-2">
          <Wordmark />
        </div>
        <nav aria-label="Menu guru" className="mt-4 flex flex-1 flex-col gap-1 overflow-y-auto">
          <Links />
        </nav>
        <div className="flex flex-col gap-1 border-t pt-3">
          <Links bottom />
          <div className="px-3 pt-2">
            <LogoutButton />
          </div>
        </div>
      </aside>
      <header className="border-b bg-card md:hidden">
        <div className="flex items-center gap-3 px-4 py-2">
          <Wordmark />
          <details className="relative ml-auto">
            <summary className="inline-flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-xl px-3 text-base font-medium hover:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              <HugeiconsIcon icon={Menu01Icon} aria-hidden="true" className="size-5" />
              Menu
            </summary>
            <nav
              aria-label="Menu guru"
              className="absolute right-0 top-full z-10 mt-1 flex w-64 flex-col gap-1 rounded-xl border bg-card p-2 shadow-card"
            >
              <Links />
              <Links bottom />
              <div className="px-3 pt-2">
                <LogoutButton />
              </div>
            </nav>
          </details>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col gap-4 p-4 md:p-0">
        {children}
      </main>
    </div>
  );
}
