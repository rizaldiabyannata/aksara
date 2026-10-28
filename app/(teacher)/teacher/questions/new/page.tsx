import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireTeacher } from "@/lib/auth/guard";
import type { QuestionType } from "@/lib/generated/prisma/enums";
import { listChapterOptions } from "@/lib/subjects";
import { TYPE_LABEL } from "../labels";
import { QuestionForm } from "../question-form";

export const metadata: Metadata = { title: "Soal baru" };

export default function NewQuestionPage({ searchParams }: PageProps<"/teacher/questions/new">) {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Soal baru</h1>
      <Suspense fallback={<p>Memuat…</p>}>
        <NewForm searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function NewForm({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireTeacher();
  const { type } = await searchParams;
  if (typeof type !== "string" || !Object.hasOwn(TYPE_LABEL, type)) {
    return (
      <div className="flex flex-col gap-3">
        <p>Pilih tipe soal.</p>
        <ul className="flex flex-col gap-2">
          {Object.entries(TYPE_LABEL).map(([k, label]) => (
            <li key={k}>
              <Link href={`/teacher/questions/new?type=${k}`} className="inline-flex min-h-11 items-center underline">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <>
      <p className="font-medium">{TYPE_LABEL[type as QuestionType]}</p>
      <QuestionForm chapters={await listChapterOptions()} type={type as QuestionType} />
    </>
  );
}
