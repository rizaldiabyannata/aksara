"use client";

import { createContext, useContext, useRef, useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BULK_ID_MAX, type QuestionScopeFilter } from "@/lib/question-filter";
import type { QuestionStatus } from "@/lib/generated/prisma/enums";
import { bulkQuestionStatusAction } from "./actions";

// Keep this payload small even when selecting every matching result on the server.
type Selection = { mode: "ids"; ids: Set<string> } | { mode: "filter"; excluded: Set<string> };
const emptySelection = (): Selection => ({ mode: "ids", ids: new Set() });
type SelectionContext = { checked: (id: string) => boolean; toggle: (ids: string[], checked: boolean) => void; pending: boolean };
const Context = createContext<SelectionContext | null>(null);

export function BulkQuestionProvider({ filter, total, pageIds, header, children }: { filter: QuestionScopeFilter; total: number; pageIds: string[]; header: ReactNode; children: ReactNode }) {
  const [selection, setSelection] = useState<Selection>(emptySelection);
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);
  const [target, setTarget] = useState<QuestionStatus | null>(null);
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null);
  const count = selection.mode === "ids" ? selection.ids.size : Math.max(0, total - selection.excluded.size);
  const checked = (id: string) => selection.mode === "ids" ? selection.ids.has(id) : !selection.excluded.has(id);
  const selectedOnPage = pageIds.filter(checked).length;

  function toggle(ids: string[], value: boolean) {
    const next = selection.mode === "ids" ? new Set(selection.ids) : new Set(selection.excluded);
    for (const id of ids) {
      if (selection.mode === "ids" ? value : !value) next.add(id);
      else next.delete(id);
    }
    if (next.size > BULK_ID_MAX) {
      setFeedback({ error: true, message: "Maksimal 1.000 pilihan manual atau pengecualian. Persempit filter atau gunakan pilih semua hasil filter." });
      return;
    }
    setSelection(selection.mode === "ids" ? { mode: "ids", ids: next } : { mode: "filter", excluded: next });
    setFeedback(null);
  }
  function submit() {
    if (!target || !count || submitting.current) return;
    const to = target;
    submitting.current = true;
    startTransition(async () => {
      try {
        const result = await bulkQuestionStatusAction({ to, selection: selection.mode === "ids"
          ? { mode: "ids", ids: [...selection.ids] }
          : { mode: "filter", filter, excludedIds: [...selection.excluded] } });
        if (result.ok) {
          setSelection(emptySelection());
          setFeedback({ error: false, message: `${result.changed} soal ${to === "ACTIVE" ? "diaktifkan" : "dijadikan draf"}. ${result.unchanged} soal sudah berstatus sama. Total sasaran saat diproses: ${result.matched}.` });
        } else setFeedback({ error: true, message: result.message });
      } catch {
        setFeedback({ error: true, message: "Belum dapat memastikan hasil. Muat ulang untuk memeriksa status atau coba lagi; soal yang sudah berstatus sama tidak diubah ulang." });
      } finally {
        submitting.current = false;
        setTarget(null);
      }
    });
  }

  return <Context.Provider value={{ checked, toggle, pending }}>
    <div className="flex min-w-0 flex-col gap-space-xl" aria-busy={pending} onClickCapture={event => { if (pending && event.target instanceof Element && event.target.closest("a")) event.preventDefault(); }}>
      <fieldset disabled={pending} className="contents">
        {header}
        <div role="group" aria-label="Aksi massal Bank Soal" className="flex min-w-0 flex-col gap-3 rounded-2xl border bg-card p-4">
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input type="checkbox" className="size-5 shrink-0" disabled={!pageIds.length} checked={!!pageIds.length && selectedOnPage === pageIds.length} ref={node => { if (node) node.indeterminate = selectedOnPage > 0 && selectedOnPage < pageIds.length; }} onChange={event => toggle(pageIds, event.target.checked)} />
            <span>Pilih halaman ini ({pageIds.length} soal)</span>
          </label>
          <p role="status">{count} soal dipilih{selection.mode === "filter" ? ` dari semua hasil filter (${selection.excluded.size} dikecualikan)` : ""}.</p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" disabled={!total} className="min-h-11 h-auto whitespace-normal" onClick={() => { setSelection({ mode: "filter", excluded: new Set() }); setFeedback(null); }}>Pilih semua {total} hasil filter</Button>
            <Button type="button" variant="outline" disabled={!count && selection.mode === "ids"} className="min-h-11" onClick={() => { setSelection(emptySelection()); setFeedback(null); }}>Batalkan pilihan</Button>
            <Button type="button" disabled={!count} className="min-h-11" onClick={() => setTarget("ACTIVE")}>Aktifkan</Button>
            <Button type="button" variant="outline" disabled={!count} className="min-h-11" onClick={() => setTarget("DRAFT")}>Jadikan draf</Button>
          </div>
          <p className="text-sm text-muted-foreground">Pilihan bertahan saat berganti halaman. Mengubah filter menghapus pilihan. Pada pilihan semua hasil filter, hilangkan centang soal untuk mengecualikannya.</p>
          {pending && <p role="status">Memproses perubahan status…</p>}
          {feedback && <p role={feedback.error ? "alert" : "status"}>{feedback.message}</p>}
        </div>
        {children}
      </fieldset>
      <AlertDialog open={target !== null} onOpenChange={open => { if (!open && !pending) setTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{target === "ACTIVE" ? "Aktifkan" : "Jadikan draf"} {count} soal?</AlertDialogTitle>
            <AlertDialogDescription>
              {selection.mode === "filter" ? `Semua hasil filter, kecuali ${selection.excluded.size} soal. Sasaran dihitung ulang saat diproses sehingga jumlah dapat berubah.` : `${count} soal yang dipilih secara manual.`}
              {" "}Pastikan soal sudah ditinjau sebelum diaktifkan. Perubahan ini tidak mengubah salinan soal pada ulangan terbit. Soal berstatus draf dapat menghalangi penerbitan ulangan draf yang menggunakannya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending} className="min-h-11">Batal</AlertDialogCancel>
            <AlertDialogAction disabled={pending} className="min-h-11" onClick={event => { event.preventDefault(); submit(); }}>{pending ? "Memproses…" : "Konfirmasi perubahan"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </Context.Provider>;
}

export function QuestionSelectionCheckbox({ id, name }: { id: string; name: string }) {
  const context = useContext(Context);
  if (!context) throw new Error("Question selection requires BulkQuestionProvider");
  return <label className="mb-3 flex min-h-11 cursor-pointer items-center gap-3">
    <input type="checkbox" className="size-5 shrink-0" checked={context.checked(id)} disabled={context.pending} onChange={event => context.toggle([id], event.target.checked)} />
    <span className="text-sm">Pilih soal<span className="sr-only">: {name}</span></span>
  </label>;
}
