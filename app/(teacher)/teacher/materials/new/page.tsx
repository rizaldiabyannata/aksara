import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { requireTeacher } from "@/lib/auth/guard";
import { listChapterOptions } from "@/lib/subjects";
import { NewMaterialForm } from "../material-form";

export const metadata: Metadata = { title: "Materi baru" };

export default function NewMaterialPage({ searchParams }: PageProps<"/teacher/materials/new">) {
  return (
    <section className="flex flex-col gap-6 p-space-lg">
      <PageHeader title="Materi baru" />
      <Suspense fallback={<p>Memuat…</p>}>
        <NewForm searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function NewForm({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireTeacher();
  const { chapterId } = await searchParams;
  return <NewMaterialForm chapters={await listChapterOptions()} chapterId={typeof chapterId === "string" ? chapterId : undefined} />;
}
