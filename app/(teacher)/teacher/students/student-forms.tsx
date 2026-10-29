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
import { Label } from "@/components/ui/label";
import {
  createStudentAction,
  revokeStudentSessionsAction,
  setStudentActiveAction,
  updateStudentAction,
} from "./actions";

export type ClassOption = { id: string; name: string; isActive: boolean };

const SELECT =
  "h-12 w-full rounded-xl border-2 border-input bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30 aria-invalid:border-destructive";

function ClassSelect({
  id,
  classes,
  defaultValue,
  error,
}: {
  id: string;
  classes: ClassOption[];
  defaultValue?: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Kelas</Label>
      {/* React applies a select's defaultValue only on mount; the key remounts it when it changes. */}
      <select
        key={defaultValue}
        id={id}
        name="classId"
        required
        defaultValue={defaultValue ?? ""}
        className={SELECT}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        <option value="" disabled>
          Pilih kelas
        </option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.isActive ? "" : " (nonaktif)"}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function CreateStudentForm({
  classes,
  defaultClassId,
}: {
  classes: ClassOption[];
  defaultClassId?: string;
}) {
  const [state, formAction, pending] = useActionState(createStudentAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormField
        name="displayName"
        label="Nama siswa"
        autoComplete="off"
        required
        defaultValue={state?.values?.displayName}
        error={state?.fieldErrors?.displayName}
      />
      <FormField
        name="nis"
        label="NIS (boleh dikosongkan)"
        inputMode="numeric"
        autoComplete="off"
        defaultValue={state?.values?.nis}
        error={state?.fieldErrors?.nis}
      />
      <ClassSelect
        id="classId"
        classes={classes}
        defaultValue={state?.values?.classId ?? defaultClassId}
        error={state?.fieldErrors?.classId}
      />
      <Feedback state={state} />
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? "Sedang menyimpan…" : "Tambah siswa"}
      </Button>
    </form>
  );
}

export function EditStudentDialog({
  student,
  classes,
}: {
  student: { id: string; displayName: string; nis: string | null; classId: string | null };
  classes: ClassOption[];
}) {
  const [state, formAction, pending] = useActionState(
    updateStudentAction.bind(null, student.id),
    undefined,
  );
  const sid = student.id;
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" className="h-11" />}>
        Ubah data
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ubah data siswa</DialogTitle>
          <DialogDescription>
            Kalau nama diubah, sampaikan nama yang baru kepada siswa karena nama itu dipakai
            untuk masuk. Kalau kelas dipindah, siswa memakai kode kelas yang baru saat masuk
            berikutnya.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <FormField
            name="displayName"
            id={`name-${sid}`}
            label="Nama siswa"
            defaultValue={state?.values?.displayName ?? student.displayName}
            autoComplete="off"
            required
            error={state?.fieldErrors?.displayName}
          />
          <FormField
            name="nis"
            id={`nis-${sid}`}
            label="NIS (boleh dikosongkan)"
            defaultValue={state?.values?.nis ?? student.nis ?? ""}
            inputMode="numeric"
            autoComplete="off"
            error={state?.fieldErrors?.nis}
          />
          <ClassSelect
            id={`class-${sid}`}
            classes={classes}
            defaultValue={state?.values?.classId ?? student.classId ?? undefined}
            error={state?.fieldErrors?.classId}
          />
          <Feedback state={state} />
          <Button type="submit" className="h-11" disabled={pending} aria-busy={pending}>
            {pending ? "Sedang menyimpan…" : "Simpan"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RevokeStudentButton({ studentId }: { studentId: string }) {
  return (
    <ConfirmAction
      action={revokeStudentSessionsAction.bind(null, studentId)}
      trigger="Keluarkan dari perangkat"
      title="Keluarkan siswa dari semua perangkat?"
      description="Siswa ini akan keluar dari semua perangkatnya dan harus masuk lagi dengan kode kelas."
      confirm="Ya, keluarkan"
      destructive
    />
  );
}

export function ToggleStudentActiveButton({
  studentId,
  isActive,
}: {
  studentId: string;
  isActive: boolean;
}) {
  return isActive ? (
    <ConfirmAction
      action={setStudentActiveAction.bind(null, studentId, false)}
      trigger="Nonaktifkan"
      title="Nonaktifkan siswa ini?"
      description="Siswa ini akan keluar dan tidak bisa masuk sampai diaktifkan lagi. Datanya tetap tersimpan."
      confirm="Ya, nonaktifkan"
      destructive
    />
  ) : (
    <ConfirmAction
      action={setStudentActiveAction.bind(null, studentId, true)}
      trigger="Aktifkan"
      title="Aktifkan siswa ini?"
      description="Siswa ini bisa masuk lagi dengan kode kelas."
      confirm="Ya, aktifkan"
    />
  );
}
