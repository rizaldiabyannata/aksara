import type { Metadata } from "next";
import { Suspense } from "react";
import { requireTeacher } from "@/lib/auth/guard";
import type { QuestionType } from "@/lib/generated/prisma/enums";
import { listChapterOptions } from "@/lib/subjects";
import { EditorHeader } from "../editor-header";
import { TYPE_LABEL } from "../labels";
import { QuestionForm } from "../question-form";
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
  const { type } = await searchParams;
  if (typeof type !== "string" || !Object.hasOwn(TYPE_LABEL, type)) {
    // Choosing a type reloads /teacher/questions/new?type=…, which renders the form.
    return (
      <>
        <h2 className="text-lg font-semibold mb-3">Pilih tipe soal</h2>
        <TypeStrip links />
      </>
    );
  }
  return (
    <>
      <TypeStrip current={type as QuestionType} links />
      <QuestionForm chapters={await listChapterOptions()} type={type as QuestionType} />
    </>
  );
}
