import type { Metadata } from "next";
import { Suspense } from "react";
import { requireTeacher } from "@/lib/auth/guard";
import type { QuestionType } from "@/lib/generated/prisma/enums";
import { listChapterOptions } from "@/lib/subjects";
import { EditorHeader } from "../editor-header";
import { TYPE_LABEL } from "../labels";
import { NewQuestionForm } from "../question-form";
import { TypeStrip } from "../type-strip";

export const metadata: Metadata = { title: "Soal baru" };

export default function NewQuestionPage({ searchParams }: PageProps<"/teacher/questions/new">) {
  return (
    <section className="w-full max-w-[1400px] mx-auto flex-1 px-space-xl py-space-lg">
      <EditorHeader
        title="Soal baru"
        description="Pilih tipe soal, lalu isi bab, teks soal, kunci jawaban, dan pembahasan."
      />
      <Suspense fallback={<p className="text-base">Memuat…</p>}>
        <NewForm searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function NewForm({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireTeacher();
  const { type, chapterId } = await searchParams;
  const chapters = await listChapterOptions();
  const selectedChapterId = typeof chapterId === "string" && chapters.some((c) => c.id === chapterId) ? chapterId : undefined;
  if (typeof type !== "string" || !Object.hasOwn(TYPE_LABEL, type)) {
    // Choosing a type reloads /teacher/questions/new?type=…, which renders the form.
    return (
      <>
        <h2 className="text-lg font-semibold mb-3">Pilih tipe soal</h2>
        <TypeStrip links chapterId={selectedChapterId} />
      </>
    );
  }
  return (
    <>
      <TypeStrip current={type as QuestionType} links chapterId={selectedChapterId} />
      <NewQuestionForm chapters={chapters} type={type as QuestionType} chapterId={selectedChapterId} />
    </>
  );
}
