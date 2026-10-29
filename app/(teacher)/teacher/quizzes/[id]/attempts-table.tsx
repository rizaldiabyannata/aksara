"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Feedback } from "@/components/form-feedback";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { grantReplacementAction } from "../actions";

export type MonitorRow = {
  attemptId: string; studentName: string; className: string; attemptNumber: number;
  status: string; replaced: boolean; startedAt: string; submittedAt: string; score: string; href: string;
};

function ReplaceButton({ row }: { row: MonitorRow }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(grantReplacementAction.bind(null, row.attemptId), undefined);
  const who = `${row.studentName || "siswa"}, percobaan ${row.attemptNumber}`;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" className="h-11" aria-label={`Beri percobaan pengganti untuk ${who}`} />}
      >
        Beri percobaan pengganti
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Beri percobaan pengganti</DialogTitle>
          <DialogDescription>{who}. Percobaan ini tidak dihitung lagi dan siswa bisa mengulang.</DialogDescription>
        </DialogHeader>
        {state?.ok ? (
          <>
            <Feedback state={state} />
            <DialogFooter><DialogClose render={<Button className="h-11" />}>Tutup</DialogClose></DialogFooter>
          </>
        ) : (
          <form action={action} className="flex flex-col gap-3">
            <FormField name="reason" id={`reason-${row.attemptId}`} label="Alasan" required minLength={5} maxLength={300}
              hint="5 sampai 300 huruf." defaultValue={state?.values?.reason ?? ""} error={state?.fieldErrors?.reason} />
            <Feedback state={state} />
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" className="h-11" />}>Batal</DialogClose>
              <Button type="submit" className="h-11" disabled={pending}>Beri percobaan pengganti</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AttemptsTable({ rows }: { rows: MonitorRow[] }) {
  if (rows.length === 0) return <p className="text-muted-foreground">Belum ada siswa yang mengerjakan.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            {["Siswa", "Kelas", "Percobaan", "Status", "Mulai", "Selesai", "Nilai", "Aksi"].map((h) => (
              <th key={h} scope="col" className="p-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.attemptId} className="border-b align-middle">
              <th scope="row" className="p-2 font-medium">{r.studentName}</th>
              <td className="p-2">{r.className}</td>
              <td className="p-2">{r.attemptNumber}</td>
              <td className="p-2">{r.status}</td>
              <td className="p-2">{r.startedAt}</td>
              <td className="p-2">{r.submittedAt || "-"}</td>
              <td className="p-2">{r.score || "-"}</td>
              <td className="flex flex-wrap gap-2 p-2">
                <Link href={r.href} className="inline-flex min-h-11 items-center underline"
                  aria-label={`Lihat dan nilai jawaban ${r.studentName}, percobaan ${r.attemptNumber}`}>
                  Lihat jawaban
                </Link>
                {r.replaced ? null : <ReplaceButton row={r} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
