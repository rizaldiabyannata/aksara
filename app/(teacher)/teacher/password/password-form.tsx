"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  CircleIcon,
  FloppyDiskIcon,
  Key01Icon,
  LockPasswordIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { FormMessage } from "@/components/form-field";
import { IconField } from "@/app/(auth)/icon-field";
import { changePasswordAction } from "./actions";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, undefined);
  const errors = state?.fieldErrors ?? {};
  const hasFieldErrors = Object.keys(errors).length > 0;
  // Controlled so the live checklist works; mirrors changePasswordSchema (lib/auth/login.ts).
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const rules = [
    { ok: next.length >= 12, text: "Minimal 12 karakter" },
    { ok: next.length > 0 && next !== cur, text: "Berbeda dari kata sandi lama" },
    { ok: next.length > 0 && next === again, text: "Sama dengan isian ulang" },
  ];

  return (
    <form action={formAction} className="flex flex-col gap-space-lg mt-space-lg">
      <IconField
        variant="form"
        icon={Key01Icon}
        value={cur}
        onChange={(e) => setCur(e.target.value)}
        name="currentPassword"
        label="Kata sandi lama"
        type="password"
        autoComplete="current-password"
        required
        error={errors.currentPassword}
      />
      <div className="flex flex-col gap-space-sm">
        <IconField
          variant="form"
          icon={LockPasswordIcon}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          name="newPassword"
          label="Kata sandi baru"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          error={errors.newPassword}
        />
        <div className="bg-canvas-peach/50 rounded-xl p-space-md space-y-space-xs">
          <span className="font-label-sm text-label-sm text-text-primary block mb-1">Syarat kata sandi baru:</span>
          <ul aria-label="Syarat kata sandi baru" className="flex flex-col gap-space-xs">
            {rules.map((r) => (
              <li key={r.text} className={`flex items-center gap-space-xs font-body-md text-label-sm ${r.ok ? "text-tone-success" : "text-text-muted"}`}>
                <HugeiconsIcon icon={r.ok ? CheckmarkCircle02Icon : CircleIcon} aria-hidden="true" className="size-[18px]" />
                <span>
                  {r.text}
                  <span className="sr-only">{r.ok ? ": terpenuhi" : ": belum"}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <IconField
        variant="form"
        icon={LockPasswordIcon}
        value={again}
        onChange={(e) => setAgain(e.target.value)}
        name="confirmPassword"
        label="Ulangi kata sandi baru"
        type="password"
        autoComplete="new-password"
        required
        error={errors.confirmPassword}
      />
      <div className="rounded-xl p-space-md bg-tone-warning-bg text-on-surface-variant flex items-start gap-space-md shadow-sm">
        <HugeiconsIcon icon={Alert02Icon} aria-hidden="true" className="size-6 text-tone-warning shrink-0 mt-0.5" />
        <div className="flex flex-col font-body-md text-label-sm leading-relaxed">
          <span className="font-headline-sm text-label-md text-text-primary mb-0.5">Pencabutan sesi perangkat otomatis</span>
          <span>Setelah disimpan, perangkat lain yang sedang masuk akan keluar sendiri. Anda tetap masuk di perangkat ini.</span>
        </div>
      </div>
      <FormMessage
        message={state?.message ?? (hasFieldErrors ? "Periksa lagi isian yang ditandai." : undefined)}
      />
      <div className="pt-space-sm flex flex-col sm:flex-row items-center gap-space-md">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="w-full sm:flex-1 min-h-[50px] px-space-lg rounded-xl bg-primary-container hover:bg-primary-strong text-on-primary font-headline-sm text-label-lg shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-space-xs disabled:opacity-60 outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <HugeiconsIcon icon={FloppyDiskIcon} aria-hidden="true" className="size-[22px]" />
          <span>{pending ? "Sedang menyimpan…" : "Simpan kata sandi"}</span>
        </button>
        <Link
          href="/teacher"
          className="w-full sm:w-auto min-h-[50px] px-space-lg rounded-xl bg-surface-variant/50 hover:bg-surface-variant text-text-primary font-label-md text-label-md transition-colors flex items-center justify-center text-center outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          Kembali ke Dasbor
        </Link>
      </div>
    </form>
  );
}
