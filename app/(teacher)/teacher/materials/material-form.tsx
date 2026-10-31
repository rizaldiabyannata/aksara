"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { ConfirmAction } from "@/components/confirm-action";
import { PdfImport } from "@/components/pdf-import";
import { Feedback } from "@/components/form-feedback";
import { FormField } from "@/components/form-field";
import { ArrowDown01Icon, ArrowUp01Icon, Book02Icon, File01Icon, Note01Icon, TaskEdit01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
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
  title: string;
  sourceBook: string;
  sourceYearOrEdition: string;
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
  "w-full rounded-xl bg-surface-container-low border border-border-subtle px-4 text-text-primary text-base focus:bg-surface-card outline-none focus-visible:border-border-active focus-visible:ring-[3px] focus-visible:ring-ring aria-invalid:border-destructive transition-all";
const HELP =
  "Bisa pakai Markdown: **tebal**, *miring*, daftar dengan -, tabel. Sisipkan gambar dengan kode dari panel Gambar.";

const ICON: Record<"content" | "examples" | "exercises", IconSvgElement> = {
  content: Note01Icon,
  examples: TaskEdit01Icon,
  exercises: File01Icon,
};

function SectionTitle({ icon, children }: { icon: IconSvgElement; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pb-3 border-b border-border-subtle">
      <div aria-hidden="true" className="w-9 h-9 rounded-lg bg-canvas-peach text-primary-strong flex items-center justify-center font-bold">
        <HugeiconsIcon icon={icon} className="size-5" />
      </div>
      <p className="text-base font-bold text-text-primary">{children}</p>
    </div>
  );
}

function Err({ id, text }: { id: string; text?: string }) {
  return text ? (
    <p id={id} className="text-sm text-destructive">
      {text}
    </p>
  ) : null;
}

export function NewMaterialForm({ chapters, chapterId }: { chapters: ChapterOption[]; chapterId?: string }) {
  const chapter = chapters.find((c) => c.id === chapterId);
  const formRef = useRef<HTMLFormElement>(null);
  const [importedPages, setImportedPages] = useState("");
  const [importError, setImportError] = useState("");
  const sourceReference = chapter ? `${chapter.sourceBook} (${chapter.sourceYearOrEdition})` : "";
  const field = (name: string) => formRef.current?.elements.namedItem(name) as HTMLTextAreaElement | HTMLInputElement | null;
  return (
    <div className="flex flex-col gap-6">
      <PdfImport onImport={(text, pages) => {
        const content = field("content");
        const summary = field("summary");
        const sourcePages = field("sourcePages");
        const combined = [content?.value.trim(), text].filter(Boolean).join("\n\n");
        if (combined.length > 50000) { setImportError("Isi materi melebihi 50.000 huruf. Simpan bagian ini dulu, lalu buat materi berikutnya dari halaman lain."); return; }
        if (content) content.value = combined;
        if (summary && !summary.value.trim()) summary.value = text.replace(/\s+/g, " ").slice(0, 240);
        if (sourcePages && !sourcePages.value.trim()) sourcePages.value = pages;
        setImportError("");
        setImportedPages(pages);
      }} />
      {importError && <p role="alert" className="text-destructive">{importError}</p>}
      {importedPages && <p role="status" className="rounded-xl bg-tone-info-bg p-4">Teks halaman {importedPages} ditambahkan ke isi materi. Isian lain tetap tersimpan. Periksa dan tulis ulang seperlunya sebelum menyimpan draf.</p>}
      <MaterialForm formRef={formRef} chapters={chapters} initial={{
        chapterId: chapter?.id,
        title: chapter?.title,
        sourceReference,
      }} />
    </div>
  );
}

export function MaterialForm({
  chapters,
  material,
  initial,
  formRef,
}: {
  chapters: ChapterOption[];
  material?: Defaults;
  initial?: Partial<Defaults>;
  formRef?: React.Ref<HTMLFormElement>;
}) {
  const [state, formAction, pending] = useActionState(
    material ? updateMaterialAction.bind(null, material.id) : createMaterialAction,
    undefined,
  );
  const v = (name: keyof Defaults) => state?.values?.[name] ?? material?.[name] ?? initial?.[name] ?? "";
  const e = state?.fieldErrors;
  const longText = [
    ["content", "Isi materi", true, 10],
    ["examples", "Contoh dan aktivitas (opsional)", false, 6],
    ["exercises", "Latihan (opsional)", false, 6],
  ] as const;
  const longField = ([name, label, required, rows]: (typeof longText)[number]) => (
    <div key={name} className="bg-surface-card rounded-2xl p-6 border border-border-subtle shadow-sm flex flex-col gap-3">
      <SectionTitle icon={ICON[name]}>{label}</SectionTitle>
      <Label htmlFor={name} className="sr-only">{label}</Label>
      <textarea id={name} name={name} required={required} rows={rows}
        className={`${controlClass} py-2 font-mono text-sm`} defaultValue={v(name)}
        aria-invalid={e?.[name] ? true : undefined}
        aria-describedby={`${name}-help${e?.[name] ? ` ${name}-error` : ""}`} />
      <p id={`${name}-help`} className="text-sm text-muted-foreground">{HELP}</p>
      <Err id={`${name}-error`} text={e?.[name]} />
    </div>
  );
  return (
    <form ref={formRef} action={formAction} className="flex w-full flex-col gap-6">
      <div className="bg-surface-card rounded-2xl p-6 border border-border-subtle shadow-sm flex flex-col gap-5">
      <SectionTitle icon={File01Icon}>Informasi dasar</SectionTitle>
      <FormField id="title" name="title" label="Judul" required autoComplete="off" defaultValue={v("title")} error={e?.title} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="summary">Ringkasan</Label>
        <textarea
          id="summary"
          name="summary"
          required
          rows={3}
          className={`${controlClass} min-h-32 py-2`}
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
      </div>
      {longField(longText[0])}
      <details className="rounded-2xl border border-border-subtle bg-surface-card p-4" open={!!material?.examples || !!material?.exercises || !!e?.examples || !!e?.exercises}>
        <summary className="min-h-11 cursor-pointer font-semibold">Contoh dan latihan tambahan (opsional)</summary>
        <div className="mt-3 flex flex-col gap-4">{longText.slice(1).map(longField)}</div>
      </details>
      <div className="bg-surface-card rounded-2xl p-6 border border-border-subtle shadow-sm flex flex-col gap-5">
      <SectionTitle icon={Book02Icon}>Sumber</SectionTitle>
      <FormField id="sourceReference" name="sourceReference" label="Sumber (nama buku)" required autoComplete="off" defaultValue={v("sourceReference")} error={e?.sourceReference} />
      <FormField id="sourcePages" name="sourcePages" label="Halaman sumber (opsional)" autoComplete="off" defaultValue={v("sourcePages")} error={e?.sourcePages} />
      {!material && <p className="text-sm text-text-muted">Nomor awal mengikuti halaman PDF. Sesuaikan jika nomor cetak pada buku berbeda.</p>}
      </div>
      <Feedback state={state} />
      <Button type="submit" className="h-12 self-start px-6 text-base" disabled={pending} aria-busy={pending}>
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
      confirm: ["Terbitkan materi ini?", "Siswa akan bisa membaca materi ini. Pastikan isi dan hak penggunaan teks buku sudah diperiksa."],
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
      <div className="flex gap-1">
        {(["up", "down"] as const).map((dir) => (
          <button
            key={dir}
            type="button"
            disabled={(dir === "up" ? isFirst : isLast) || pending}
            aria-label={`${dir === "up" ? "Naikkan" : "Turunkan"} materi ${title}`}
            onClick={() => startTransition(() => dispatch(dir))}
            className="min-h-12 min-w-12 rounded-xl bg-surface-card text-text-primary hover:bg-canvas-peach flex items-center justify-center shadow-sm active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <HugeiconsIcon icon={dir === "up" ? ArrowUp01Icon : ArrowDown01Icon} className="size-5" aria-hidden="true" />
          </button>
        ))}
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
