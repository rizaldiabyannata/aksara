"use client";

import { Key01Icon, Tv01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { rotateExamTokenAction, setExamTokenAction } from "../actions";

const groupCode = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;

/** D5: the teacher turns the exam token on or off, changes it, and shows it big for the projector. */
export function TokenCard({ quizId, title, token }: { quizId: string; title: string; token: string | null }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const run = (call: () => Promise<{ message?: string } | undefined>) =>
    start(async () => setMessage((await call())?.message ?? ""));
  return (
    <section aria-labelledby="token-ujian" className="flex flex-col gap-space-md rounded-2xl bg-surface-card p-space-lg shadow-sm">
      <h2 id="token-ujian" className="flex items-center gap-2 text-xl font-semibold">
        <HugeiconsIcon icon={Key01Icon} className="size-6 text-primary-strong" aria-hidden="true" />
        Token ujian
      </h2>
      <label className="flex min-h-12 items-center gap-3 font-label-md text-label-md">
        <input
          type="checkbox" className="size-6 accent-primary" checked={token !== null} disabled={pending}
          onChange={(e) => run(() => setExamTokenAction(quizId, e.target.checked))}
        />
        Wajibkan token
      </label>
      {token ? (
        <>
          <p className="font-body-md text-on-surface-variant">Siswa harus mengetik token ini sebelum mulai. Siswa yang sedang mengerjakan tidak perlu mengetik lagi.</p>
          <p className="font-mono text-3xl font-extrabold tracking-widest" aria-label={`Token: ${token.split("").join(" ")}`}>{groupCode(token)}</p>
          <div className="flex flex-wrap gap-space-sm">
            <Button variant="outline" className="h-12" disabled={pending} onClick={() => run(() => rotateExamTokenAction(quizId))}>
              Ganti token
            </Button>
            <Dialog>
              <DialogTrigger render={<Button className="h-12 gap-2" />}>
                <HugeiconsIcon icon={Tv01Icon} className="size-[18px]" aria-hidden="true" />
                Tampilkan token (besar)
              </DialogTrigger>
              <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Token ujian {title}</DialogTitle>
                  <DialogDescription>Tulis token ini di papan tulis untuk siswa.</DialogDescription>
                </DialogHeader>
                <p
                  aria-label={`Token: ${token.split("").join(" ")}`}
                  className="text-center font-mono font-extrabold tracking-widest break-all"
                  style={{ fontSize: "clamp(3rem, 15vw, 8rem)" }}
                >
                  {groupCode(token)}
                </p>
                <DialogClose render={<Button className="h-12" />}>Selesai</DialogClose>
              </DialogContent>
            </Dialog>
          </div>
        </>
      ) : (
        <p className="font-body-md text-on-surface-variant">Token mati. Siswa bisa langsung mulai.</p>
      )}
      <p role="status" className="font-body-md">{message}</p>
    </section>
  );
}
