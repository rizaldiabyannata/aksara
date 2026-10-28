"use client";

import { startTransition, useActionState } from "react";
import { ConfirmAction } from "@/components/confirm-action";
import { Feedback } from "@/components/form-feedback";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Difficulty, QuestionStatus, QuestionType } from "@/lib/generated/prisma/enums";
import {
  createQuestionAction,
  deleteQuestionAction,
  duplicateQuestionAction,
  setQuestionStatusAction,
  updateQuestionAction,
} from "./actions";
import { DIFFICULTY_LABEL } from "./labels";

export type ChapterOption = {
  id: string;
  label: string;
  subchapters: { id: string; label: string }[];
};
// Flat string defaults, same shape as the `values` echo, so one reader serves both.
export type Defaults = Record<string, string>;

const controlClass =
  "w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive";
const SLOTS = "abcdefgh";
const ALT_HINT = "Teks alternatif jangan membocorkan jawaban. Tulis mis. “Gambar A”.";
const IMG_HINT = "Sisipkan gambar dengan kode dari panel Gambar (ada di halaman ubah soal).";

function Err({ id, text }: { id: string; text?: string }) {
  return text ? (
    <p id={id} className="text-sm text-destructive">
      {text}
    </p>
  ) : null;
}

/** Defaults for the edit form, derived from a QuestionDetail-like object. */
export function toDefaults(q: {
  type: QuestionType;
  chapterId: string;
  subchapterId: string | null;
  prompt: string;
  explanation: string | null;
  defaultPoints: number;
  difficulty: Difficulty;
  sourceReference: string | null;
  verificationNote: string | null;
  options: { id: string; text: string }[] | null;
  answerKey: Record<string, unknown>;
}): Defaults {
  const d: Defaults = {
    chapterId: q.chapterId,
    subchapterId: q.subchapterId ?? "",
    prompt: q.prompt,
    explanation: q.explanation ?? "",
    defaultPoints: String(q.defaultPoints),
    difficulty: q.difficulty,
    sourceReference: q.sourceReference ?? "",
    verificationNote: q.verificationNote ?? "",
  };
  for (const o of q.options ?? []) d[`option_${o.id}`] = o.text;
  const k = q.answerKey;
  if (q.type === "SINGLE_CHOICE") d.correct = String(k.optionId);
  if (q.type === "TRUE_FALSE") d.correct = String(k.value);
  if (q.type === "MULTIPLE_SELECT") d.correct = (k.optionIds as string[]).join(",");
  if (q.type === "SHORT_ANSWER") {
    d.accepted = (k.accepted as string[]).join("\n");
    if (k.caseSensitive) d.caseSensitive = "on";
  }
  if (q.type === "ESSAY") d.rubric = String(k.rubric ?? "");
  return d;
}

function Area({
  name, label, rows, v, error, mono, required,
}: {
  name: string; label: string; rows: number; v: string; error?: string; mono?: boolean; required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        required={required}
        className={`${controlClass} py-2${mono ? " font-mono text-sm" : ""}`}
        defaultValue={v}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      <Err id={`${name}-error`} text={error} />
    </div>
  );
}

function KeyFields({
  type, v, e,
}: {
  type: QuestionType; v: (n: string) => string; e?: Record<string, string>;
}) {
  const err = [e?.options, e?.answerKey].filter(Boolean) as string[];
  const correct = v("correct").split(",");
  const describedBy = err.length ? "key-error" : undefined;
  const errors = err.length ? <p id="key-error" className="text-sm text-destructive">{err.join(" ")}</p> : null;

  if (type === "SINGLE_CHOICE" || type === "MULTIPLE_SELECT") {
    const slots = [...SLOTS].slice(0, type === "SINGLE_CHOICE" ? 6 : 8);
    const multi = type === "MULTIPLE_SELECT";
    return (
      <fieldset className="flex flex-col gap-3 rounded-lg border p-3" aria-describedby={describedBy}>
        <legend className="px-1 font-medium">
          {multi ? "Opsi (isi 3 sampai 8, centang yang benar)" : "Opsi (isi 2 sampai 6, pilih yang benar)"}
        </legend>
        {slots.map((id) => (
          <div key={id} className="flex items-end gap-3">
            <div className="flex-1">
              <FormField
                id={`option_${id}`}
                name={`option_${id}`}
                label={`Opsi ${id.toUpperCase()}`}
                autoComplete="off"
                defaultValue={v(`option_${id}`)}
                aria-invalid={err.length ? true : undefined}
              />
            </div>
            <label className="flex min-h-11 items-center gap-2">
              <input
                type={multi ? "checkbox" : "radio"}
                name="correct"
                value={id}
                defaultChecked={correct.includes(id)}
                className="size-5"
              />
              <span>Benar<span className="sr-only"> untuk opsi {id.toUpperCase()}</span></span>
            </label>
          </div>
        ))}
        <p className="text-sm text-muted-foreground">{IMG_HINT} {ALT_HINT}</p>
        {errors}
      </fieldset>
    );
  }
  if (type === "TRUE_FALSE") {
    return (
      <fieldset className="flex flex-col gap-2 rounded-lg border p-3" aria-describedby={describedBy}>
        <legend className="px-1 font-medium">Jawaban yang benar</legend>
        {[["true", "Benar"], ["false", "Salah"]].map(([val, label]) => (
          <label key={val} className="flex min-h-11 items-center gap-2">
            <input type="radio" name="correct" value={val} defaultChecked={v("correct") === val} className="size-5" />
            {label}
          </label>
        ))}
        {errors}
      </fieldset>
    );
  }
  if (type === "SHORT_ANSWER") {
    return (
      <fieldset className="flex flex-col gap-3 rounded-lg border p-3" aria-describedby={describedBy}>
        <legend className="px-1 font-medium">Jawaban yang diterima</legend>
        <Area name="accepted" label="Jawaban diterima (satu per baris)" rows={4} v={v("accepted")} />
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" name="caseSensitive" defaultChecked={v("caseSensitive") === "on"} className="size-5" />
          Huruf besar dan kecil dibedakan
        </label>
        {errors}
      </fieldset>
    );
  }
  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border p-3" aria-describedby={describedBy}>
      <legend className="px-1 font-medium">Rubrik penilaian</legend>
      <Area name="rubric" label="Rubrik (opsional)" rows={4} v={v("rubric")} />
      {errors}
    </fieldset>
  );
}

