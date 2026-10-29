import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
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
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <PageHeader
        title="Ganti kata sandi"
        description={
          user.mustChangePassword
            ? "Buat kata sandi baru dulu sebelum memakai Aksara."
            : "Masukkan kata sandi lama, lalu buat kata sandi baru."
        }
      />
      {user.mustChangePassword && <Status tone="warning">Wajib: ganti kata sandi awalmu sekarang.</Status>}
      <Card>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
      <Status tone="info">
        Setelah disimpan, sesi guru di perangkat lain akan dicabut otomatis. Kamu tetap masuk di perangkat ini.
      </Status>
    </div>
  );
}
