"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function StartButton({ quizId, title, label, needsToken: tokenAtRender = false }: { quizId: string; title: string; label: "Mulai" | "Lanjutkan" | "Ulangi"; needsToken?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  // The teacher may switch the token on after this list rendered; the server's TOKEN_* reply reveals the field.
  const [needsToken, setNeedsToken] = useState(tokenAtRender);
  // cacheComponents keeps this state when the list is hidden; reset it when hidden so coming back isn't stuck on "Membuka…".
  useLayoutEffect(() => () => setBusy(false), []);

  async function start() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/start`, {
        method: "POST", redirect: "manual",
        ...(needsToken ? { headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) } : {}),
      });
      if (res.type === "opaqueredirect") {
        setMessage("Sesimu berakhir. Masuk lagi untuk melanjutkan.");
        setBusy(false);
        return;
      }
      const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; message?: string } | null;
      if (res.ok && body?.ok) {
        router.push(`/student/quizzes/${encodeURIComponent(quizId)}/attempt`);
        return; // keep the button disabled while navigating
      }
      if (body?.error?.startsWith("TOKEN_")) setNeedsToken(true);
      setMessage(body?.message ?? "Ada masalah. Coba lagi sebentar lagi.");
    } catch {
      setMessage("Tidak ada sambungan internet. Coba lagi.");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2">
      {needsToken && (
        <div className="flex flex-col gap-1">
          <label htmlFor={`token-${quizId}`} className="font-label-md text-label-md">Token ujian</label>
          <input
            id={`token-${quizId}`} value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" autoCapitalize="characters"
            spellCheck={false} maxLength={12} placeholder="Contoh: ABC DEF"
            className="h-12 w-full rounded-xl border-2 border-input bg-card px-3 font-mono text-base uppercase tracking-widest outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring"
          />
          <p className="text-sm text-muted-foreground">Token ada di papan tulis. Tanya gurumu kalau belum ada.</p>
        </div>
      )}
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
