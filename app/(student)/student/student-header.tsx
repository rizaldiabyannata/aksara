"use client";

import { BookOpen01Icon, Home01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";

const LINK =
  "inline-flex min-h-12 items-center gap-1 whitespace-nowrap rounded-4xl px-2 text-base font-medium hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none";

// No hook here, so the layout's Suspense fallback can render it before the pathname is known (no active link yet).
export function StudentNav({ pathname }: { pathname?: string }) {
  const home = pathname === "/student";
  const materi = !!pathname && (pathname === "/student/materials" || pathname.startsWith("/student/materials/"));
  return (
    // Hidden on the timed quiz page by HideStudentHeader (server-rendered style).
    <header data-student-header className="border-b">
      <nav aria-label="Menu siswa" className="mx-auto flex max-w-3xl items-center gap-1 px-4 py-2">
        <Link
          href="/student"
          className="mr-auto inline-flex min-h-12 items-center whitespace-nowrap rounded-4xl px-2 text-lg font-semibold focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none max-[420px]:hidden"
        >
          Aksara
        </Link>
        <Link
          href="/student"
          aria-current={home ? "page" : undefined}
          className={`${LINK} ${home ? "border-b-4 border-primary" : ""}`}
        >
          <HugeiconsIcon icon={Home01Icon} aria-hidden="true" className="size-5" />
          Beranda
        </Link>
        <Link
          href="/student/materials"
          aria-current={materi ? "page" : undefined}
          className={`${LINK} ${materi ? "border-b-4 border-primary" : ""}`}
        >
          <HugeiconsIcon icon={BookOpen01Icon} aria-hidden="true" className="size-5" />
          Materi
        </Link>
        <LogoutButton />
      </nav>
    </header>
  );
}

export function StudentHeader() {
  return <StudentNav pathname={usePathname()} />;
}
