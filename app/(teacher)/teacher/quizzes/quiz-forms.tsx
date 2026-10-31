"use client";

import { ArrowDown01Icon, FileAddIcon, FloppyDiskIcon, LockIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { startTransition, useActionState } from "react";
import { ConfirmAction } from "@/components/confirm-action";
import { Feedback } from "@/components/form-feedback";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/form-state";
import type { QuizDetail } from "@/lib/quizzes";
import {
  addQuizQuestionAction, addQuizQuestionsAction, createQuizAction, moveQuizQuestionAction, publishQuizAction,
  releaseResultsAction, removeQuizQuestionAction, setQuizClassesAction, setQuizQuestionPointsAction,
  unpublishQuizAction, unreleaseResultsAction, updateQuizAction,
} from "./actions";
import { KIND_LABEL, POLICY_LABEL } from "./labels";

const controlClass =
  "h-12 w-full rounded-xl border-2 border-input bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring aria-invalid:border-destructive disabled:opacity-50";

export function CreateQuizForm({ subjects, chapter }: { subjects: { id: string; name: string }[]; chapter?: { id: string; title: string; subjectId: string } }) {
  const [state, action, pending] = useActionState(createQuizAction, undefined);
  const e = state?.fieldErrors;
  const field =
    "w-full min-h-12 px-space-md rounded-xl border border-border bg-surface-card text-text-primary font-body-md text-body-md shadow-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring aria-invalid:border-destructive";
  return (
    <>
      <div id="quick-wizard-card" className="flex flex-col gap-space-md rounded-2xl bg-surface-card p-space-lg shadow-md">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-primary-container" aria-hidden="true" />
              <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-primary-strong">Formulir Cepat</span>
            </div>
            <h2 className="mt-1 font-headline-sm text-headline-sm text-text-primary">Parameter Standar Ulangan Baru</h2>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-canvas-peach text-primary-strong">
            <HugeiconsIcon icon={FileAddIcon} className="size-[22px]" aria-hidden="true" />
          </div>
        </div>
        <p className="font-body-md text-body-md text-text-muted">
          Isi judul dan mata pelajaran. Soal, kelas, dan setelan lain diatur setelah ulangan dibuat.
        </p>
        <form action={action} className="mt-2 flex flex-col gap-space-md">
          {chapter && <input type="hidden" name="chapterId" value={chapter.id} />}
          {chapter && <p className="rounded-xl bg-tone-info-bg p-3 text-sm">Bab dipilih: <strong>{chapter.title}</strong>. Setelah ulangan dibuat, pilih kelas dan soal dari bab ini.</p>}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm text-text-primary" htmlFor="title">
              Judul Ulangan <span className="text-tone-danger">*</span>
            </label>
              <input id="title" name="title" required maxLength={150} defaultValue={state?.values?.title ?? (chapter ? `Ulangan: ${chapter.title}` : "")}
              placeholder="Contoh: Ulangan Harian Bab 1: Pecahan..." className={`${field} placeholder:text-text-muted`}
              aria-invalid={e?.title ? true : undefined} aria-describedby={e?.title ? "title-error" : undefined} />
            {e?.title && <p id="title-error" className="text-base text-destructive">{e.title}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm text-text-primary" htmlFor="subjectId">
              Mata Pelajaran <span className="text-tone-danger">*</span>
            </label>
            <div className="relative">
              <select id="subjectId" name="subjectId" required defaultValue={state?.values?.subjectId ?? chapter?.subjectId ?? ""}
                className={`${field} cursor-pointer appearance-none pr-10`} aria-invalid={e?.subjectId ? true : undefined}
                aria-describedby={e?.subjectId ? "subjectId-error" : undefined}>
                <option value="" disabled>Pilih mata pelajaran</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <HugeiconsIcon icon={ArrowDown01Icon} className="pointer-events-none absolute top-3.5 right-3 size-[22px] text-text-muted" aria-hidden="true" />
            </div>
            {e?.subjectId && <p id="subjectId-error" className="text-base text-destructive">{e.subjectId}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm text-text-primary" htmlFor="kind">Jenis</label>
            <div className="relative">
              <select id="kind" name="kind" defaultValue={state?.values?.kind ?? "REGULAR"}
                className={`${field} cursor-pointer appearance-none pr-10`} aria-describedby="kind-hint">
                {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <HugeiconsIcon icon={ArrowDown01Icon} className="pointer-events-none absolute top-3.5 right-3 size-[22px] text-text-muted" aria-hidden="true" />
            </div>
            <p id="kind-hint" className="font-body-md text-[13px] text-text-muted">Tryout TKA mulai dengan durasi 75 menit dan menampilkan kategori nilai perkiraan.</p>
          </div>
          <Feedback state={state} />
          <div className="flex flex-col gap-2 pt-2">
            <button type="submit" disabled={pending}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-container px-space-lg font-label-lg text-label-lg text-on-primary shadow-md transition-all hover:opacity-95 focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-50">
              <HugeiconsIcon icon={FloppyDiskIcon} className="size-[22px]" aria-hidden="true" />
              <span>Buat ulangan</span>
            </button>
          </div>
        </form>
        <div className="mt-1 flex items-start gap-3 rounded-xl bg-tone-info-bg/70 p-space-md">
          <HugeiconsIcon icon={LockIcon} className="mt-0.5 size-[22px] shrink-0 text-tone-info" aria-hidden="true" />
          <div className="flex flex-col gap-0.5">
            <span className="font-label-sm text-label-sm font-bold text-tone-info">Aturan Snapshot Terbit:</span>
            <p className="font-body-md text-[13px] leading-relaxed text-text-primary">
              Saat ulangan berstatus <strong>Terbit</strong>, soal dan kunci disalin permanen sebagai rekaman penilaian resmi, meskipun bank soal mengalami revisi.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

type Settings = Pick<
  QuizDetail,
  "title" | "kind" | "instructions" | "durationMinutes" | "maxAttempts" | "shuffleQuestions" | "shuffleOptions" |
  "showFeedbackAfterRelease" | "scoringPolicy" | "kkm" | "status"
> & { startsAt: string; endsAt: string };

/** A control locked after publish is shown disabled; a hidden input still sends its value so the save stays complete. */
export function SettingsForm({ id, q }: { id: string; q: Settings }) {
  const [state, action, pending] = useActionState(updateQuizAction.bind(null, id), undefined);
  const e = state?.fieldErrors;
  const v = state?.values;
  const locked = q.status === "PUBLISHED";
  const text = (name: string, fallback: string) => v?.[name] ?? fallback;
  const lockedField = (name: string, value: string) =>
    locked && <input type="hidden" name={name} value={value} />;
  const check = (name: "shuffleQuestions" | "shuffleOptions" | "showFeedbackAfterRelease", label: string) => {
    const on = v ? v[name] === "on" : q[name];
    return (
      <div className="flex flex-col gap-1">
        {lockedField(name, on ? "on" : "")}
        <label htmlFor={name} className="flex min-h-11 items-center gap-3">
          <input id={name} type="checkbox" name={name} defaultChecked={on} disabled={locked}
            className="size-6" aria-describedby={e?.[name] ? `${name}-error` : undefined} />
          <span className="font-medium">{label}</span>
        </label>
        {e?.[name] && <p id={`${name}-error`} className="text-sm text-destructive">{e[name]}</p>}
      </div>
    );
  };
  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      {locked && (
        <p role="note" className="rounded-lg border p-3 text-sm">
          Mengubah kebijakan nilai atau KKM dapat mengubah rekap semua siswa.
        </p>
      )}
      <FormField name="title" label="Judul" required maxLength={150} defaultValue={text("title", q.title)} error={e?.title} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="kind">Jenis</Label>
        <select id="kind" name="kind" defaultValue={text("kind", q.kind)} className={controlClass}>
          {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="instructions">Petunjuk</Label>
        <textarea id="instructions" name="instructions" rows={4} maxLength={5000}
          defaultValue={text("instructions", q.instructions ?? "")}
          className={`${controlClass} h-auto min-h-32 py-2`} aria-invalid={e?.instructions ? true : undefined}
          aria-describedby={e?.instructions ? "instructions-error" : undefined} />
        {e?.instructions && <p id="instructions-error" className="text-sm text-destructive">{e.instructions}</p>}
      </div>
      {lockedField("durationMinutes", text("durationMinutes", String(q.durationMinutes)))}
      <FormField name="durationMinutes" label="Durasi (menit)" type="number" inputMode="numeric" min={1} max={300}
        required defaultValue={text("durationMinutes", String(q.durationMinutes))} error={e?.durationMinutes} disabled={locked} />
      {lockedField("startsAt", text("startsAt", q.startsAt))}
      <FormField name="startsAt" label="Mulai (WITA)" type="datetime-local" defaultValue={text("startsAt", q.startsAt)}
        error={e?.startsAt} disabled={locked} />
      <FormField name="endsAt" label="Selesai (WITA)" type="datetime-local" defaultValue={text("endsAt", q.endsAt)}
        error={e?.endsAt} />
      <FormField name="maxAttempts" label="Batas percobaan" type="number" inputMode="numeric" min={1} max={10}
        required defaultValue={text("maxAttempts", String(q.maxAttempts))} error={e?.maxAttempts} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="scoringPolicy">Kebijakan nilai</Label>
        <select id="scoringPolicy" name="scoringPolicy" defaultValue={text("scoringPolicy", q.scoringPolicy)} className={controlClass}>
          {Object.entries(POLICY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <FormField name="kkm" label="KKM (0 sampai 100)" type="number" inputMode="numeric" min={0} max={100}
        defaultValue={text("kkm", q.kkm === null ? "" : String(q.kkm))} error={e?.kkm} />
      {check("shuffleQuestions", "Acak urutan soal")}
      {check("shuffleOptions", "Acak urutan pilihan")}
      {check("showFeedbackAfterRelease", "Tampilkan pembahasan setelah hasil dirilis")}
      <Feedback state={state} />
      <Button type="submit" className="h-11 text-base" disabled={pending}>Simpan</Button>
    </form>
  );
}

export function ClassesForm({
  id, classes, selected, published,
}: {
  id: string;
  classes: { id: string; name: string; isActive: boolean }[];
  selected: string[];
  published: boolean;
}) {
  const [state, action, pending] = useActionState(setQuizClassesAction.bind(null, id), undefined);
  return (
    <form action={action} className="flex flex-col gap-2">
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 font-medium">Kelas</legend>
        {classes.map((c) => {
          const lock = published && selected.includes(c.id);
          return (
            <label key={c.id} htmlFor={`class-${c.id}`} className="flex min-h-11 items-center gap-3">
              {lock && <input type="hidden" name="classId" value={c.id} />}
              <input id={`class-${c.id}`} type="checkbox" name="classId" value={c.id}
                defaultChecked={selected.includes(c.id)} disabled={lock} className="size-6" />
              <span className="font-medium">{c.name}{c.isActive ? "" : " (nonaktif)"}</span>
            </label>
          );
        })}
      </fieldset>
      <Feedback state={state} />
      <Button type="submit" className="h-11 self-start text-base" disabled={pending}>Simpan</Button>
    </form>
  );
}

export function QuestionControls({
  id, qqId, n, prompt, points, isFirst, isLast,
}: {
  id: string; qqId: string; n: number; prompt: string; points: number; isFirst: boolean; isLast: boolean;
}) {
  const [moveState, move, moving] = useActionState(
    (_p: FormState, dir: "up" | "down") => moveQuizQuestionAction(id, qqId, dir),
    undefined,
  );
  const [ptState, savePoints, saving] = useActionState(setQuizQuestionPointsAction.bind(null, id, qqId), undefined);
  return (
    <div className="flex flex-col gap-3">
      <form action={savePoints} className="flex flex-wrap items-end gap-2">
        <FormField name="points" id={`points-${qqId}`} label={`Poin soal nomor ${n}`} type="number" inputMode="numeric"
          min={1} max={100} required className="h-11 w-24" defaultValue={ptState?.values?.points ?? String(points)}
          error={ptState?.fieldErrors?.points} />
        <Button type="submit" variant="outline" className="h-11" disabled={saving} aria-label={`Simpan poin soal nomor ${n}`}>
          Simpan
        </Button>
      </form>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="h-11" disabled={isFirst || moving}
          aria-label={`Naik soal nomor ${n}`} onClick={() => startTransition(() => move("up"))}>Naik</Button>
        <Button type="button" variant="outline" className="h-11" disabled={isLast || moving}
          aria-label={`Turun soal nomor ${n}`} onClick={() => startTransition(() => move("down"))}>Turun</Button>
        <ConfirmAction
          action={removeQuizQuestionAction.bind(null, id, qqId)}
          trigger="Keluarkan"
          triggerLabel={`Keluarkan soal nomor ${n}`}
          title={`Keluarkan soal nomor ${n}?`}
          description={prompt.length > 80 ? `${prompt.slice(0, 80)}…` : prompt}
          confirm="Keluarkan"
        />
      </div>
      <Feedback state={moveState} />
      <Feedback state={ptState} />
    </div>
  );
}

export function AddQuestionButton({ id, questionId, label }: { id: string; questionId: string; label: string }) {
  const [state, dispatch, pending] = useActionState(() => addQuizQuestionAction(id, questionId), undefined);
  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="outline" className="h-11 self-start" disabled={pending}
        aria-label={`Tambah soal: ${label}`} onClick={() => startTransition(() => dispatch())}>
        Tambah
      </Button>
      <Feedback state={state} />
    </div>
  );
}

export function BulkAddQuestionsForm({ id, rows }: { id: string; rows: { id: string; label: string; detail: string; chosen: boolean }[] }) {
  const [state, action, pending] = useActionState(addQuizQuestionsAction.bind(null, id), undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <p className="text-text-muted">Centang soal yang ingin dipakai, lalu tambahkan sekaligus.</p>
      {rows.map((row) => (
        <label key={row.id} className="flex min-h-14 items-start gap-3 rounded-xl border bg-card p-4">
          <input type="checkbox" name="questionId" value={row.id} disabled={row.chosen} className="mt-1 size-5 shrink-0" />
          <span className="flex flex-col gap-1">
            <span className="font-medium">{row.label}</span>
            <span className="text-sm text-text-muted">{row.detail}</span>
            {row.chosen && <span className="text-sm text-tone-success">Sudah dipilih</span>}
          </span>
        </label>
      ))}
      <Feedback state={state} />
      {rows.some((row) => !row.chosen) && <Button type="submit" disabled={pending} className="min-h-11 self-start">{pending ? "Menambahkan…" : "Tambahkan soal terpilih"}</Button>}
    </form>
  );
}

export function PublishControls({ id, published }: { id: string; published: boolean }) {
  return published ? (
    <ConfirmAction
      action={unpublishQuizAction.bind(null, id)}
      trigger="Kembalikan ke draf"
      destructive
      title="Kembalikan ulangan ke draf?"
      description="Siswa tidak bisa lagi melihat ulangan ini sampai kamu menerbitkannya lagi."
      confirm="Kembalikan ke draf"
    />
  ) : (
    <ConfirmAction
      action={publishQuizAction.bind(null, id)}
      trigger="Terbitkan ulangan"
      primary
      title="Terbitkan ulangan?"
      description="Soal, poin, dan sebagian setelan terkunci setelah terbit."
      confirm="Terbitkan"
    />
  );
}

export function ResultsControls({ id, released, open, primary = true }: { id: string; released: boolean; open: boolean; primary?: boolean }) {
  return released ? (
    <ConfirmAction
      action={unreleaseResultsAction.bind(null, id)}
      trigger="Batalkan rilis"
      title="Batalkan rilis hasil?"
      description="Siswa tidak bisa lagi melihat nilai dan pembahasan, dan remedial baru tidak bisa dimulai."
      confirm="Batalkan rilis"
    />
  ) : (
    <ConfirmAction
      action={releaseResultsAction.bind(null, id)}
      trigger="Rilis hasil"
      primary={primary}
      success={primary}
      title="Rilis hasil ke siswa?"
      description={
        "Siswa bisa melihat nilai, jawaban, dan (bila diizinkan) kunci serta pembahasan." +
        (open ? " Jadwal belum berakhir: siswa yang belum mengerjakan masih bisa mulai, padahal temannya sudah melihat kunci." : "")
      }
      confirm="Rilis hasil"
    />
  );
}
