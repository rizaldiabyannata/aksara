import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MaterialView } from "@/components/material-view";
import { requireStudent } from "@/lib/auth/guard";
import { getPublishedMaterial } from "@/lib/materials";

export const metadata: Metadata = { title: "Materi" };

const LINK = "inline-flex min-h-11 items-center underline underline-offset-4";

export default function StudentMaterialPage({ params }: PageProps<"/student/materials/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4">
      <Suspense fallback={<p>Memuat…</p>}>
        <Read params={params} />
      </Suspense>
    </main>
  );
}

async function Read({ params }: { params: Promise<{ id: string }> }) {
  await requireStudent();
  const { id } = await params;
  const material = await getPublishedMaterial(id);
  if (!material) notFound();
  return (
    <>
      <div>
        <Link href="/student/materials" className={LINK}>
          Kembali ke daftar materi
        </Link>
      </div>
      <MaterialView material={material} />
    </>
  );
}
