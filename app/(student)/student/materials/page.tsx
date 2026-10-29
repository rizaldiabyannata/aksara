import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireStudent } from "@/lib/auth/guard";
import { listPublishedTree } from "@/lib/materials";

export const metadata: Metadata = { title: "Materi Pelajaran" };

const LINK = "inline-flex min-h-11 items-center underline underline-offset-4";

export default function StudentMaterialsPage() {
  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={<p>Memuat…</p>}>
        <Tree />
      </Suspense>
    </div>
  );
}

async function Tree() {
  await requireStudent();
  const subjects = await listPublishedTree();
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Materi Pelajaran</h1>
      {subjects.length === 0 ? (
        <p className="text-muted-foreground">Belum ada materi. Tunggu gurumu menerbitkannya.</p>
      ) : (
        subjects.map((s) => (
          <div key={s.id} className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold">{s.name}</h2>
            {s.chapters.map((c) => (
              <div key={c.id} className="flex flex-col gap-1">
                <h3 className="font-semibold">
                  Bab {c.order}: {c.title}
                </h3>
                <ul className="flex flex-col">
                  {c.materials.map((m) => (
                    <li key={m.id}>
                      <Link href={`/student/materials/${m.id}`} className={LINK}>
                        {m.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))
      )}
    </section>
  );
}
