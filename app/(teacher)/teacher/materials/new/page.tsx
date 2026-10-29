import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { requireTeacher } from "@/lib/auth/guard";
import { listChapterOptions } from "@/lib/subjects";
import { MaterialForm } from "../material-form";

export const metadata: Metadata = { title: "Materi baru" };

export default function NewMaterialPage() {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Materi baru" />
      <Suspense fallback={<p>Memuat…</p>}>
        <NewForm />
      </Suspense>
    </section>
  );
}

async function NewForm() {
  await requireTeacher();
  return <MaterialForm chapters={await listChapterOptions()} />;
}
