import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { requireTeacher } from "@/lib/auth/guard";
import { getSubjectTree } from "@/lib/subjects";
import { CreateQuizForm } from "../quiz-forms";

export const metadata: Metadata = { title: "Buat ulangan" };

export default function NewQuizPage({ searchParams }: PageProps<"/teacher/quizzes/new">) {
  return (
    <section className="flex flex-col gap-space-lg px-space-lg py-space-md">
      <PageHeader title="Buat ulangan" description="Isi judul dan mata pelajaran. Soal dan kelas diatur setelah ulangan dibuat." />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,28rem)]">
        <Suspense fallback={<p className="text-base">Memuat…</p>}>
          <Form searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

async function Form({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireTeacher();
  const tree = await getSubjectTree();
  const { chapterId } = await searchParams;
  const chapter = typeof chapterId === "string"
    ? tree.flatMap((s) => s.chapters.map((c) => ({ ...c, subjectId: s.id }))).find((c) => c.id === chapterId)
    : undefined;
  return <CreateQuizForm subjects={tree.map((s) => ({ id: s.id, name: s.name }))} chapter={chapter ? { id: chapter.id, title: chapter.title, subjectId: chapter.subjectId } : undefined} />;
}
