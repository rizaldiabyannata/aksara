import type { Metadata } from "next";
import { Suspense } from "react";
import { LockPasswordIcon, Shield01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <PageHeader
        title="Ganti kata sandi"
        description={
          user.mustChangePassword
            ? "Buat kata sandi baru dulu sebelum memakai Aksara."
            : "Masukkan kata sandi lama, lalu buat kata sandi baru."
        }
      />
      {user.mustChangePassword && (
        <div className="flex items-start gap-4 rounded-2xl bg-warning-soft p-4 md:p-6">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-card text-warning">
            <HugeiconsIcon icon={LockPasswordIcon} aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-lg font-bold">Wajib: ganti kata sandi awalmu sekarang.</p>
            <p className="text-muted-foreground">Setelah itu Anda bisa mengelola kelas, materi, dan ulangan.</p>
          </div>
        </div>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>
        <Card className="lg:col-span-5">
          <CardContent className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info">
              <HugeiconsIcon icon={Shield01Icon} aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="font-bold">Keamanan akun</p>
              <p className="text-muted-foreground">
                Setelah disimpan, sesi guru di perangkat lain akan dicabut otomatis. Kamu tetap masuk di perangkat ini.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
