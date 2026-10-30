import type { Metadata } from "next";
import { Suspense } from "react";
import { LockIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PageHeader } from "@/components/page-header";
import { requireTeacher } from "@/lib/auth/guard";
import { getSubjectTree } from "@/lib/subjects";
import { CreateQuizForm } from "../quiz-forms";

export const metadata: Metadata = { title: "Buat ulangan" };

export default function NewQuizPage() {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Buat ulangan" description="Isi judul dan mata pelajaran. Soal dan kelas diatur setelah ulangan dibuat." />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Suspense fallback={<p className="text-base">Memuat…</p>}>
          <Form />
        </Suspense>
        <aside className="rounded-2xl bg-info-soft p-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-info">
            <HugeiconsIcon icon={LockIcon} aria-hidden="true" />
            Aturan snapshot terbit
          </h2>
          <p className="mt-2">
            Saat ulangan <strong>diterbitkan</strong>, soal dan kunci disalin permanen. Mengubah bank soal sesudahnya tidak mengubah ulangan yang sudah terbit.
          </p>
        </aside>
      </div>
    </section>
  );
}

async function Form() {
  await requireTeacher();
  const subjects = (await getSubjectTree()).map((s) => ({ id: s.id, name: s.name }));
  return <CreateQuizForm subjects={subjects} />;
}
