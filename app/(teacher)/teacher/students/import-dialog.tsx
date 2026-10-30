"use client";

import { useState, useTransition } from "react";
import { FileImportIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { FormMessage } from "@/components/form-field";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { findRosterRows, IMPORT_MAX, type RosterRow } from "@/lib/student-import";
import { importStudentsAction, type ImportState } from "./actions";
import type { ClassOption } from "./student-forms";

const SELECT =
  "h-12 w-full rounded-xl border-2 border-input bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring";

const READ_ERRORS = {
  NO_HEADER: "Tidak ada kolom NAMA di file ini. Pastikan ada baris judul dengan kolom NAMA.",
  EMPTY: "Kolom NAMA ditemukan, tetapi belum ada nama siswa di bawahnya.",
  TOO_MANY: `Paling banyak ${IMPORT_MAX} siswa sekali impor.`,
};

const STATUS = {
  NEW: { tone: "success", text: "Akan ditambahkan" },
  EXISTS: { tone: "neutral", text: "Dilewati" },
  INVALID: { tone: "danger", text: "Perlu diperbaiki" },
} as const;

// The file is parsed here, not on the server: a school workbook can be tens of MB (embedded images).
async function readRoster(file: File) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const sheets = wb.worksheets.map((ws) => {
    const grid: unknown[][] = [];
    ws.eachRow((row, n) => {
      grid[n - 1] = (row.values as unknown[]).slice(1);
    });
    return Array.from(grid, (r) => r ?? []);
  });
  return findRosterRows(sheets);
}

export function ImportStudentsDialog({
  classes,
  defaultClassId,
}: {
  classes: ClassOption[];
  defaultClassId?: string;
}) {
  const [classId, setClassId] = useState(defaultClassId ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<RosterRow[] | null>(null);
  const [result, setResult] = useState<ImportState | null>(null);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const reset = () => {
    setRows(null);
    setResult(null);
    setError(undefined);
  };

  const check = () =>
    start(async () => {
      reset();
      if (!classId || !file) return setError("Pilih kelas dan file Excel dulu.");
      let read: Awaited<ReturnType<typeof readRoster>>;
      try {
        read = await readRoster(file);
      } catch {
        return setError("File tidak bisa dibuka. Simpan sebagai .xlsx lalu coba lagi.");
      }
      if (!read.ok) return setError(READ_ERRORS[read.error]);
      setRows(read.rows);
      setResult(await importStudentsAction(classId, read.rows, false));
    });

  const commit = () =>
    start(async () => {
      if (!rows) return;
      setResult(await importStudentsAction(classId, rows, true));
    });

  const preview = result?.ok ? result.rows : [];
  const fresh = preview.filter((r) => r.status === "NEW").length;
  const done = result?.ok && result.created > 0;

  return (
    <Dialog onOpenChange={(open) => !open && reset()}>
      <DialogTrigger render={<Button variant="outline" className="h-11 gap-1.5" />}>
        <HugeiconsIcon icon={FileImportIcon} className="size-[18px]" aria-hidden="true" />
        Impor dari Excel
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl! max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Impor siswa dari Excel</DialogTitle>
          <DialogDescription>
            File dibaca di perangkat ini. Hanya nama, NISN (untuk masuk), dan no. induk yang diambil.
            Siswa yang sudah ada dilewati, tidak diubah.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="import-class">Masukkan ke kelas</Label>
            <select
              id="import-class"
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                reset();
              }}
              className={SELECT}
            >
              <option value="" disabled>
                Pilih kelas
              </option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.isActive ? "" : " (nonaktif)"}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="import-file">File Excel (.xlsx)</Label>
            <input
              id="import-file"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                reset();
              }}
              className="text-base file:mr-3 file:h-11 file:rounded-xl file:border-0 file:bg-canvas-peach file:px-4 file:font-bold file:text-primary-strong"
            />
          </div>
          <Button type="button" variant="outline" className="h-11" onClick={check} disabled={pending} aria-busy={pending}>
            {pending && !rows ? "Sedang membaca file…" : "Periksa file"}
          </Button>
          <FormMessage message={error ?? (result && !result.ok ? result.message : undefined)} />

          {preview.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-stone-200">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Pratinjau impor siswa</caption>
                <thead className="bg-stone-50 text-xs font-bold text-text-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2">Nama</th>
                    <th scope="col" className="px-3 py-2">NISN</th>
                    <th scope="col" className="px-3 py-2">No. Induk</th>
                    <th scope="col" className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i} className="border-t border-stone-100 align-top">
                      <td className="px-3 py-2 font-semibold">{r.displayName || "-"}</td>
                      <td className="px-3 py-2">{r.nis || "-"}</td>
                      <td className="px-3 py-2">{r.studentNo || "-"}</td>
                      <td className="px-3 py-2">
                        <Status tone={STATUS[r.status].tone}>
                          {STATUS[r.status].text}
                          {r.message ? `: ${r.message}` : ""}
                        </Status>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p role="status" className="text-sm font-medium text-tone-success">
            {done ? `${result.created} siswa ditambahkan.` : null}
          </p>
          {result?.ok && !done && (
            <Button type="button" className="h-11" onClick={commit} disabled={pending || fresh === 0} aria-busy={pending}>
              {fresh === 0 ? "Tidak ada siswa baru" : pending ? "Sedang menyimpan…" : `Tambahkan ${fresh} siswa`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
