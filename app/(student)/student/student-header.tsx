"use client";

import { BookOpen01Icon, Home01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";

const LINK =
  "inline-flex min-h-12 items-center gap-1 whitespace-nowrap rounded-xl px-3 text-base font-medium focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none";

// No hook here, so the layout's Suspense fallback can render it before the pathname is known (no active link yet).
export function StudentNav({ pathname }: { pathname?: string }) {
  const home = pathname === "/student";
  const materi = !!pathname && (pathname === "/student/materials" || pathname.startsWith("/student/materials/"));
  return (
    // Hidden on the timed quiz page by HideStudentHeader (server-rendered style).
    <header data-student-header className="border-b bg-card">
      <nav aria-label="Menu siswa" className="mx-auto flex max-w-3xl items-center gap-1 px-4 py-2">
        <Link
          href="/student"
          className="mr-auto inline-flex min-h-12 items-center gap-2 whitespace-nowrap rounded-xl px-2 text-xl font-extrabold text-primary-strong focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none max-[420px]:hidden"
        >
          <Image src="/brand/aksara-mark.png" alt="" width={1254} height={1254} className="size-8 object-contain" />
          Aksara
        </Link>
        <Link
          href="/student"
          aria-current={home ? "page" : undefined}
          className={`${LINK} ${home ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
        >
          <HugeiconsIcon icon={Home01Icon} aria-hidden="true" className="size-5" />
          Beranda
        </Link>
        <Link
          href="/student/materials"
          aria-current={materi ? "page" : undefined}
          className={`${LINK} ${materi ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
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
