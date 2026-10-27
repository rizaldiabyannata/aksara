"use client";

import { useActionState, useId, useState } from "react";
import { FormField, FormMessage } from "@/components/form-field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { FormState } from "@/lib/form-state";
import {
  createClassAction,
  renameClassAction,
  revokeClassSessionsAction,
  rotateClassCodeAction,
  setClassActiveAction,
} from "./actions";

/** "ABCDEF" -> "ABC DEF" (login accepts the space). */
export const groupCode = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;

/** Form-level feedback: errors are announced as alerts, successes politely. */
function Feedback({ state }: { state: FormState }) {
  if (state?.message === undefined) return null;
  const failed = /sudah dipakai|tidak ditemukan|Ada masalah/.test(state.message);
  return failed ? (
    <FormMessage message={state.message} />
  ) : (
    <p role="status" className="text-sm font-medium text-muted-foreground">
      {state.message}
    </p>
  );
}

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
        defaultValue={name}
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

type ConfirmProps = {
  action: (prev: FormState) => Promise<FormState>;
  trigger: string;
  title: string;
  description: string;
  confirm: string;
  destructive?: boolean;
};

/** Button + AlertDialog confirmation. The form lives outside the dialog so closing it never cancels the submit. */
export function ConfirmAction({
  action,
  trigger,
  title,
  description,
  confirm,
  destructive,
}: ConfirmProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [open, setOpen] = useState(false);
  const formId = useId();
  return (
    <div className="flex flex-col gap-2">
      <form id={formId} action={formAction} />
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger
          render={<Button variant="outline" className="h-11" disabled={pending} />}
        >
          {trigger}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Batal</AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              form={formId}
              variant={destructive ? "destructive" : "default"}
              className="h-11"
              onClick={() => setOpen(false)}
            >
              {confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Feedback state={state} />
    </div>
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
