"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { RefreshIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-card px-space-md py-2 shadow-sm">
      <div className="flex min-w-0 items-center gap-2 text-label-sm text-on-surface-variant">
        <span className="h-2.5 w-2.5 rounded-full bg-tone-success" aria-hidden="true" />
        <span>Diperbarui pukul <strong>{formatWitaTime(new Date(renderedAt))}</strong></span>
      </div>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-canvas-peach px-3 font-label-md text-label-md text-primary-strong transition-all hover:bg-canvas-peach-subtle focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        <HugeiconsIcon icon={RefreshIcon} className="size-[22px]" aria-hidden="true" />
        Muat ulang
      </button>
    </div>
  );
}
