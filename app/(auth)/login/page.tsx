import type { Metadata } from "next";
import { Suspense } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentLoginForm } from "./student-login-form";

export const metadata: Metadata = { title: "Masuk" };

export default function StudentLoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
      {/* The notice is rare, so the fallback is empty rather than a loading line. */}
      <Suspense fallback={null}>
        <ReasonNotice searchParams={searchParams} />
      </Suspense>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1 className="text-xl font-semibold">Masuk ke Aksara</h1>
          </CardTitle>
          <CardDescription>Tulis kode kelas dari gurumu, lalu NIS atau namamu.</CardDescription>
        </CardHeader>
        <CardContent>
          <StudentLoginForm />
        </CardContent>
      </Card>
    </main>
  );
}

async function ReasonNotice({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { alasan } = await searchParams;
  if (alasan !== "perangkat-lain") return null;
  return (
    <Alert className="w-full max-w-sm">
      <AlertDescription className="text-foreground">
        Akunmu baru saja masuk dari perangkat lain. Kalau itu bukan kamu, beri tahu guru.
      </AlertDescription>
    </Alert>
  );
}
