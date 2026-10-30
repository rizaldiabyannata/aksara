"use client";

import { useActionState, useState } from "react";
import { Alert02Icon, CheckmarkCircle02Icon, CircleIcon, Key01Icon, LockPasswordIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { FormMessage } from "@/components/form-field";
import { IconField } from "@/app/(auth)/icon-field";
import { Button } from "@/components/ui/button";
import { changePasswordAction } from "./actions";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, undefined);
  const errors = state?.fieldErrors ?? {};
  // Controlled so the live checklist works; mirrors the rules in changePasswordSchema (lib/auth/login.ts).
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const rules = [
    { ok: next.length >= 12, text: "Minimal 12 karakter" },
    { ok: next.length > 0 && next !== cur, text: "Berbeda dari kata sandi lama" },
    { ok: next.length > 0 && next === again, text: "Sama dengan isian ulang" },
  ];
  const hasFieldErrors = Object.keys(errors).length > 0;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <IconField
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
      <IconField
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
      <IconField
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
      <ul aria-label="Syarat kata sandi baru" className="flex flex-col gap-1 rounded-xl bg-secondary p-4">
        {rules.map((r) => (
          <li key={r.text} className="flex items-center gap-2">
            <HugeiconsIcon
              icon={r.ok ? CheckmarkCircle02Icon : CircleIcon}
              aria-hidden="true"
              className={r.ok ? "text-success" : "text-muted-foreground"}
            />
            <span className={r.ok ? "font-semibold" : "text-muted-foreground"}>
              {r.text}
              <span className="sr-only">{r.ok ? ": terpenuhi" : ": belum"}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="flex items-start gap-2 rounded-xl bg-warning-soft p-4 font-semibold text-warning">
        <HugeiconsIcon icon={Alert02Icon} aria-hidden="true" className="mt-0.5 shrink-0" />
        Setelah disimpan, perangkat lain yang sedang masuk akan keluar sendiri.
      </p>
      <FormMessage
        message={state?.message ?? (hasFieldErrors ? "Periksa lagi isian yang ditandai." : undefined)}
      />
      <Button type="submit" className="h-11 w-full text-base" disabled={pending} aria-busy={pending}>
        {pending ? "Sedang menyimpan…" : "Simpan kata sandi"}
      </Button>
    </form>
  );
}
