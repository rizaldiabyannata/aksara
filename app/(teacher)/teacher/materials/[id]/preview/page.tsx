import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MaterialView } from "@/components/material-view";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
      <div role="note" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary p-4 shadow-card">
        <p className="font-semibold text-primary-strong">Pratinjau. Status: {STATUS_LABEL[material.status]}</p>
        <Link href={`/teacher/materials/${id}`} className={buttonVariants({ variant: "outline", className: "h-11" })}>
          Kembali ke ubah materi
        </Link>
      </div>
      <Card className="shadow-raised">
        <CardContent className="mx-auto w-full max-w-[70ch]">
          <MaterialView material={material} />
        </CardContent>
      </Card>
    </div>
  );
}
