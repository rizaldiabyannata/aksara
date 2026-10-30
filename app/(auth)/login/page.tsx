import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight01Icon, HelpCircleIcon, School01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Status } from "@/components/status";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StudentLoginForm } from "./student-login-form";

export const metadata: Metadata = { title: "Masuk" };

export default function StudentLoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-8 p-4 md:p-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-card">
            <HugeiconsIcon icon={School01Icon} aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <p className="text-lg font-bold tracking-tight">Aksara</p>
            <p className="text-muted-foreground">Belajar dan ulangan untuk kelas VI</p>
          </div>
        </div>
        <Link
          href="/teacher/login"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-card px-4 font-semibold text-info shadow-card outline-none hover:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          Masuk sebagai guru
          <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" />
        </Link>
      </div>

      {/* The notice is rare, so the fallback is empty rather than a loading line. */}
      <Suspense fallback={null}>
        <ReasonNotice searchParams={searchParams} />
      </Suspense>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <Card className="lg:order-2 lg:col-span-7">
          <CardHeader>
            <CardTitle>
              <h1 className="text-3xl font-bold md:text-4xl">Masuk ke Aksara</h1>
            </CardTitle>
            <CardDescription>Tulis kode kelas dari gurumu, lalu NIS atau namamu.</CardDescription>
          </CardHeader>
          <CardContent>
            <StudentLoginForm />
          </CardContent>
        </Card>
        <Card className="lg:order-1 lg:col-span-5">
          <CardContent className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning">
              <HugeiconsIcon icon={HelpCircleIcon} aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="font-bold">Belum punya kode kelas?</p>
              <p className="text-muted-foreground">Tanyakan kepada gurumu. Kodenya ditulis di papan tulis.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

async function ReasonNotice({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { alasan } = await searchParams;
  if (alasan !== "perangkat-lain") return null;
  return (
    <div className="w-full max-w-md">
      <Status tone="warning">
        Akunmu baru saja masuk dari perangkat lain. Kalau itu bukan kamu, beri tahu guru.
      </Status>
    </div>
  );
}
