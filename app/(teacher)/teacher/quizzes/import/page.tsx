import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { requireTeacher } from "@/lib/auth/guard";
import { getSubjectTree } from "@/lib/subjects";
import { listClasses } from "@/lib/classes";
import { QuestionImportForm } from "./import-form";

export const metadata: Metadata = { title: "Impor soal dari Excel" };
export default function ImportQuestionsPage() {
  return (
    <section className="flex min-w-0 flex-col gap-6 px-space-lg py-space-lg">
      <PageHeader title="Impor soal dari Excel" description="Isi template, periksa soal, lalu simpan ke bank soal dan draf ulangan." actions={<Link href="/teacher/quizzes" className={buttonVariants({ variant: "outline" })}>Kembali ke ulangan</Link>} />
      <Suspense fallback={<p>Memuat…</p>}><Form /></Suspense>
    </section>
  );
}
async function Form() {
  await requireTeacher();
  const [tree, classes] = await Promise.all([getSubjectTree(), listClasses()]);
  return <QuestionImportForm subjects={tree.map(s => ({ id: s.id, name: s.name, chapters: s.chapters.map(c => ({ id: c.id, title: c.title })) }))} classes={classes.filter(c => c.isActive).map(c => ({ id: c.id, name: c.name }))} />;
}
