"use client";

import { startTransition, useActionState } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon, Settings02Icon, UnfoldMoreIcon, ViewIcon, LockIcon,
} from "@hugeicons/core-free-icons";
import { ConfirmAction } from "@/components/confirm-action";
import { Feedback } from "@/components/form-feedback";
import { FormMessage } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import type { QuestionStatus, QuestionType } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";
import {
  createQuestionAction,
  deleteQuestionAction,
  duplicateQuestionAction,
  setQuestionStatusAction,
  updateQuestionAction,
} from "./actions";
import { DIFFICULTY_LABEL } from "./labels";
import type { Defaults } from "./question-defaults";

export type ChapterOption = {
  id: string;
  label: string;
  subchapters: { id: string; label: string }[];
};

const ring = "focus-visible:ring-[3px] focus-visible:ring-ring";
const fieldClass = `border border-border-subtle focus:border-border-active focus:bg-surface-card focus:outline-none aria-invalid:border-destructive ${ring}`;
const selectClass = `w-full h-11 px-3.5 pr-8 rounded-xl bg-surface-container-low text-text-primary text-sm font-semibold appearance-none cursor-pointer ${fieldClass}`;
const inputClass = `w-full h-11 px-3.5 rounded-xl bg-surface-container-low text-text-primary text-sm ${fieldClass}`;
const areaClass = `w-full p-3.5 rounded-xl bg-surface-bright text-text-primary text-sm leading-relaxed resize-y ${fieldClass}`;
const labelClass = "text-xs font-bold text-text-muted uppercase tracking-wider";
const SLOTS = "abcdefgh";
const ALT_HINT = "Teks alternatif jangan membocorkan jawaban. Tulis mis. “Gambar A”.";
const IMG_HINT = "Sisipkan gambar dengan kode dari panel Gambar (ada di halaman ubah soal).";
const HARD_LEVEL: Record<string, string> = { EASY: "LOTS", MEDIUM: "MOTS", HARD: "HOTS" };

function Err({ id, text }: { id: string; text?: string }) {
  return text ? (
    <p id={id} className="text-base text-destructive">
      {text}
    </p>
  ) : null;
}

