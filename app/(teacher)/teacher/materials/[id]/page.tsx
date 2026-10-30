import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Image01Icon, Route01Icon, ViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { buttonVariants } from "@/components/ui/button";
import { requireTeacher } from "@/lib/auth/guard";
import { extractImageIds } from "@/lib/images";
import { formatWita } from "@/lib/format";
import { canTransition, getMaterialForTeacher } from "@/lib/materials";
import { listChapterOptions } from "@/lib/subjects";
import { ImagePanel } from "../../image-panel";
import { DeleteMaterialButton, MaterialForm, StatusButtons } from "../material-form";
import { STATUS_LABEL, STATUS_TONE } from "../status-label";

const FLOW = ["DRAFT", "REVIEWED", "PUBLISHED"] as const;
const FLOW_HINT = {
  DRAFT: "Hanya Anda yang bisa melihat",
  REVIEWED: "Isi sudah Anda periksa",
  PUBLISHED: "Siswa kelas VI bisa membaca",
} as const;

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
    <section className="flex flex-col gap-6 p-8">
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 min-w-0"><MaterialForm chapters={chapters} material={material} /></div>
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-surface-card rounded-2xl p-6 border border-border-subtle shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={Route01Icon} className="size-[22px] text-tone-info" aria-hidden="true" />
                <h2 className="text-sm font-bold text-text-primary">Status &amp; Alur Publikasi</h2>
              </div>
              <span className="text-xs font-bold text-primary-strong">Tahap {FLOW.indexOf(material.status) + 1} / 3</span>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <Status tone={STATUS_TONE[material.status]}>{STATUS_LABEL[material.status]}</Status>
              </div>
              <ol className="relative pl-5 space-y-6">
                <div aria-hidden="true" className="absolute left-3.5 top-3 bottom-3 w-0.5 bg-border-subtle" />
                {FLOW.map((st, n) => {
                  const on = st === material.status;
                  return (
                    <li key={st} aria-current={on ? "step" : undefined} className="relative flex items-start gap-3.5">
                      <span
                        aria-hidden="true"
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-surface-card z-10 ${on ? "bg-primary-container text-on-primary shadow-sm" : "bg-surface-container text-text-muted border border-border-subtle"}`}
                      >
                        {n + 1}
                      </span>
                      <span className="flex flex-col">
                        <span className={`text-sm leading-tight ${on ? "font-bold text-text-primary" : "font-semibold text-text-muted"}`}>{STATUS_LABEL[st]}</span>
                        <span className="text-[11px] text-text-muted mt-0.5">{FLOW_HINT[st]}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
              <StatusButtons
                id={id}
                status={material.status}
                targets={(["REVIEWED", "PUBLISHED", "DRAFT"] as const).filter((to) =>
                  canTransition(material.status, to),
                )}
              />
            </div>
          </div>
          <section aria-labelledby="gambar-heading" className="bg-surface-card rounded-2xl p-6 border border-border-subtle shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
              <HugeiconsIcon icon={Image01Icon} className="size-[22px] text-primary-strong" aria-hidden="true" />
              <h2 id="gambar-heading" className="text-sm font-bold text-text-primary">Panel Gambar</h2>
            </div>
            <ImagePanel owner="materialId" ownerId={id} images={material.images} referencedIds={referencedIds} />
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
