"use client";

import { useActionState } from "react";
import { FormField, FormMessage } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { changePasswordAction } from "./actions";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, undefined);
  const errors = state?.fieldErrors ?? {};
  const hasFieldErrors = Object.keys(errors).length > 0;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormField
        name="currentPassword"
        label="Kata sandi lama"
        type="password"
        autoComplete="current-password"
        required
        error={errors.currentPassword}
      />
      <FormField
        name="newPassword"
        label="Kata sandi baru"
        type="password"
        autoComplete="new-password"
        required
        minLength={12}
        hint="Minimal 12 karakter."
        error={errors.newPassword}
      />
      <FormField
        name="confirmPassword"
        label="Ulangi kata sandi baru"
        type="password"
        autoComplete="new-password"
        required
        error={errors.confirmPassword}
      />
      <FormMessage
        message={state?.message ?? (hasFieldErrors ? "Periksa lagi isian yang ditandai." : undefined)}
      />
      <Button type="submit" className="h-11 w-full text-base" disabled={pending} aria-busy={pending}>
        {pending ? "Sedang menyimpan…" : "Simpan kata sandi"}
      </Button>
    </form>
  );
}
