import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Quiz01Icon } from "@hugeicons/core-free-icons";

/** Stitch editor header: breadcrumb row + title card. `actions` are real buttons only. */
export function EditorHeader({
  title, description, badges, actions,
}: {
  title: string; description?: React.ReactNode; badges?: React.ReactNode; actions?: React.ReactNode;
}) {
  return (
    <>
      <nav aria-label="Jejak halaman" className="flex items-center gap-2 text-xs font-semibold text-text-muted mb-4">
        <Link href="/teacher/questions" className="hover:text-primary-strong transition-colors flex items-center gap-1 min-h-11 focus-visible:ring-[3px] focus-visible:ring-ring rounded">
          <HugeiconsIcon icon={Quiz01Icon} className="size-4" aria-hidden="true" />
          Bank Soal
        </Link>
        <span className="text-outline-variant font-bold">/</span>
        <span className="text-text-primary font-bold">{title}</span>
      </nav>
      <div className="bg-surface-card border border-border-subtle rounded-2xl p-space-lg shadow-sm mb-space-lg flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">{title}</h1>
            {badges}
          </div>
          {description && <div className="text-sm text-text-muted max-w-2xl leading-relaxed">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
      </div>
    </>
  );
}
