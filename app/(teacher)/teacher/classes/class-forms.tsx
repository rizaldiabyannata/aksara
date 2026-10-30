"use client";

import { useActionState } from "react";
import { ConfirmAction } from "@/components/confirm-action";
import { Feedback } from "@/components/form-feedback";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  createClassAction,
  renameClassAction,
  revokeClassSessionsAction,
  rotateClassCodeAction,
  setClassActiveAction,
} from "./actions";

export function CreateClassForm() {
  const [state, formAction, pending] = useActionState(createClassAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-2 w-full lg:w-auto">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 sm:w-80">
          <label htmlFor="name" className="sr-only">
            Nama kelas baru
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="off"
            placeholder="Nama kelas (Contoh: VI-C)"
            defaultValue={state?.values?.name}
            aria-invalid={state?.fieldErrors?.name ? true : undefined}
            aria-describedby={state?.fieldErrors?.name ? "name-error" : undefined}
            className="w-full h-11 px-4 rounded-xl bg-[#fcf8f7] border border-stone-200 text-text-primary font-body-md text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary-container focus:bg-white transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-label-md text-sm font-bold hover:opacity-95 active:scale-95 transition-all shadow-[0_4px_12px_rgba(255,112,52,0.25)] flex items-center justify-center gap-2 whitespace-nowrap focus-visible:ring-[3px] focus-visible:ring-ring outline-none"
        >
          <HugeiconsIcon icon={Add01Icon} className="size-5" aria-hidden="true" />
          <span>{pending ? "Sedang menyimpan…" : "Buat Kelas Baru"}</span>
        </button>
      </div>
      {state?.fieldErrors?.name && (
        <p id="name-error" className="text-sm text-destructive">
          {state.fieldErrors.name}
        </p>
      )}
      <Feedback state={state} />
    </form>
  );
}

export function RenameClassForm({ classId, name }: { classId: string; name: string }) {
  const [state, formAction, pending] = useActionState(
    renameClassAction.bind(null, classId),
    undefined,
  );
  const id = `name-${classId}`;
  return (
    <form action={formAction} className="flex flex-col gap-2 flex-1">
      <div className="flex items-center gap-2.5 flex-1">
        <label className="font-label-md text-xs font-bold text-text-primary shrink-0" htmlFor={id}>
          Nama Kelas:
        </label>
        <input
          id={id}
          name="name"
          type="text"
          required
          autoComplete="off"
          defaultValue={state?.values?.name ?? name}
          aria-invalid={state?.fieldErrors?.name ? true : undefined}
          aria-describedby={state?.fieldErrors?.name ? `${id}-error` : undefined}
          className="h-11 px-3.5 rounded-lg bg-white border border-stone-200 font-body-md text-xs text-text-primary flex-1 min-w-0 max-w-xs focus:outline-none focus:ring-1 focus:ring-primary-container focus-visible:ring-[3px] focus-visible:ring-ring"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-11 px-3.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-text-primary font-label-md text-xs font-bold transition-colors focus-visible:ring-[3px] focus-visible:ring-ring outline-none"
        >
          Simpan
        </button>
      </div>
      {state?.fieldErrors?.name && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {state.fieldErrors.name}
        </p>
      )}
      <Feedback state={state} />
    </form>
  );
}

export function RotateCodeButton({ classId }: { classId: string }) {
  return (
    <ConfirmAction
      action={rotateClassCodeAction.bind(null, classId)}
      trigger="Ganti kode"
      title="Ganti kode kelas?"
      description="Kode yang lama tidak bisa dipakai untuk masuk lagi. Siswa yang sudah masuk tetap masuk. Berikan kode yang baru kepada siswa."
      confirm="Ya, ganti kode"
    />
  );
}

export function RevokeSessionsButton({ classId }: { classId: string }) {
  return (
    <ConfirmAction
      action={revokeClassSessionsAction.bind(null, classId)}
      trigger="Keluarkan semua siswa"
      title="Keluarkan semua siswa?"
      description="Semua siswa kelas ini akan keluar dari perangkatnya dan harus masuk lagi dengan kode kelas."
      confirm="Ya, keluarkan"
      destructive
      triggerClassName="h-11! px-3! font-label-sm text-label-sm! whitespace-normal! text-left"
    />
  );
}

export function ToggleActiveButton({ classId, isActive }: { classId: string; isActive: boolean }) {
  return isActive ? (
    <ConfirmAction
      action={setClassActiveAction.bind(null, classId, false)}
      trigger="Nonaktifkan"
      title="Nonaktifkan kelas ini?"
      description="Siswa kelas ini akan keluar dan tidak bisa masuk sampai kelas diaktifkan lagi."
      confirm="Ya, nonaktifkan"
      destructive
      triggerClassName="h-11! px-3! font-label-sm text-label-sm! whitespace-normal! text-left"
    />
  ) : (
    <ConfirmAction
      action={setClassActiveAction.bind(null, classId, true)}
      trigger="Aktifkan"
      title="Aktifkan kelas ini?"
      description="Siswa kelas ini bisa masuk lagi dengan kode kelas."
      confirm="Ya, aktifkan"
    />
  );
}
