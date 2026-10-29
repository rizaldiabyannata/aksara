import { Menu01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { LogoutButton } from "@/components/logout-button";
import { NavLinks } from "./nav-links";

// Static shell only: pages guard themselves inside <Suspense>.
export default function TeacherLayout({ children }: LayoutProps<"/teacher">) {
  return (
    <>
      <header className="border-b">
        <nav
          aria-label="Menu guru"
          className="mx-auto flex max-w-5xl flex-wrap items-center gap-1 px-4 py-2"
        >
          <div className="hidden flex-wrap items-center gap-1 md:flex">
            <NavLinks />
          </div>
          <details className="relative md:hidden">
            <summary className="inline-flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-4xl px-3 text-base font-medium hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              <HugeiconsIcon icon={Menu01Icon} aria-hidden="true" className="size-5" />
              Menu
            </summary>
            <div className="absolute left-0 top-full z-10 mt-1 flex w-56 flex-col rounded-xl border bg-background p-2 shadow-md">
              <NavLinks />
            </div>
          </details>
          <div className="ml-auto">
            <LogoutButton />
          </div>
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4">{children}</main>
    </>
  );
}
