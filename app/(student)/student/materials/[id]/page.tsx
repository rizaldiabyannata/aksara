import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MaterialView } from "@/components/material-view";
import { Card, CardContent } from "@/components/ui/card";
import { requireStudent } from "@/lib/auth/guard";
import { getPublishedMaterial } from "@/lib/materials";

export const metadata: Metadata = { title: "Materi" };

export default function StudentMaterialPage({ params }: PageProps<"/student/materials/[id]">) {
  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={<p>Memuat…</p>}>
        <Read params={params} />
      </Suspense>
    </div>
  );
}

async function Read({ params }: { params: Promise<{ id: string }> }) {
  await requireStudent();
  const { id } = await params;
  const material = await getPublishedMaterial(id);
  if (!material) notFound();
  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardContent>
        <MaterialView material={material} />
      </CardContent>
    </Card>
  );
}