function Sec({
  n, icon, title, hint, children,
}: {
  n?: string; icon?: IconSvgElement; title: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <section className="bg-surface-card rounded-2xl p-space-lg border border-border-subtle shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-2.5 pb-3 border-b border-border-subtle">
        {n && (
          <span aria-hidden="true" className="w-7 h-7 rounded-lg bg-primary-fixed text-primary-strong font-bold font-code-mono text-xs flex items-center justify-center">
            {n}
          </span>
        )}
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-canvas-peach flex items-center justify-center text-primary-container">
            <HugeiconsIcon icon={icon} className="size-5" aria-hidden="true" />
          </div>
        )}
        <div>
          <h2 className="text-base font-bold text-text-primary">{title}</h2>
          {hint && <p className="text-xs text-text-muted">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Area({
  name, label, rows, v, error, mono, required, note,
}: {
  name: string; label: string; rows: number; v: string; error?: string; mono?: boolean; required?: boolean; note?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={name} className="text-xs font-bold text-text-primary">{label}</label>
        {note}
      </div>
      <textarea
        id={name}
        name={name}
        rows={rows}
        required={required}
        className={cn(areaClass, mono && "font-mono")}
        defaultValue={v}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      <Err id={`${name}-error`} text={error} />
    </div>
  );
}

function Inp({
  name, label, v, error, required, inputMode,
}: {
  name: string; label: string; v: string; error?: string; required?: boolean; inputMode?: "numeric";
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className={labelClass}>{label}</label>
      <input
        id={name}
        name={name}
        defaultValue={v}
        required={required}
        inputMode={inputMode}
        autoComplete="off"
        className={inputClass}
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
  const errors = err.length ? <p id="key-error" className="text-base text-destructive">{err.join(" ")}</p> : null;
  const row = "flex items-start gap-3 p-3 rounded-xl bg-surface-container-low border border-border-subtle has-[:checked]:bg-tone-success-bg has-[:checked]:border-2 has-[:checked]:border-tone-success has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring";

  if (type === "SINGLE_CHOICE" || type === "MULTIPLE_SELECT") {
    const slots = [...SLOTS].slice(0, type === "SINGLE_CHOICE" ? 6 : 8);
    const multi = type === "MULTIPLE_SELECT";
    return (
      <fieldset className="flex flex-col gap-3" aria-describedby={describedBy}>
        <legend className="sr-only">
          {multi ? "Opsi (isi 3 sampai 8, centang yang benar)" : "Opsi (isi 2 sampai 6, pilih yang benar)"}
        </legend>
        <p className="text-sm text-text-muted">
          {multi ? "Isi 3 sampai 8 opsi, centang yang benar." : "Isi 2 sampai 6 opsi, pilih yang benar."}
        </p>
        {slots.map((id) => (
          <div key={id} className={row}>
            <label className="flex items-center justify-center min-h-11 min-w-8 cursor-pointer">
              <input
                type={multi ? "checkbox" : "radio"}
                name="correct"
                value={id}
                defaultChecked={correct.includes(id)}
                className="w-5 h-5 accent-tone-success cursor-pointer"
              />
              <span className="sr-only">Benar untuk opsi {id.toUpperCase()}</span>
            </label>
            <div className="w-8 h-8 mt-1.5 rounded-lg bg-surface-card text-text-primary font-bold font-code-mono text-sm flex items-center justify-center border border-border-subtle shrink-0">
              {id.toUpperCase()}
            </div>
            <div className="flex-1">
              <input
                id={`option_${id}`}
                name={`option_${id}`}
                aria-label={`Opsi ${id.toUpperCase()}`}
                autoComplete="off"
                defaultValue={v(`option_${id}`)}
                aria-invalid={err.length ? true : undefined}
                className={cn("w-full h-11 px-3.5 rounded-lg bg-surface-card text-text-primary text-sm", fieldClass)}
              />
            </div>
          </div>
        ))}
        <p className="text-sm text-text-muted">{IMG_HINT} {ALT_HINT}</p>
        {errors}
      </fieldset>
    );
  }
  if (type === "TRUE_FALSE") {
    return (
      <fieldset className="flex flex-col gap-3" aria-describedby={describedBy}>
        <legend className="sr-only">Jawaban yang benar</legend>
        {[["true", "Benar"], ["false", "Salah"]].map(([val, label]) => (
          <label key={val} className={cn(row, "items-center cursor-pointer min-h-12 font-semibold text-sm")}>
            <input type="radio" name="correct" value={val} defaultChecked={v("correct") === val} className="w-5 h-5 accent-tone-success" />
            {label}
          </label>
        ))}
        {errors}
      </fieldset>
    );
  }
  if (type === "SHORT_ANSWER") {
    return (
      <fieldset className="flex flex-col gap-3" aria-describedby={describedBy}>
        <legend className="sr-only">Jawaban yang diterima</legend>
        <Area name="accepted" label="Jawaban diterima (satu per baris)" rows={4} v={v("accepted")} />
        <label className="flex min-h-11 items-center gap-3 text-xs font-semibold text-text-primary">
          <input type="checkbox" name="caseSensitive" defaultChecked={v("caseSensitive") === "on"} className="w-5 h-5 accent-primary-container" />
          Huruf besar dan kecil dibedakan
        </label>
        {errors}
      </fieldset>
    );
  }
  return (
    <fieldset className="flex flex-col gap-3" aria-describedby={describedBy}>
      <legend className="sr-only">Rubrik penilaian</legend>
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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className={labelClass}>{label}</label>
      <div className="relative">
        <select
          id={name}
          name={name}
          required={required}
          className={selectClass}
          defaultValue={v(name)}
          aria-invalid={e?.[name] ? true : undefined}
          aria-describedby={e?.[name] ? `${name}-error` : undefined}
        >
          {children}
        </select>
        <HugeiconsIcon icon={UnfoldMoreIcon} className="absolute right-2.5 top-3 size-[18px] text-outline pointer-events-none" aria-hidden="true" />
      </div>
      <Err id={`${name}-error`} text={e?.[name]} />
    </div>
  );
  return (
    <form action={formAction} className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start pb-space-lg">
      <input type="hidden" name="type" value={type} />
      <div className="lg:col-span-8 flex min-w-0 flex-col gap-space-lg">
        <Sec n="01" title="Struktur Capaian & Kurikulum">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {sel("chapterId", "Bab Pembelajaran", (
              <>
                <option value="">Pilih bab</option>
                {chapters.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </>
            ))}
            {sel("subchapterId", "Topik / Subbab (opsional)", (
              <>
                <option value="">Tanpa subbab</option>
                {chapters.map((c) => (
                  <optgroup key={c.id} label={c.label}>
                    {c.subchapters.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </optgroup>
                ))}
              </>
            ), false)}
          </div>
        </Sec>
        <Sec n="02" title="Teks / Stimulus Soal (Mendukung Markdown)" hint="Tuliskan narasi stimulus kontekstual atau instruksi pertanyaan langsung untuk siswa">
          <Area name="prompt" label="Teks soal" rows={5} v={v("prompt")} error={e?.prompt} mono required />
          <p className="text-xs text-text-muted">{IMG_HINT}</p>
          <Inp name="sourceReference" label="Sumber (opsional)" v={v("sourceReference")} error={e?.sourceReference} />
        </Sec>
        <Sec n="03" title="Pilihan Opsi & Kunci Jawaban" hint="Kunci jawaban hanya terlihat oleh guru">
          <KeyFields type={type} v={v} e={e} />
        </Sec>
        <Sec n="04" title="Pembahasan & Verifikasi Guru" hint="Klarifikasi konsep untuk materi tindak lanjut dan catatan kurikulum internal pendidik">
          <Area
            name="explanation" label="Pembahasan Soal untuk Siswa (opsional)" rows={4} v={v("explanation")} error={e?.explanation} mono
            note={<span className="text-[11px] text-tone-info font-semibold flex items-center gap-1"><HugeiconsIcon icon={ViewIcon} className="size-[15px]" aria-hidden="true" />Dapat dibaca siswa</span>}
          />
          <Area
            name="verificationNote" label="Catatan Verifikasi & Asesmen Guru (opsional)" rows={3} v={v("verificationNote")} error={e?.verificationNote}
            note={<span className="text-[11px] text-outline font-semibold flex items-center gap-1"><HugeiconsIcon icon={LockIcon} className="size-[15px]" aria-hidden="true" />Privat Guru</span>}
          />
        </Sec>
      </div>
      <div className="lg:col-span-4 flex flex-col gap-space-lg">
        <Sec icon={Settings02Icon} title="Parameter Soal" hint="Konfigurasi bobot dan tingkat kesulitan">
          <fieldset className="flex flex-col gap-1.5">
            <legend className={labelClass}>Tingkat Kesulitan</legend>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {Object.entries(DIFFICULTY_LABEL).map(([k, l], i) => (
                <label
                  key={k}
                  className="relative py-2 px-1 min-h-12 rounded-xl bg-surface-container-low border border-border-subtle hover:bg-canvas-peach text-text-primary text-xs font-semibold text-center transition-all cursor-pointer has-[:checked]:bg-canvas-peach has-[:checked]:border-2 has-[:checked]:border-border-active has-[:checked]:text-primary-strong has-[:checked]:font-bold has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring"
                >
                  <input type="radio" name="difficulty" value={k} defaultChecked={v("difficulty") === k} required={i === 0} className="sr-only" />
                  {l}
                  <span className="block text-[10px] text-text-muted font-normal mt-0.5">{HARD_LEVEL[k]}</span>
                </label>
              ))}
            </div>
            <Err id="difficulty-error" text={e?.difficulty} />
          </fieldset>
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label htmlFor="defaultPoints" className={labelClass}>Bobot Poin</label>
              <span className="text-[11px] text-text-muted">Skala 1 - 100</span>
            </div>
            <input
              id="defaultPoints"
              name="defaultPoints"
              required
              inputMode="numeric"
              autoComplete="off"
              defaultValue={v("defaultPoints") || "1"}
              aria-invalid={e?.defaultPoints ? true : undefined}
              aria-describedby={e?.defaultPoints ? "defaultPoints-error" : undefined}
              className={cn(inputClass, "text-center font-bold text-xl")}
            />
            <Err id="defaultPoints-error" text={e?.defaultPoints} />
          </div>
        </Sec>
        <Feedback state={state} />
        <FormMessage message={e?.type} />
        <Button type="submit" className="h-12 rounded-xl bg-primary text-primary-foreground font-bold" disabled={pending} aria-busy={pending}>
          <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-5" aria-hidden="true" />
          {pending ? "Sedang menyimpan…" : question ? "Simpan soal" : "Buat soal"}
        </Button>
      </div>
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
