import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Markdown } from "@/components/material-view";
import { requireStudent } from "@/lib/auth/guard";
import { getAttemptView } from "@/lib/attempts";
import { AttemptClient } from "./attempt-client";
import { HideStudentHeader } from "./hide-student-header";

export const metadata: Metadata = { title: "Mengerjakan Ulangan" };

const LINK = "inline-flex min-h-11 items-center underline underline-offset-4";

export default function AttemptPage({ params }: PageProps<"/student/quizzes/[quizId]/attempt">) {
  return (
    // Outside Suspense: in the first HTML, so the header is hidden before hydration.
    <div className="flex flex-col gap-4">
      <HideStudentHeader />
      <Suspense fallback={<p>Memuat…</p>}>
        <Attempt params={params} />
      </Suspense>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/student" className={LINK}>
      Kembali ke daftar ulangan
    </Link>
  );
}

async function Attempt({ params }: { params: PageProps<"/student/quizzes/[quizId]/attempt">["params"] }) {
  const user = await requireStudent();
  const { quizId } = await params;
  const view = await getAttemptView(user.id, { quizId });
  if (!view || view.status !== "IN_PROGRESS") {
    return (
      <section className="flex flex-col gap-3">
        <p>Tidak ada ulangan yang sedang kamu kerjakan.</p>
        <div>
          <BackLink />
        </div>
      </section>
    );
  }
  // Markdown is rendered here so the client never needs the renderer (D18).
  const questions = view.questions.map((q) => ({
    id: q.id,
    number: q.number,
    type: q.type,
    answer: q.answer,
    prompt: <Markdown source={q.prompt} images={q.images} />,
    options: q.options?.map((o) => ({ id: o.id, node: <Markdown source={o.text} images={q.images} /> })) ?? null,
  }));
  return (
    <AttemptClient
      key={view.attemptId}
      attemptId={view.attemptId}
      quizId={view.quizId}
      quizTitle={view.quizTitle}
      deadlineAt={view.deadlineAt}
      serverNow={view.serverNow}
      questions={questions}
    />
  );
}
