import type { Metadata } from "next";
import { Suspense } from "react";
import { LockPasswordIcon, Key01Icon, Shield01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { requireTeacher } from "@/lib/auth/guard";
import { AvatarForm } from "./avatar-form";
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
    <div className="max-w-7xl mx-auto w-full px-margin-mobile md:px-margin py-space-xl">
      {user.mustChangePassword && (
        <div className="w-full bg-tone-warning-bg rounded-2xl p-space-md md:p-space-lg mb-space-xl shadow-sm flex items-start gap-space-md">
          <div className="w-12 h-12 rounded-xl bg-tone-warning/20 flex items-center justify-center shrink-0 text-tone-warning">
            <HugeiconsIcon icon={LockPasswordIcon} aria-hidden="true" className="size-7" />
          </div>
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-space-xs">
              <span className="px-space-sm py-0.5 rounded-md bg-tone-warning text-on-primary font-label-sm text-label-sm">Wajib Dilakukan</span>
              <span className="font-headline-sm text-headline-sm text-text-primary">Perlindungan Akun Guru</span>
            </div>
            <p className="font-body-md text-body-md text-text-muted mt-0.5">
              Wajib: ganti kata sandi awalmu sekarang, sebelum mengelola kelas, materi ajar, bank soal, dan ulangan.
            </p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        <div className="lg:col-span-7 bg-surface-card rounded-2xl p-space-lg md:p-space-xl shadow-[0_4px_20px_-2px_rgba(230,115,60,0.07)]">
          <div className="flex items-center gap-space-md mb-space-md">
            <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary-strong">
              <HugeiconsIcon icon={Key01Icon} aria-hidden="true" className="size-[26px]" />
            </div>
            <div>
              <h1 className="font-headline-lg text-headline-lg text-text-primary">Ganti kata sandi</h1>
              <p className="font-body-md text-body-md text-text-muted mt-0.5">
                {user.mustChangePassword
                  ? "Buat kata sandi baru dulu sebelum memakai Aksara."
                  : "Masukkan kata sandi lama, lalu buat kata sandi baru."}
              </p>
            </div>
          </div>
          <PasswordForm />
        </div>
        <div className="lg:col-span-5 flex flex-col gap-space-lg">
          <section aria-labelledby="foto-profil" className="bg-surface-card rounded-2xl p-space-lg md:p-space-xl shadow-[0_4px_20px_-2px_rgba(230,115,60,0.07)]">
            <h2 id="foto-profil" className="font-headline-sm text-headline-sm text-text-primary mb-space-md">Foto profil</h2>
            <AvatarForm displayName={user.displayName} imageId={user.avatarImageId} />
          </section>
          <div className="bg-surface-card rounded-2xl p-space-lg md:p-space-xl shadow-[0_4px_20px_-2px_rgba(230,115,60,0.05)] flex items-start gap-space-md">
            <div className="w-9 h-9 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
              <HugeiconsIcon icon={Shield01Icon} aria-hidden="true" className="size-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-text-primary">Keamanan akun</span>
              <p className="font-body-md text-label-sm text-text-muted mt-0.5">
                Setelah disimpan, sesi guru di perangkat lain akan dicabut otomatis. Kamu tetap masuk di perangkat ini.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
