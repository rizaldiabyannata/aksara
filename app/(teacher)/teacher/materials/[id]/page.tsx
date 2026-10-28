import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { requireTeacher } from "@/lib/auth/guard";
import { extractImageIds } from "@/lib/images";
import { formatWita } from "@/lib/format";
import { canTransition, getMaterialForTeacher } from "@/lib/materials";
import { listChapterOptions } from "@/lib/subjects";
import { ImagePanel } from "../../image-panel";
import { DeleteMaterialButton, MaterialForm, StatusButtons } from "../material-form";
import { STATUS_LABEL } from "../status-label";

export const metadata: Metadata = { title: "Ubah materi" };

export default function EditMaterialPage({ params }: PageProps<"/teacher/materials/[id]">) {
  return (
    <Suspense fallback={<p>Memuat…</p>}>
      <Edit params={params} />
    </Suspense>
  );
}

async function Edit({ params }: { params: Promise<{ id: string }> }) {
  await requireTeacher();
  const { id } = await params;
  const [material, chapters] = await Promise.all([getMaterialForTeacher(id), listChapterOptions()]);
  if (!material) notFound();
  const referencedIds = extractImageIds(
    [material.content, material.examples, material.exercises].join("\n"),
  );
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Ubah materi</h1>
        <Badge variant={material.status === "PUBLISHED" ? "default" : "secondary"}>
          {STATUS_LABEL[material.status]}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {material.subjectName} · {material.chapterTitle} · Diubah {formatWita(material.updatedAt)}
      </p>
      <div className="flex flex-wrap items-start gap-2">
        <Link href={`/teacher/materials/${id}/preview`} className="inline-flex min-h-11 items-center underline">
          Pratinjau
        </Link>
        <StatusButtons
          id={id}
          status={material.status}
          targets={(["REVIEWED", "PUBLISHED", "DRAFT"] as const).filter((to) =>
            canTransition(material.status, to),
          )}
        />
      </div>
      <MaterialForm chapters={chapters} material={material} />
      <section aria-labelledby="gambar-heading">
        <h2 id="gambar-heading" className="text-lg font-semibold">Gambar</h2>
        <ImagePanel owner="materialId" ownerId={id} images={material.images} referencedIds={referencedIds} />
      </section>
      {material.status === "DRAFT" && (
        <div>
          <DeleteMaterialButton id={id} title={material.title} />
        </div>
      )}
    </section>
  );
}
