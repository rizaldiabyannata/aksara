import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MaterialView } from "@/components/material-view";
import { requireTeacher } from "@/lib/auth/guard";
import { getMaterialForTeacher } from "@/lib/materials";
import { STATUS_LABEL } from "../../status-label";

export const metadata: Metadata = { title: "Pratinjau materi" };

export default function PreviewPage({ params }: PageProps<"/teacher/materials/[id]/preview">) {
  return (
    <Suspense fallback={<p>Memuat…</p>}>
      <Preview params={params} />
    </Suspense>
  );
}

async function Preview({ params }: { params: Promise<{ id: string }> }) {
  await requireTeacher();
  const { id } = await params;
  const material = await getMaterialForTeacher(id);
  if (!material) notFound();
  return (
    <div className="flex flex-col gap-6">
      <div role="note" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted p-3">
        <p className="font-medium">Pratinjau. Status: {STATUS_LABEL[material.status]}</p>
        <Link href={`/teacher/materials/${id}`} className="inline-flex min-h-11 items-center underline">
          Kembali ke ubah materi
        </Link>
      </div>
      <MaterialView material={material} />
    </div>
  );
}
