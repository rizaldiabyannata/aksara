import type { Metadata } from "next";
import { Suspense } from "react";
import { requireTeacher } from "@/lib/auth/guard";
import { getSubjectTree } from "@/lib/subjects";
import { CreateQuizForm } from "../quiz-forms";

export const metadata: Metadata = { title: "Buat ulangan" };

export default function NewQuizPage() {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Buat ulangan</h1>
      <Suspense fallback={<p>Memuat…</p>}>
        <Form />
      </Suspense>
    </section>
  );
}

async function Form() {
  await requireTeacher();
  const subjects = (await getSubjectTree()).map((s) => ({ id: s.id, name: s.name }));
  return <CreateQuizForm subjects={subjects} />;
}
