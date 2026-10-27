"use client";

import { startTransition, useActionState } from "react";
import { ConfirmAction } from "@/components/confirm-action";
import { Feedback } from "@/components/form-feedback";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/form-state";
import {
  deleteChapterAction,
  deleteSubchapterAction,
  deleteSubjectAction,
  moveChapterAction,
  moveSubchapterAction,
  saveChapterAction,
  saveSubchapterAction,
  saveSubjectAction,
} from "./actions";

export function SubjectForm({
  subject,
}: {
  subject?: { id: string; name: string; description: string | null };
}) {
  const key = subject?.id ?? "baru";
  const [state, formAction, pending] = useActionState(
    saveSubjectAction.bind(null, subject?.id ?? null),
    undefined,
  );
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormField
        id={`subject-name-${key}`}
        name="name"
        label="Nama mapel"
        required
        autoComplete="off"
        defaultValue={state?.values?.name ?? subject?.name}
        error={state?.fieldErrors?.name}
      />
      <FormField
        id={`subject-description-${key}`}
        name="description"
        label="Deskripsi (opsional)"
        autoComplete="off"
        defaultValue={state?.values?.description ?? subject?.description ?? ""}
        error={state?.fieldErrors?.description}
      />
      <Feedback state={state} />
      <Button type="submit" className="h-11 text-base" disabled={pending} aria-busy={pending}>
        {pending ? "Sedang menyimpan…" : subject ? "Simpan mapel" : "Tambah mapel"}
      </Button>
    </form>
  );
}

export function ChapterForm({
  subjectId,
  chapter,
}: {
  subjectId: string;
  chapter?: { id: string; title: string; sourceBook: string; sourceYearOrEdition: string };
}) {
  const key = chapter?.id ?? `baru-${subjectId}`;
  const [state, formAction, pending] = useActionState(
    saveChapterAction.bind(null, subjectId, chapter?.id ?? null),
    undefined,
  );
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormField
        id={`chapter-title-${key}`}
        name="title"
        label="Judul bab"
        required
        autoComplete="off"
        defaultValue={state?.values?.title ?? chapter?.title}
        error={state?.fieldErrors?.title}
      />
      <FormField
        id={`chapter-book-${key}`}
        name="sourceBook"
        label="Nama buku sumber"
        required
        autoComplete="off"
        defaultValue={state?.values?.sourceBook ?? chapter?.sourceBook}
        error={state?.fieldErrors?.sourceBook}
      />
      <FormField
        id={`chapter-edition-${key}`}
        name="sourceYearOrEdition"
        label="Tahun atau edisi"
        required
        autoComplete="off"
        defaultValue={state?.values?.sourceYearOrEdition ?? chapter?.sourceYearOrEdition}
        error={state?.fieldErrors?.sourceYearOrEdition}
      />
      <Feedback state={state} />
      <Button type="submit" className="h-11 text-base" disabled={pending} aria-busy={pending}>
        {pending ? "Sedang menyimpan…" : chapter ? "Simpan bab" : "Tambah bab"}
      </Button>
    </form>
  );
}

export function SubchapterForm({
  chapterId,
  subchapter,
}: {
  chapterId: string;
  subchapter?: { id: string; title: string; sourcePages: string | null };
}) {
  const key = subchapter?.id ?? `baru-${chapterId}`;
  const [state, formAction, pending] = useActionState(
    saveSubchapterAction.bind(null, chapterId, subchapter?.id ?? null),
    undefined,
  );
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormField
        id={`sub-title-${key}`}
        name="title"
        label="Judul subbab"
        required
        autoComplete="off"
        defaultValue={state?.values?.title ?? subchapter?.title}
        error={state?.fieldErrors?.title}
      />
      <FormField
        id={`sub-pages-${key}`}
        name="sourcePages"
        label="Halaman sumber (opsional)"
        autoComplete="off"
        defaultValue={state?.values?.sourcePages ?? subchapter?.sourcePages ?? ""}
        error={state?.fieldErrors?.sourcePages}
      />
      <Feedback state={state} />
      <Button type="submit" className="h-11 text-base" disabled={pending} aria-busy={pending}>
        {pending ? "Sedang menyimpan…" : subchapter ? "Simpan subbab" : "Tambah subbab"}
      </Button>
    </form>
  );
}

/** Naik/turun buttons. Each click moves one step; the server swaps the order. */
export function MoveButtons({
  id,
  kind,
  title,
  isFirst,
  isLast,
}: {
  id: string;
  kind: "bab" | "subbab";
  title: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const move = kind === "bab" ? moveChapterAction : moveSubchapterAction;
  const [state, dispatch, pending] = useActionState(
    (_prev: FormState, dir: "up" | "down") => move(id, dir),
    undefined,
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={isFirst || pending}
          aria-label={`Naikkan ${kind} ${title}`}
          onClick={() => startTransition(() => dispatch("up"))}
        >
          Naik
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={isLast || pending}
          aria-label={`Turunkan ${kind} ${title}`}
          onClick={() => startTransition(() => dispatch("down"))}
        >
          Turun
        </Button>
      </div>
      <Feedback state={state} />
    </div>
  );
}

export function DeleteSubjectButton({ id, name }: { id: string; name: string }) {
  return (
    <ConfirmAction
      action={deleteSubjectAction.bind(null, id)}
      trigger="Hapus"
      triggerLabel={`Hapus mapel ${name}`}
      title={`Hapus mapel "${name}"?`}
      description="Mapel yang masih punya bab tidak bisa dihapus. Hapus babnya dulu."
      confirm="Ya, hapus"
      destructive
    />
  );
}

export function DeleteChapterButton({ id, title }: { id: string; title: string }) {
  return (
    <ConfirmAction
      action={deleteChapterAction.bind(null, id)}
      trigger="Hapus"
      triggerLabel={`Hapus bab ${title}`}
      title={`Hapus bab "${title}"?`}
      description="Bab yang masih dipakai materi atau subbab tidak bisa dihapus."
      confirm="Ya, hapus"
      destructive
    />
  );
}

export function DeleteSubchapterButton({ id, title }: { id: string; title: string }) {
  return (
    <ConfirmAction
      action={deleteSubchapterAction.bind(null, id)}
      trigger="Hapus"
      triggerLabel={`Hapus subbab ${title}`}
      title={`Hapus subbab "${title}"?`}
      description="Subbab yang masih dipakai materi tidak bisa dihapus."
      confirm="Ya, hapus"
      destructive
    />
  );
}
