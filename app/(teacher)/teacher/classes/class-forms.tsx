"use client";

import { useActionState } from "react";
import { ConfirmAction } from "@/components/confirm-action";
import { Feedback } from "@/components/form-feedback";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createClassAction,
  renameClassAction,
  revokeClassSessionsAction,
  rotateClassCodeAction,
  setClassActiveAction,
} from "./actions";

/** "ABCDEF" -> "ABC DEF" (login accepts the space). */
const groupCode =(code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;

export function CreateClassForm() {
  const [state, formAction, pending] = useActionState(createClassAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormField
        name="name"
        label="Nama kelas baru"
        placeholder="Contoh: VI-A"
        autoComplete="off"
        required
        defaultValue={state?.values?.name}
        error={state?.fieldErrors?.name}
      />
      <Feedback state={state} />
      <Button type="submit" className="h-11 text-base" disabled={pending} aria-busy={pending}>
        {pending ? "Sedang menyimpan…" : "Buat kelas"}
      </Button>
    </form>
  );
}

export function RenameClassForm({ classId, name }: { classId: string; name: string }) {
  const [state, formAction, pending] = useActionState(
    renameClassAction.bind(null, classId),
    undefined,
  );
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormField
        name="name"
        id={`name-${classId}`}
        label="Ubah nama kelas"
        defaultValue={state?.values?.name ?? name}
        autoComplete="off"
        required
        error={state?.fieldErrors?.name}
      />
      <Feedback state={state} />
      <Button type="submit" variant="outline" className="h-11" disabled={pending}>
        Simpan nama
      </Button>
    </form>
  );
}

/** The code, very large, for writing on the board. */
export function ShowCodeDialog({ name, code }: { name: string; code: string }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" className="h-11" />}>
        Tampilkan kode
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Kode kelas {name}</DialogTitle>
          <DialogDescription>Tulis kode ini di papan tulis untuk siswa.</DialogDescription>
        </DialogHeader>
        <p
          aria-label={`Kode: ${code.split("").join(" ")}`}
          className="text-center font-mono text-5xl font-bold tracking-widest sm:text-7xl"
        >
          {groupCode(code)}
        </p>
      </DialogContent>
    </Dialog>
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
