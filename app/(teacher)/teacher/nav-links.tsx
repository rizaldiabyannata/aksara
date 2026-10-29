"use client";

import {
  BookOpen01Icon,
  File01Icon,
  Home01Icon,
  NoteEditIcon,
  StudentIcon,
  TaskDone01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV: { href: string; label: string; icon: IconSvgElement }[] = [
  { href: "/teacher", label: "Dasbor", icon: Home01Icon },
  { href: "/teacher/classes", label: "Kelas", icon: UserGroupIcon },
  { href: "/teacher/students", label: "Siswa", icon: StudentIcon },
  { href: "/teacher/subjects", label: "Mapel & Bab", icon: BookOpen01Icon },
  { href: "/teacher/materials", label: "Materi", icon: File01Icon },
  { href: "/teacher/questions", label: "Bank Soal", icon: NoteEditIcon },
  { href: "/teacher/quizzes", label: "Ulangan", icon: TaskDone01Icon },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      {NAV.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/teacher" && pathname.startsWith(item.href + "/"));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            // Closes the mobile <details> menu; no-op in the desktop row.
            onClick={(e) => e.currentTarget.closest("details")?.removeAttribute("open")}
            className={`inline-flex min-h-12 items-center gap-2 rounded-4xl px-3 text-base font-medium hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none ${
              active ? "border-b-4 border-primary" : ""
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