export function QuestionForm({
  chapters,
  type,
  question,
}: {
  chapters: ChapterOption[];
  type: QuestionType;
  question?: { id: string; defaults: Defaults };
}) {
  const [state, formAction, pending] = useActionState(
    question ? updateQuestionAction.bind(null, question.id) : createQuestionAction.bind(null, type),
    undefined,
  );
  const v = (name: string) => state?.values?.[name] ?? question?.defaults[name] ?? "";
  const e = state?.fieldErrors;
  const sel = (name: string, label: string, children: React.ReactNode, required = true) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        required={required}
        className={`${controlClass} h-11`}
        defaultValue={v(name)}
        aria-invalid={e?.[name] ? true : undefined}
        aria-describedby={e?.[name] ? `${name}-error` : undefined}
      >
        {children}
      </select>
      <Err id={`${name}-error`} text={e?.[name]} />
    </div>
  );
  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-4">
      <input type="hidden" name="type" value={type} />
      {sel("chapterId", "Bab", (
        <>
          <option value="">Pilih bab</option>
          {chapters.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </>
      ))}
      {sel("subchapterId", "Subbab (opsional)", (
        <>
          <option value="">Tanpa subbab</option>
          {chapters.map((c) => (
            <optgroup key={c.id} label={c.label}>
              {c.subchapters.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </optgroup>
          ))}
        </>
      ), false)}
      <div className="flex flex-col gap-2">
        <Area name="prompt" label="Teks soal" rows={5} v={v("prompt")} error={e?.prompt} mono required />
        <p className="text-sm text-muted-foreground">Bisa pakai Markdown. {IMG_HINT}</p>
      </div>
      <KeyFields type={type} v={v} e={e} />
      <Area name="explanation" label="Pembahasan (opsional)" rows={4} v={v("explanation")} error={e?.explanation} mono />
      <FormField id="defaultPoints" name="defaultPoints" label="Poin (1 sampai 100)" required inputMode="numeric" autoComplete="off" defaultValue={v("defaultPoints") || "1"} error={e?.defaultPoints} />
      {sel("difficulty", "Kesulitan", (
        <>
          <option value="">Pilih tingkat</option>
          {Object.entries(DIFFICULTY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </>
      ))}
      <FormField id="sourceReference" name="sourceReference" label="Sumber (opsional)" autoComplete="off" defaultValue={v("sourceReference")} error={e?.sourceReference} />
      <Area name="verificationNote" label="Catatan verifikasi (opsional)" rows={3} v={v("verificationNote")} error={e?.verificationNote} />
      <Feedback state={state} />
      <Button type="submit" className="h-11 text-base" disabled={pending} aria-busy={pending}>
        {pending ? "Sedang menyimpan…" : question ? "Simpan soal" : "Buat soal"}
      </Button>
    </form>
  );
}

export function QuestionActions({ id, status, canDelete }: { id: string; status: QuestionStatus; canDelete: boolean }) {
  const to = status === "ACTIVE" ? "DRAFT" : "ACTIVE";
  const [state, dispatch, pending] = useActionState(
    () => setQuestionStatusAction(id, to),
    undefined,
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="h-11" disabled={pending} onClick={() => startTransition(() => dispatch())}>
          {to === "ACTIVE" ? "Aktifkan" : "Jadikan draft"}
        </Button>
        <ConfirmAction
          action={duplicateQuestionAction.bind(null, id)}
          trigger="Duplikat"
          title="Duplikat soal ini?"
          description="Salinan baru dibuat sebagai draf, lengkap dengan gambarnya."
          confirm="Duplikat"
        />
        {canDelete && (
          <ConfirmAction
            action={deleteQuestionAction.bind(null, id)}
            trigger="Hapus soal"
            title="Hapus soal ini?"
            description="Soal dan gambarnya dihapus selamanya. Ini tidak bisa dibatalkan."
            confirm="Hapus"
            destructive
          />
        )}
      </div>
      <Feedback state={state} />
    </div>
  );
}
