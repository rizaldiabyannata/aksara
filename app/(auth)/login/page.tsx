import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Status } from "@/components/status";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StudentLoginForm } from "./student-login-form";

export const metadata: Metadata = { title: "Masuk" };

export default function StudentLoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <p className="text-2xl font-extrabold text-primary-strong">Aksara</p>
      {/* The notice is rare, so the fallback is empty rather than a loading line. */}
      <Suspense fallback={null}>
        <ReasonNotice searchParams={searchParams} />
      </Suspense>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            <h1 className="text-3xl font-bold">Masuk ke Aksara</h1>
          </CardTitle>
          <CardDescription>Tulis kode kelas dari gurumu, lalu NIS atau namamu.</CardDescription>
        </CardHeader>
        <CardContent>
          <StudentLoginForm />
        </CardContent>
        <CardFooter className="justify-center">
          <Link
            href="/teacher/login"
            className="inline-flex min-h-11 items-center px-2 font-semibold text-primary underline underline-offset-4"
          >
            Masuk sebagai guru
          </Link>
        </CardFooter>
      </Card>
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
