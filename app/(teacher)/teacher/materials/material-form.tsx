"use client";

import { startTransition, useActionState } from "react";
import { ConfirmAction } from "@/components/confirm-action";
import { Feedback } from "@/components/form-feedback";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/form-state";
import type { MaterialStatus } from "@/lib/generated/prisma/enums";
import {
  changeMaterialStatusAction,
  createMaterialAction,
  deleteMaterialAction,
  moveMaterialAction,
  updateMaterialAction,
} from "./actions";

export type ChapterOption = {
  id: string;
  label: string;
  subchapters: { id: string; label: string }[];
};
type Defaults = {
  id: string;
  title: string;
  summary: string;
  content: string;
  examples: string | null;
  exercises: string | null;
  sourceReference: string;
  sourcePages: string | null;
  chapterId: string;
  subchapterId: string | null;
};

const controlClass =
  "w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive";
const HELP =
  "Bisa pakai Markdown: **tebal**, *miring*, daftar dengan -, tabel. Sisipkan gambar dengan kode dari panel Gambar.";

function Err({ id, text }: { id: string; text?: string }) {
  return text ? (
    <p id={id} className="text-sm text-destructive">
      {text}
    </p>
  ) : null;
}

export function MaterialForm({
  chapters,
  material,
}: {
  chapters: ChapterOption[];
  material?: Defaults;
}) {
  const [state, formAction, pending] = useActionState(
    material ? updateMaterialAction.bind(null, material.id) : createMaterialAction,
    undefined,
  );
  const v = (name: keyof Defaults) => state?.values?.[name] ?? material?.[name] ?? "";
  const e = state?.fieldErrors;
  const longText = [
    ["content", "Isi materi", true, 10],
    ["examples", "Contoh dan aktivitas (opsional)", false, 6],
    ["exercises", "Latihan (opsional)", false, 6],
  ] as const;
  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-4">
      <FormField id="title" name="title" label="Judul" required autoComplete="off" defaultValue={v("title")} error={e?.title} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="summary">Ringkasan</Label>
        <textarea
          id="summary"
          name="summary"
          required
          rows={3}
          className={`${controlClass} py-2`}
          defaultValue={v("summary")}
          aria-invalid={e?.summary ? true : undefined}
          aria-describedby={e?.summary ? "summary-error" : undefined}
        />
        <Err id="summary-error" text={e?.summary} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="chapterId">Bab</Label>
        <select
          id="chapterId"
          name="chapterId"
          required
          className={`${controlClass} h-11`}
          defaultValue={v("chapterId")}
          aria-invalid={e?.chapterId ? true : undefined}
          aria-describedby={e?.chapterId ? "chapterId-error" : undefined}
        >
          <option value="">Pilih bab</option>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <Err id="chapterId-error" text={e?.chapterId} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="subchapterId">Subbab (opsional)</Label>
        <select
          id="subchapterId"
          name="subchapterId"
          className={`${controlClass} h-11`}
          defaultValue={v("subchapterId")}
          aria-invalid={e?.subchapterId ? true : undefined}
          aria-describedby={e?.subchapterId ? "subchapterId-error" : undefined}
        >
          <option value="">Tanpa subbab</option>
          {chapters.map((c) => (
            <optgroup key={c.id} label={c.label}>
              {c.subchapters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <Err id="subchapterId-error" text={e?.subchapterId} />
      </div>
      {longText.map(([name, label, required, rows]) => (
        <div key={name} className="flex flex-col gap-2">
          <Label htmlFor={name}>{label}</Label>
          <textarea
            id={name}
            name={name}
            required={required}
            rows={rows}
            className={`${controlClass} py-2 font-mono text-sm`}
            defaultValue={v(name)}
            aria-invalid={e?.[name] ? true : undefined}
            aria-describedby={`${name}-help${e?.[name] ? ` ${name}-error` : ""}`}
          />
          <p id={`${name}-help`} className="text-sm text-muted-foreground">
            {HELP}
          </p>
          <Err id={`${name}-error`} text={e?.[name]} />
        </div>
      ))}
      <FormField id="sourceReference" name="sourceReference" label="Sumber (nama buku)" required autoComplete="off" defaultValue={v("sourceReference")} error={e?.sourceReference} />
      <FormField id="sourcePages" name="sourcePages" label="Halaman sumber (opsional)" autoComplete="off" defaultValue={v("sourcePages")} error={e?.sourcePages} />
      <Feedback state={state} />
      <Button type="submit" className="h-11 text-base" disabled={pending} aria-busy={pending}>
        {pending ? "Sedang menyimpan…" : material ? "Simpan materi" : "Buat materi"}
      </Button>
    </form>
  );
}

const STATUS_BUTTONS: Record<
  MaterialStatus,
  Record<MaterialStatus, { label: string; confirm?: [string, string] } | undefined>
> = {
  DRAFT: { DRAFT: undefined, REVIEWED: { label: "Tandai sudah ditinjau" }, PUBLISHED: undefined },
  REVIEWED: {
    DRAFT: { label: "Kembalikan ke draft" },
    REVIEWED: undefined,
    PUBLISHED: {
      label: "Terbitkan",
      confirm: ["Terbitkan materi ini?", "Siswa akan bisa membaca materi ini."],
    },
  },
  PUBLISHED: {
    DRAFT: {
      label: "Tarik dari siswa",
      confirm: ["Tarik materi dari siswa?", "Siswa tidak bisa lagi membuka materi ini."],
    },
    REVIEWED: undefined,
    PUBLISHED: undefined,
  },
};

export function StatusButtons({
  id,
  status,
  targets,
}: {
  id: string;
  status: MaterialStatus;
  targets: MaterialStatus[];
}) {
  const [state, dispatch, pending] = useActionState(
    (_prev: FormState, to: MaterialStatus) => changeMaterialStatusAction(id, to),
    undefined,
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {targets.map((to) => {
          const b = STATUS_BUTTONS[status][to]!;
          return b.confirm ? (
            <ConfirmAction
              key={to}
              action={changeMaterialStatusAction.bind(null, id, to)}
              trigger={b.label}
              title={b.confirm[0]}
              description={b.confirm[1]}
              confirm={b.label}
            />
          ) : (
            <Button
              key={to}
              type="button"
              variant="outline"
              className="h-11"
              disabled={pending}
              onClick={() => startTransition(() => dispatch(to))}
            >
              {b.label}
            </Button>
          );
        })}
      </div>
      <Feedback state={state} />
    </div>
  );
}

export function MoveButtons({
  id,
  title,
  isFirst,
  isLast,
}: {
  id: string;
  title: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [state, dispatch, pending] = useActionState(
    (_prev: FormState, dir: "up" | "down") => moveMaterialAction(id, dir),
    undefined,
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="h-11" disabled={isFirst || pending}
          aria-label={`Naikkan materi ${title}`} onClick={() => startTransition(() => dispatch("up"))}>
          Naik
        </Button>
        <Button type="button" variant="outline" className="h-11" disabled={isLast || pending}
          aria-label={`Turunkan materi ${title}`} onClick={() => startTransition(() => dispatch("down"))}>
          Turun
        </Button>
      </div>
      <Feedback state={state} />
    </div>
  );
}

export function DeleteMaterialButton({ id, title }: { id: string; title: string }) {
  return (
    <ConfirmAction
      action={deleteMaterialAction.bind(null, id)}
      trigger="Hapus materi"
      title={`Hapus materi "${title}"?`}
      description="Materi dan gambarnya dihapus selamanya. Ini tidak bisa dibatalkan."
      confirm="Hapus"
      destructive
    />
  );
}
