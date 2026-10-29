"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { formatWitaTime } from "@/lib/format";

const EVERY_MS = 30_000;

/** Display-only: re-renders the server page. It never touches attempt timing. */
export function AutoRefresh({ active, renderedAt }: { active: boolean; renderedAt: string }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(tick, EVERY_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [active, router]);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="outline" size="sm" onClick={() => router.refresh()}>Muat ulang</Button>
      <p className="text-sm text-muted-foreground">
        Diperbarui pukul {formatWitaTime(new Date(renderedAt))}
      </p>
    </div>
  );
}
