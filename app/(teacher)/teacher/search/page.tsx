import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireTeacher } from "@/lib/auth/guard";
import { searchAll } from "@/lib/search";

export const metadata: Metadata = { title: "Pencarian" };

type Params = Promise<Record<string, string | string[] | undefined>>;

export default function SearchPage({ searchParams }: { searchParams: Params }) {
  return (
    <div className="p-space-lg max-w-[1360px] mx-auto w-full flex flex-col gap-space-lg">
      <Suspense fallback={<p>Memuat…</p>}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({ searchParams }: { searchParams: Params }) {
  await requireTeacher();
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() ?? "";
  const r = await searchAll(q);
  type Item = { id: string; label: string; sub?: string; href: string };
  const groups: { title: string; items: Item[] }[] = [
    { title: "Kelas", items: r.classes.map((x) => ({ id: x.id, label: x.name, href: "/teacher/classes" })) },
    { title: "Siswa", items: r.students.map((x) => ({ id: x.id, label: x.displayName, sub: [x.nis, x.class?.name].filter(Boolean).join(" · "), href: `/teacher/students?q=${encodeURIComponent(x.displayName)}` })) },
    { title: "Materi", items: r.materials.map((x) => ({ id: x.id, label: x.title, href: `/teacher/materials/${x.id}` })) },
    { title: "Soal", items: r.questions.map((x) => ({ id: x.id, label: x.prompt.length > 90 ? `${x.prompt.slice(0, 90)}…` : x.prompt, href: `/teacher/questions/${x.id}` })) },
    { title: "Ulangan", items: r.quizzes.map((x) => ({ id: x.id, label: x.title, href: `/teacher/quizzes/${x.id}` })) },
  ].filter((g) => g.items.length > 0);
  return (
    <>
      <div className="flex flex-col gap-space-xs">
        <h1 className="font-headline-lg text-headline-lg text-text-primary tracking-tight">Pencarian</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          {q.length < 2
            ? "Ketik minimal 2 huruf di kotak pencarian."
            : groups.length === 0
              ? `Tidak ada hasil untuk “${q}”.`
              : `Hasil untuk “${q}”`}
        </p>
      </div>
      {groups.map((g) => (
        <section key={g.title} className="bg-surface-card rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-sm">
          <h2 className="font-headline-sm text-headline-sm text-text-primary">{g.title}</h2>
          <ul className="flex flex-col">
            {g.items.map((i) => (
              <li key={i.id}>
                <Link
                  href={i.href}
                  className="min-h-12 px-space-md py-space-sm rounded-xl flex flex-col justify-center hover:bg-canvas-peach focus-visible:ring-[3px] focus-visible:ring-ring outline-none"
                >
                  <span className="font-label-md text-label-md text-text-primary">{i.label}</span>
                  {i.sub && <span className="font-label-sm text-label-sm text-on-surface-variant">{i.sub}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
