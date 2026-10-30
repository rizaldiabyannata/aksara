import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

// Short, true guidance about how this app behaves (D8). Stitch's pedagogy panels, minus claims we cannot back.
export function GuidePanel({ title, items }: { title: string; items: { head: string; body: string }[] }) {
  return (
    <section className="flex flex-col gap-space-md rounded-2xl bg-surface-card p-space-lg shadow-sm">
      <h2 className="flex items-center gap-2 font-headline-sm text-headline-sm text-text-primary">
        <HugeiconsIcon icon={InformationCircleIcon} aria-hidden="true" className="size-[22px] text-primary-strong" />
        {title}
      </h2>
      <ol className="flex flex-col gap-space-sm">
        {items.map((it, i) => (
          <li key={it.head} className="rounded-xl bg-canvas-peach p-3 font-body-md text-body-md text-on-surface">
            <span className="mb-1 block font-label-md text-label-md text-primary-strong">{i + 1}. {it.head}</span>
            {it.body}
          </li>
        ))}
      </ol>
    </section>
  );
}
