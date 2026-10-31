"use client";

import { useActionState, useState } from "react";
import { FormField } from "@/components/form-field";
import { Feedback } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/form-state";
import { saveAttendanceAction, setHolidayAction } from "./actions";

type Status = "HADIR" | "SAKIT" | "IZIN" | "ALPA";
type Student = { id: string; displayName: string; nis: string | null; status: Status | null };

const OPTIONS: { value: Status; letter: string; label: string; on: string }[] = [
  { value: "HADIR", letter: "H", label: "Hadir", on: "peer-checked:bg-tone-success peer-checked:text-white peer-checked:border-tone-success" },
  { value: "SAKIT", letter: "S", label: "Sakit", on: "peer-checked:bg-tone-info peer-checked:text-white peer-checked:border-tone-info" },
  { value: "IZIN", letter: "I", label: "Izin", on: "peer-checked:bg-tone-warning peer-checked:text-white peer-checked:border-tone-warning" },
  { value: "ALPA", letter: "A", label: "Alpa", on: "peer-checked:bg-tone-danger peer-checked:text-white peer-checked:border-tone-danger" },
];

export function AttendanceForm({ classId, date, students }: { classId: string; date: string; students: Student[] }) {
  const [marks, setMarks] = useState<Record<string, Status | null>>(() =>
    Object.fromEntries(students.map((s) => [s.id, s.status])),
  );
  const [state, save, pending] = useActionState<FormState>(
    () =>
      saveAttendanceAction(
        classId,
        date,
        Object.entries(marks).flatMap(([studentId, status]) => (status ? [{ studentId, status }] : [])),
      ),
    undefined,
  );
  const blank = students.filter((s) => !marks[s.id]).length;

  return (
    <form action={save} onReset={(event) => event.preventDefault()} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-body-md text-sm text-text-muted" aria-live="polite">
          {blank ? `${blank} siswa belum diisi.` : "Semua siswa sudah diisi."}
        </p>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={!blank}
          onClick={() => setMarks((m) => Object.fromEntries(Object.entries(m).map(([id, st]) => [id, st ?? "HADIR"])))}
        >
          Sisanya hadir
        </Button>
      </div>
      <ul className="flex flex-col divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
        {students.map((s, i) => (
          <li key={s.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-bold text-text-primary break-words">
                <span className="text-text-muted font-semibold mr-2">{i + 1}.</span>
                {s.displayName}
              </p>
              {s.nis && <p className="text-xs text-text-muted">NISN {s.nis}</p>}
            </div>
            <fieldset className="flex gap-2 shrink-0">
              <legend className="sr-only">Kehadiran {s.displayName}</legend>
              {OPTIONS.map((o) => (
                <label key={o.value} className="relative cursor-pointer">
                  <input
                    type="radio"
                    name={`s-${s.id}`}
                    value={o.value}
                    checked={marks[s.id] === o.value}
                    onChange={() => setMarks((m) => ({ ...m, [s.id]: o.value }))}
                    className="peer sr-only"
                  />
                  <span
                    className={`flex h-12 min-w-14 flex-col items-center justify-center rounded-xl border-2 border-stone-200 bg-white px-2 text-text-primary transition-colors peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring ${o.on}`}
                  >
                    <span className="text-base font-extrabold leading-none" aria-hidden="true">{o.letter}</span>
                    <span className="text-[11px] font-semibold leading-tight">{o.label}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          </li>
        ))}
      </ul>
      <Feedback state={state} />
      <Button type="submit" className="h-12 sm:self-end" disabled={pending || blank === students.length} aria-busy={pending}>
        {pending ? "Sedang menyimpan…" : "Simpan absensi"}
      </Button>
    </form>
  );
}

export function HolidayForm({ date }: { date: string }) {
  const [state, action, pending] = useActionState(setHolidayAction.bind(null, date), undefined);
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <FormField
          name="note"
          id="holiday-note"
          label="Keterangan libur"
          placeholder="Contoh: HUT Kemerdekaan RI"
          defaultValue={state?.values?.note}
          autoComplete="off"
          required
          error={state?.fieldErrors?.note ?? state?.fieldErrors?.date}
        />
      </div>
      <Button type="submit" variant="outline" className="h-12" disabled={pending} aria-busy={pending}>
        {pending ? "Sedang menyimpan…" : "Jadikan hari libur"}
      </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
