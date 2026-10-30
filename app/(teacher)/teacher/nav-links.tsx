"use client";

import {
  BookOpen01Icon,
  Logout01Icon,
  MoreHorizontalCircle01Icon,
  File01Icon,
  Key01Icon,
  Home01Icon,
  NoteEditIcon,
  StudentIcon,
  TaskDone01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/(auth)/actions";

const NAV: { href: string; label: string; icon: IconSvgElement }[] = [
  { href: "/teacher", label: "Dasbor", icon: Home01Icon },
  { href: "/teacher/classes", label: "Kelas", icon: UserGroupIcon },
  { href: "/teacher/students", label: "Siswa", icon: StudentIcon },
  { href: "/teacher/subjects", label: "Mapel & Bab", icon: BookOpen01Icon },
  { href: "/teacher/materials", label: "Materi", icon: File01Icon },
  { href: "/teacher/questions", label: "Bank Soal", icon: NoteEditIcon },
  { href: "/teacher/quizzes", label: "Ulangan", icon: TaskDone01Icon },
];

const BOTTOM = [{ href: "/teacher/password", label: "Ganti Sandi", icon: Key01Icon }];

// No hook, so the layout's Suspense fallback can render it before the pathname is known (no active link yet).
export function NavItems({ pathname = "", bottom = false }: { pathname?: string; bottom?: boolean }) {
  return (
    <>
      {(bottom ? BOTTOM : NAV).map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-12 items-center gap-3 rounded-xl px-4 text-base focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none ${
              active
                ? "bg-primary font-bold text-primary-foreground shadow-[0_4px_12px_rgba(234,88,12,0.25)]"
                : "font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <HugeiconsIcon icon={item.icon} aria-hidden="true" className="size-5" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function NavLinks({ bottom }: { bottom?: boolean }) {
  return <NavItems pathname={usePathname()} bottom={bottom} />;
}

const isActive = (pathname: string, href: string) =>
  pathname === href || (href !== "/teacher" && pathname.startsWith(href + "/"));

// Phones: the four daily destinations, the rest behind "Lainnya".
const TABS = [NAV[0], NAV[1], NAV[5], NAV[6]];
const MORE = [NAV[2], NAV[3], NAV[4], ...BOTTOM];

const tab = "flex min-h-12 min-w-16 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-sm focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none";

export function BottomNav() {
  return <BottomNavItems pathname={usePathname()} />;
}

export function BottomNavItems({ pathname = "" }: { pathname?: string }) {
  const moreActive = MORE.some((i) => isActive(pathname, i.href));
  return (
    <nav
      aria-label="Menu guru"
      className="fixed inset-x-0 bottom-0 z-40 bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(230,115,60,0.08)] backdrop-blur-xl lg:hidden"
    >
      <div className="flex h-20 items-center justify-around px-1">
        {TABS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`${tab} ${active ? "font-bold text-primary-strong" : "font-semibold text-muted-foreground"}`}
            >
              <HugeiconsIcon icon={item.icon} aria-hidden="true" className="size-6" />
              {item.label}
            </Link>
          );
        })}
        <details className="relative">
          <summary
            className={`${tab} cursor-pointer list-none [&::-webkit-details-marker]:hidden ${moreActive ? "font-bold text-primary-strong" : "font-semibold text-muted-foreground"}`}
          >
            <HugeiconsIcon icon={MoreHorizontalCircle01Icon} aria-hidden="true" className="size-6" />
            Lainnya
          </summary>
          <div className="absolute right-0 bottom-full mb-3 flex w-60 flex-col gap-1 rounded-2xl bg-card p-2 shadow-raised">
            {MORE.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={(e) => e.currentTarget.closest("details")?.removeAttribute("open")}
                  className={`flex min-h-12 items-center gap-3 rounded-xl px-4 text-base focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none ${
                    active ? "bg-primary font-bold text-primary-foreground" : "font-semibold hover:bg-secondary"
                  }`}
                >
                  <HugeiconsIcon icon={item.icon} aria-hidden="true" className="size-5" />
                  {item.label}
                </Link>
              );
            })}
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
        </details>
      </div>
    </nav>
  );
}
