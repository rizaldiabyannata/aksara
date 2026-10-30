"use client";

import { useActionState } from "react";
import { ConfirmAction } from "@/components/confirm-action";
import { Feedback } from "@/components/form-feedback";
import { FormField } from "@/components/form-field";
import { FloppyDiskIcon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
  "h-12 w-full rounded-xl border-2 border-input bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring aria-invalid:border-destructive";

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
  const INPUT =
    "w-full h-11 px-4 rounded-xl bg-[#fcf8f7] border border-stone-200 text-text-primary font-body-md text-xs placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary-container focus-visible:ring-[3px] focus-visible:ring-ring aria-invalid:border-destructive";
  const LABEL = "font-label-md text-xs font-bold text-text-primary";
  const err = (id: string, e?: string) =>
    e && (
      <p id={`${id}-error`} className="text-sm text-destructive">
        {e}
      </p>
    );
  const classId = state?.values?.classId ?? defaultClassId;
  return (
    <form action={formAction} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
      <div className="md:col-span-4 flex flex-col gap-1.5">
        <label className={LABEL} htmlFor="displayName">
          Nama siswa <span className="text-tone-danger">*</span>
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          required
          autoComplete="off"
          placeholder="Contoh: Ahmad Fauzi"
          defaultValue={state?.values?.displayName}
          aria-invalid={state?.fieldErrors?.displayName ? true : undefined}
          aria-describedby={state?.fieldErrors?.displayName ? "displayName-error" : undefined}
          className={INPUT}
        />
        {err("displayName", state?.fieldErrors?.displayName)}
      </div>
      <div className="md:col-span-2 flex flex-col gap-1.5">
        <label className={LABEL} htmlFor="nis">
          NIS (boleh dikosongkan)
        </label>
        <input
          id="nis"
          name="nis"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Contoh: 202401"
          defaultValue={state?.values?.nis}
          aria-invalid={state?.fieldErrors?.nis ? true : undefined}
          aria-describedby={state?.fieldErrors?.nis ? "nis-error" : undefined}
          className={INPUT}
        />
        {err("nis", state?.fieldErrors?.nis)}
      </div>
      <div className="md:col-span-2 flex flex-col gap-1.5">
        <label className={LABEL} htmlFor="studentNo">
          No. Induk (boleh kosong)
        </label>
        <input
          id="studentNo"
          name="studentNo"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Contoh: 976"
          defaultValue={state?.values?.studentNo}
          aria-invalid={state?.fieldErrors?.studentNo ? true : undefined}
          aria-describedby={state?.fieldErrors?.studentNo ? "studentNo-error" : undefined}
          className={INPUT}
        />
        {err("studentNo", state?.fieldErrors?.studentNo)}
      </div>
      <div className="md:col-span-2 flex flex-col gap-1.5">
        <label className={LABEL} htmlFor="classId">
          Kelas <span className="text-tone-danger">*</span>
        </label>
        {/* React applies a select's defaultValue only on mount; the key remounts it when it changes. */}
        <select
          key={classId}
          id="classId"
          name="classId"
          required
          defaultValue={classId ?? ""}
          className={`${INPUT} px-3.5 font-label-md font-medium`}
          aria-invalid={state?.fieldErrors?.classId ? true : undefined}
          aria-describedby={state?.fieldErrors?.classId ? "classId-error" : undefined}
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
        {err("classId", state?.fieldErrors?.classId)}
      </div>
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="w-full h-11 px-4 bg-tone-success text-white font-label-md text-xs font-bold rounded-xl shadow-xs hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5 focus-visible:ring-[3px] focus-visible:ring-ring outline-none"
        >
          <HugeiconsIcon icon={FloppyDiskIcon} className="size-[18px]" aria-hidden="true" />
          <span>{pending ? "Sedang menyimpan…" : "Tambah siswa"}</span>
        </button>
      </div>
      <div className="md:col-span-12">
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function EditStudentDialog({
  student,
  classes,
}: {
  student: { id: string; displayName: string; nis: string | null; studentNo: string | null; classId: string | null };
  classes: ClassOption[];
}) {
  const [state, formAction, pending] = useActionState(
    updateStudentAction.bind(null, student.id),
    undefined,
  );
  const sid = student.id;
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button className="h-11! px-3.5! rounded-xl! bg-white! text-text-primary! border! border-stone-200! font-label-md text-xs font-bold hover:bg-stone-50! shadow-xs gap-1.5" />
        }
      >
        <HugeiconsIcon icon={PencilEdit02Icon} className="size-[17px] text-stone-500" aria-hidden="true" />
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
          <FormField
            name="studentNo"
            id={`studentNo-${sid}`}
            label="No. Induk (boleh kosong)"
            defaultValue={state?.values?.studentNo ?? student.studentNo ?? ""}
            inputMode="numeric"
            autoComplete="off"
            error={state?.fieldErrors?.studentNo}
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
