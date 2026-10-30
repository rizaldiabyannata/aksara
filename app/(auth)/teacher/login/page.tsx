import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight01Icon, HelpCircleIcon, School01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TeacherLoginForm } from "./teacher-login-form";

export const metadata: Metadata = { title: "Masuk Guru" };

export default function TeacherLoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-8 p-4 md:p-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-card">
            <HugeiconsIcon icon={School01Icon} aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <p className="text-lg font-bold tracking-tight">Aksara Guru</p>
            <p className="text-muted-foreground">Belajar dan ulangan untuk kelas VI</p>
          </div>
        </div>
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-card px-4 font-semibold text-info shadow-card outline-none hover:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          Masuk sebagai siswa
          <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" />
        </Link>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <Card className="lg:order-2 lg:col-span-7">
          <CardHeader>
            <CardTitle>
              <h1 className="text-3xl font-bold md:text-4xl">Masuk Guru</h1>
            </CardTitle>
            <CardDescription>Masuk dengan username dan kata sandi guru.</CardDescription>
          </CardHeader>
          <CardContent>
            <TeacherLoginForm />
          </CardContent>
        </Card>
        <Card className="lg:order-1 lg:col-span-5">
          <CardContent className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning">
              <HugeiconsIcon icon={HelpCircleIcon} aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="font-bold">Baru pertama kali masuk?</p>
              <p className="text-muted-foreground">
                Anda akan diminta membuat kata sandi baru (minimal 12 karakter) sebelum memakai Aksara.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
