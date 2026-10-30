import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireTeacher } from "@/lib/auth/guard";
import { extractImageIds } from "@/lib/images";
import { formatWita } from "@/lib/format";
import { canTransition, getMaterialForTeacher } from "@/lib/materials";
import { listChapterOptions } from "@/lib/subjects";
import { ImagePanel } from "../../image-panel";
import { DeleteMaterialButton, MaterialForm, StatusButtons } from "../material-form";
import { STATUS_LABEL, STATUS_TONE } from "../status-label";

const FLOW = ["DRAFT", "REVIEWED", "PUBLISHED"] as const;

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
      <PageHeader
        title="Ubah materi"
        description={`${material.subjectName} · ${material.chapterTitle} · Diubah ${formatWita(material.updatedAt)}`}
        actions={
          <Link href={`/teacher/materials/${id}/preview`} className={buttonVariants({ variant: "outline" })}>
            <HugeiconsIcon icon={ViewIcon} aria-hidden="true" />
            Pratinjau
          </Link>
        }
      />
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:items-start">
        <MaterialForm chapters={chapters} material={material} />
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2 className="text-xl font-bold">Status</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <Status tone={STATUS_TONE[material.status]}>{STATUS_LABEL[material.status]}</Status>
              </div>
              <ol className="flex flex-col gap-3">
                {FLOW.map((st, n) => (
                  <li key={st} aria-current={st === material.status ? "step" : undefined} className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${st === material.status ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                    >
                      {n + 1}
                    </span>
                    <span className={st === material.status ? "font-bold" : "text-muted-foreground"}>{STATUS_LABEL[st]}</span>
                  </li>
                ))}
              </ol>
              <StatusButtons
                id={id}
                status={material.status}
                targets={(["REVIEWED", "PUBLISHED", "DRAFT"] as const).filter((to) =>
                  canTransition(material.status, to),
                )}
              />
            </CardContent>
          </Card>
          <section aria-labelledby="gambar-heading">
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2 id="gambar-heading" className="text-xl font-bold">Gambar</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ImagePanel owner="materialId" ownerId={id} images={material.images} referencedIds={referencedIds} />
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
      {material.status === "DRAFT" && (
        <div>
          <DeleteMaterialButton id={id} title={material.title} />
        </div>
      )}
    </section>
  );
}
