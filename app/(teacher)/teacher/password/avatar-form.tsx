"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormMessage } from "@/components/form-field";

const MAX_BYTES = 4 * 1024 * 1024;
const BTN = "min-h-12 rounded-xl px-space-lg font-label-md text-label-md focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60";

export function AvatarForm({ displayName, imageId }: { displayName: string; imageId: string | null }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function pick(f: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function call(init: RequestInit, done: string) {
    setPending(true);
    setMsg(null);
    const res = await fetch("/api/profile-photo", init).catch(() => null);
    const data = res?.headers.get("content-type")?.includes("json") ? await res.json().catch(() => null) : null;
    setPending(false);
    if (data?.ok) {
      pick(null);
      setMsg({ text: done, ok: true });
      router.refresh();
    } else {
      setMsg({ text: data?.message ?? "Ada masalah. Muat ulang halaman, lalu coba lagi.", ok: false });
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return setMsg({ text: "Pilih foto dulu.", ok: false });
    if (file.size > MAX_BYTES) return setMsg({ text: "Ukuran foto paling besar 4 MB.", ok: false });
    const body = new FormData();
    body.set("photo", file);
    void call({ method: "POST", body }, "Foto profil disimpan.");
  }

  const shown = preview ?? (imageId ? `/api/images/${imageId}` : null);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-space-md">
      <div className="flex items-center gap-space-md">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element -- presigned redirect or blob preview
          <img src={shown} alt={`Foto profil ${displayName}`} className="size-20 shrink-0 rounded-full object-cover ring-2 ring-primary-container" />
        ) : (
          <span aria-hidden="true" className="flex size-20 shrink-0 items-center justify-center rounded-full bg-primary-strong font-headline-md text-headline-md text-on-primary ring-2 ring-primary-container">
            {displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
          </span>
        )}
        <div className="flex min-w-0 flex-col gap-space-xs">
          <label htmlFor="photo" className="font-label-md text-label-md text-text-primary">Pilih foto (JPG, PNG, atau WebP, maks. 4 MB)</label>
          <input id="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => pick(e.target.files?.[0] ?? null)} className="font-body-md text-body-md text-text-muted" />
        </div>
      </div>
      <div className="flex flex-wrap gap-space-sm">
        <button type="submit" disabled={pending || !file} className={`${BTN} bg-primary-strong text-on-primary`}>
          Simpan foto
        </button>
        {imageId && (
          <button type="button" disabled={pending} onClick={() => call({ method: "DELETE" }, "Foto profil dihapus.")} className={`${BTN} bg-canvas-peach text-text-primary`}>
            Hapus foto
          </button>
        )}
      </div>
      <div role="status" aria-live="polite">
        {msg && (msg.ok ? <p className="font-label-md text-label-md text-tone-success">{msg.text}</p> : <FormMessage message={msg.text} />)}
      </div>
    </form>
  );
}
