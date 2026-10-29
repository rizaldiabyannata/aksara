"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, type FormEvent } from "react";
import { ConfirmAction } from "@/components/confirm-action";
import { Feedback } from "@/components/form-feedback";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/form-state";
import type { ImageView } from "@/lib/materials";
import { removeImageAction, updateImageMetaAction } from "./image-actions";

const UPLOAD_FAILED = "Gagal mengunggah. Periksa koneksi lalu coba lagi.";
const SIZE_MSG = "Ukuran gambar paling besar 4 MB.";
const RELOAD_MSG = "Muat ulang halaman lalu coba lagi.";
const MAX_BYTES = 4 * 1024 * 1024;
const ALT_HINT = "Jelaskan isi gambar untuk siswa yang tidak bisa melihatnya.";
const QUESTION_ALT_HINT = "Teks alternatif jangan membocorkan jawaban. Tulis mis. “Gambar A”.";

type Owner = "materialId" | "questionId";
type UploadResult = { ok: boolean; message?: string; fieldErrors?: Record<string, string> };

function altHint(owner: Owner) {
  return owner === "questionId" ? `${ALT_HINT} ${QUESTION_ALT_HINT}` : ALT_HINT;
}

function UploadForm({ owner, ownerId }: { owner: Owner; ownerId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<FormState>(undefined);
  const e = state?.fieldErrors;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    const file = body.get("file");
    if (file instanceof File && file.size > MAX_BYTES) {
      setState({ message: SIZE_MSG });
      return;
    }
    setPending(true);
    setState(undefined);
    // Vercel's 413 and an expired-session redirect come back as HTML, not JSON.
    const res = await fetch("/api/images", { method: "POST", body }).catch(() => null);
    let data: UploadResult;
    if (!res) data = { ok: false, message: UPLOAD_FAILED };
    else if (!res.headers.get("content-type")?.includes("json")) {
      data = { ok: false, message: res.status === 413 ? SIZE_MSG : RELOAD_MSG };
    } else data = await res.json().catch(() => ({ ok: false, message: RELOAD_MSG }));
    setPending(false);
    if (data.ok) {
      form.reset();
      setState({ ok: true, message: "Gambar diunggah." });
      router.refresh();
    } else {
      setState({ message: data.message, fieldErrors: data.fieldErrors });
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-xl flex-col gap-4">
      <input type="hidden" name={owner} value={ownerId} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="image-file">File gambar</Label>
        <input
          id="image-file"
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="min-h-11 text-base file:mr-3 file:rounded-md file:border file:px-3 file:py-2"
        />
      </div>
      <FormField
        id="upload-altText"
        name="altText"
        label="Teks alternatif"
        required
        hint={altHint(owner)}
        error={e?.altText}
      />
      <FormField id="upload-caption" name="caption" label="Keterangan (opsional)" />
      <FormField id="upload-sourceReference" name="sourceReference" label="Sumber gambar (opsional)" />
      <Button type="submit" className="h-11 self-start" disabled={pending}>
        {pending ? "Sedang mengunggah…" : "Unggah gambar"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

function ImageCard({ owner, image, referenced }: { owner: Owner; image: ImageView; referenced: boolean }) {
  const [state, formAction, pending] = useActionState(updateImageMetaAction.bind(null, image.id), undefined);
  const [copyNote, setCopyNote] = useState("");
  const code = `![${image.altText.replace(/[[\]\\]/g, "\\$&")}](aksara-image:${image.id})`;
  const v = (name: "altText" | "caption" | "sourceReference") => state?.values?.[name] ?? image[name] ?? "";
  const e = state?.fieldErrors;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopyNote("Kode disalin.");
    } catch {
      setCopyNote("Salin manual: pilih kode di atas.");
    }
  }

  return (
    <li className="flex flex-col gap-4 rounded-xl bg-secondary p-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- authorized redirect route; next/image cannot optimize it */}
      <img
        src={`/api/images/${image.id}`}
        alt={image.altText}
        width={image.width}
        height={image.height}
        className="h-auto max-w-40"
      />
      <div className="flex flex-col gap-2">
        <code className="rounded-lg bg-card px-2 py-1 font-mono text-sm break-all">{code}</code>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            aria-label={`Salin kode sisip gambar ${image.altText}`}
            onClick={copyCode}
          >
            Salin kode sisip
          </Button>
          <p role="status" className="text-sm font-medium text-muted-foreground">
            {copyNote}
          </p>
        </div>
      </div>
      <form action={formAction} className="flex max-w-xl flex-col gap-4">
        <FormField
          id={`meta-${image.id}-altText`}
          name="altText"
          label="Teks alternatif"
          required
          hint={altHint(owner)}
          defaultValue={v("altText")}
          error={e?.altText}
        />
        <FormField
          id={`meta-${image.id}-caption`}
          name="caption"
          label="Keterangan (opsional)"
          defaultValue={v("caption")}
          error={e?.caption}
        />
        <FormField
          id={`meta-${image.id}-sourceReference`}
          name="sourceReference"
          label="Sumber gambar (opsional)"
          defaultValue={v("sourceReference")}
          error={e?.sourceReference}
        />
        <Button type="submit" className="h-11 self-start" disabled={pending}>
          Simpan keterangan
        </Button>
        <Feedback state={state} />
      </form>
      <ConfirmAction
        action={removeImageAction.bind(null, image.id)}
        trigger="Hapus"
        triggerLabel={`Hapus gambar ${image.altText}`}
        title="Hapus gambar ini?"
        description={`Gambar ini akan dihapus permanen.${referenced ? ` Gambar ini masih dipakai di ${owner === "questionId" ? "teks soal" : "isi materi"}.` : ""}`}
        confirm="Hapus"
        destructive
      />
    </li>
  );
}

export function ImagePanel({
  owner,
  ownerId,
  images,
  referencedIds = [],
}: {
  owner: Owner;
  ownerId: string;
  images: ImageView[];
  referencedIds?: string[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <UploadForm owner={owner} ownerId={ownerId} />
      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {owner === "questionId" ? "Belum ada gambar di soal ini." : "Belum ada gambar di materi ini."}
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {images.map((image) => (
            <ImageCard key={image.id} owner={owner} image={image} referenced={referencedIds.includes(image.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}
