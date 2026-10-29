"use client";

import { useActionState, useState } from "react";
import { Feedback } from "@/components/form-feedback";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { grantReplacementAction } from "../actions";

export function ReplaceButton({ attemptId, student, attemptNumber }: { attemptId: string; student: string; attemptNumber: number }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(grantReplacementAction.bind(null, attemptId), undefined);
  const who = `${student || "siswa"}, percobaan ${attemptNumber}`;
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
            <FormField name="reason" id={`reason-${attemptId}`} label="Alasan" required minLength={5} maxLength={300}
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
