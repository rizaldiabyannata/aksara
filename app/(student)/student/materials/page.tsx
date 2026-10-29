import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStudent } from "@/lib/auth/guard";
import { listPublishedTree } from "@/lib/materials";

export const metadata: Metadata = { title: "Materi Pelajaran" };

const LINK =
  "flex min-h-12 items-center rounded-xl px-3 font-medium text-primary-strong underline-offset-4 hover:bg-secondary hover:underline focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none";

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
      <PageHeader title="Materi Pelajaran" description="Pilih materi yang ingin kamu baca." />
      {subjects.length === 0 ? (
        <p className="text-muted-foreground">Belum ada materi. Tunggu gurumu menerbitkannya.</p>
      ) : (
        subjects.map((s) => (
          <div key={s.id} id={s.id} className="flex scroll-mt-20 flex-col gap-4">
            <h2 className="flex items-center gap-3 text-xl font-bold">
              <span aria-hidden="true" className="h-6 w-1.5 rounded-full bg-accent-decor" />
              {s.name}
            </h2>
            {s.chapters.map((c) => (
              <Card key={c.id} className="text-base!">
                <CardHeader>
                  <CardTitle>
                    <h3 className="text-lg font-bold">
                      Bab {c.order}: {c.title}
                    </h3>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                <ul className="flex flex-col gap-1">
                  {c.materials.map((m) => (
                    <li key={m.id}>
                      <Link href={`/student/materials/${m.id}`} className={LINK}>
                        {m.title}
                      </Link>
                    </li>
                  ))}
                </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        ))
      )}
    </section>
  );
}
