"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** "ABCDEF" -> "ABC DEF" (login accepts the space). */
const groupCode = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;

/** The code, very large, for writing on the board or projecting. */
export function ClassCodeDialog({ name, code }: { name: string; code: string }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" className="h-11" />}>Tampilkan kode</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Kode kelas {name}</DialogTitle>
          <DialogDescription>Tulis kode ini di papan tulis untuk siswa.</DialogDescription>
        </DialogHeader>
        <p
          aria-label={`Kode: ${code.split("").join(" ")}`}
          className="text-center font-mono font-extrabold tracking-widest break-all"
          style={{ fontSize: "clamp(3rem, 15vw, 8rem)" }}
        >
          {groupCode(code)}
        </p>
        <DialogClose render={<Button className="h-12" />}>Selesai</DialogClose>
      </DialogContent>
    </Dialog>
  );
}
