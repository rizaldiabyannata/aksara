import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TeacherLoginForm } from "./teacher-login-form";

export const metadata: Metadata = { title: "Masuk Guru" };

export default function TeacherLoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1 className="text-xl font-semibold">Masuk Guru</h1>
          </CardTitle>
          <CardDescription>Masuk dengan username dan kata sandi guru.</CardDescription>
        </CardHeader>
        <CardContent>
          <TeacherLoginForm />
        </CardContent>
        <CardFooter className="justify-center">
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center px-2 text-sm underline underline-offset-4"
          >
            Masuk sebagai siswa
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
