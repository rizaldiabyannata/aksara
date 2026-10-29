import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TeacherLoginForm } from "./teacher-login-form";

export const metadata: Metadata = { title: "Masuk Guru" };

export default function TeacherLoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <p className="text-2xl font-extrabold text-primary-strong">Aksara</p>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            <h1 className="text-3xl font-bold">Masuk Guru</h1>
          </CardTitle>
          <CardDescription>Masuk dengan username dan kata sandi guru.</CardDescription>
        </CardHeader>
        <CardContent>
          <TeacherLoginForm />
        </CardContent>
        <CardFooter className="justify-center">
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center px-2 font-semibold text-primary underline underline-offset-4"
          >
            Masuk sebagai siswa
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
