import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireTeacher } from "@/lib/auth/guard";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Ganti Kata Sandi" };

export default function PasswordPage() {
  return (
    <Suspense fallback={<p>Memuat…</p>}>
      <ChangePassword />
    </Suspense>
  );
}

async function ChangePassword() {
  const user = await requireTeacher({ allowPasswordChange: true });
  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl font-semibold">Ganti kata sandi</h1>
        </CardTitle>
        <CardDescription>
          {user.mustChangePassword
            ? "Buat kata sandi baru dulu sebelum memakai Aksara."
            : "Masukkan kata sandi lama, lalu buat kata sandi baru."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PasswordForm />
      </CardContent>
    </Card>
  );
}
