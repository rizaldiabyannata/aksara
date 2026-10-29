"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function StartButton({ quizId, title, label }: { quizId: string; title: string; label: "Mulai" | "Lanjutkan" | "Ulangi" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  // cacheComponents keeps this state when the list is hidden; reset it when hidden so coming back isn't stuck on "Membuka…".
  useLayoutEffect(() => () => setBusy(false), []);

  async function start() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/start`, { method: "POST", redirect: "manual" });
      if (res.type === "opaqueredirect") {
        setMessage("Sesimu berakhir. Masuk lagi untuk melanjutkan.");
        setBusy(false);
        return;
      }
      const body = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (res.ok && body?.ok) {
        router.push(`/student/quizzes/${encodeURIComponent(quizId)}/attempt`);
        return; // keep the button disabled while navigating
      }
      setMessage(body?.message ?? "Ada masalah. Coba lagi sebentar lagi.");
    } catch {
      setMessage("Tidak ada sambungan internet. Coba lagi.");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <Button className="h-11" onClick={start} aria-disabled={busy || undefined} aria-label={`${label} ${title}`}>
        {busy ? "Membuka…" : label}
      </Button>
      <p role="status" className="text-sm">
        {message}
        {message.startsWith("Sesimu") && (
          <>
            {" "}
            <Link href="/login" className="underline underline-offset-4">
              Masuk lagi
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
