import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

const NAV = [
  { href: "/teacher", label: "Dasbor" },
  { href: "/teacher/classes", label: "Kelas" },
  { href: "/teacher/students", label: "Siswa" },
  { href: "/teacher/subjects", label: "Mapel & Bab" },
  { href: "/teacher/materials", label: "Materi" },
] as const;

// Static shell only: pages guard themselves inside <Suspense>.
export default function TeacherLayout({ children }: LayoutProps<"/teacher">) {
  return (
    <>
      <header className="border-b">
        <nav
          aria-label="Menu guru"
          className="mx-auto flex max-w-5xl flex-wrap items-center gap-1 px-4 py-2"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-h-11 items-center rounded-4xl px-3 text-sm font-medium hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {item.label}
            </Link>
          ))}
          <div className="ml-auto">
            <LogoutButton />
          </div>
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4">{children}</main>
    </>
  );
}
