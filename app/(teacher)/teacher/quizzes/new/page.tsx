import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { requireTeacher } from "@/lib/auth/guard";
import { getSubjectTree } from "@/lib/subjects";
import { CreateQuizForm } from "../quiz-forms";

export const metadata: Metadata = { title: "Buat ulangan" };

export default function NewQuizPage() {
  return (
    <section className="flex flex-col gap-space-lg px-space-lg py-space-md">
      <PageHeader title="Buat ulangan" description="Isi judul dan mata pelajaran. Soal dan kelas diatur setelah ulangan dibuat." />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,28rem)]">
        <Suspense fallback={<p className="text-base">Memuat…</p>}>
          <Form />
        </Suspense>
      </div>
    </section>
  );
}

async function Form() {
  await requireTeacher();
  const subjects = (await getSubjectTree()).map((s) => ({ id: s.id, name: s.name }));
  return <CreateQuizForm subjects={subjects} />;
}
