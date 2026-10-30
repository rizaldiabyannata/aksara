import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireTeacher } from "@/lib/auth/guard";
import type { QuestionType } from "@/lib/generated/prisma/enums";
import { listChapterOptions } from "@/lib/subjects";
import { TYPE_LABEL } from "../labels";
import { QuestionForm } from "../question-form";

export const metadata: Metadata = { title: "Soal baru" };

export default function NewQuestionPage({ searchParams }: PageProps<"/teacher/questions/new">) {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Soal baru" />
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
    // GET form: choosing a type reloads /teacher/questions/new?type=…, which renders the form.
    return (
      <Card className="rounded-2xl shadow-card">
        <CardContent>
          <form method="get" action="/teacher/questions/new" className="flex flex-col gap-5">
            <fieldset className="flex flex-col gap-3">
              <legend className="text-lg font-semibold">Pilih tipe soal</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(TYPE_LABEL).map(([k, label]) => (
                  <label
                    key={k}
                    className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 border-input bg-card p-3 font-semibold has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring"
                  >
                    <input type="radio" name="type" value={k} required className="size-5 accent-primary" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <Button type="submit" className="self-start">Lanjut</Button>
          </form>
        </CardContent>
      </Card>
    );
  }
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="secondary">{TYPE_LABEL[type as QuestionType]}</Badge>
        <Link href="/teacher/questions/new" className={buttonVariants({ variant: "ghost" })}>
          Ganti tipe
        </Link>
      </div>
      <QuestionForm chapters={await listChapterOptions()} type={type as QuestionType} />
    </>
  );
}
