"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extractPageRange } from "@/lib/pdf-text";

export function PdfImport({ onImport, purpose = "materi" }: { onImport: (text: string, pages: string) => void; purpose?: "materi" | "soal" }) {
  const doc = useRef<PDFDocumentProxy | null>(null);
  const task = useRef<PDFDocumentLoadingTask | null>(null);
  const [count, setCount] = useState(0);
  const [first, setFirst] = useState(1);
  const [last, setLast] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => { void task.current?.destroy(); }, []);

  async function choose(file?: File) {
    setError("");
    setCount(0);
    if (task.current) await task.current.destroy();
    doc.current = null;
    task.current = null;
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Pilih berkas PDF.");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError("PDF lebih dari 100 MB. Gunakan berkas yang lebih kecil.");
      return;
    }
    setBusy(true);
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      task.current = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
      const loaded = await task.current.promise;
      doc.current = loaded;
      setCount(loaded.numPages);
      setFirst(1);
      setLast(Math.min(loaded.numPages, 10));
    } catch {
      setError("PDF tidak dapat dibuka. Periksa berkas atau coba PDF lain.");
    } finally {
      setBusy(false);
    }
  }

  async function extract() {
    if (!doc.current) return;
    setBusy(true);
    setError("");
    try {
      onImport(await extractPageRange(doc.current, first, last), first === last ? String(first) : `${first}–${last}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Teks tidak dapat diambil dari PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface-card p-6">
      <div>
        <h2 className="text-xl font-semibold">Ambil teks dari PDF buku</h2>
        <p className="text-text-muted">Pilih halaman yang memuat {purpose}. PDF hanya dibaca di perangkat ini. Teks hasilnya perlu diperiksa dan ditulis ulang sebelum diterbitkan.</p>
      </div>
      <label className="flex flex-col gap-2 font-medium" htmlFor="book-pdf">Buku PDF</label>
      <Input id="book-pdf" type="file" accept="application/pdf,.pdf" disabled={busy} onChange={(event) => void choose(event.target.files?.[0])} className="max-w-full" />
      {count > 0 && (
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1">Dari halaman
            <input type="number" min={1} max={count} value={first} onChange={(event) => setFirst(Number(event.target.value))} className="h-11 w-28 rounded-lg border px-3" />
          </label>
          <label className="flex flex-col gap-1">Sampai halaman
            <input type="number" min={1} max={count} value={last} onChange={(event) => setLast(Number(event.target.value))} className="h-11 w-28 rounded-lg border px-3" />
          </label>
          <span className="text-text-muted">dari {count} halaman PDF</span>
          <Button type="button" disabled={busy} onClick={() => void extract()} className="min-h-11">{busy ? "Mengambil teks…" : "Ambil teks halaman"}</Button>
        </div>
      )}
      {busy && <p role="status">Memproses PDF di perangkat ini…</p>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </section>
  );
}
