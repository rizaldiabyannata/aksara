import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckListIcon, Menu01Icon, Note01Icon, RadioButtonIcon, TaskDone01Icon } from "@hugeicons/core-free-icons";
import type { QuestionType } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { TYPE_LABEL } from "./labels";

const ITEMS: { type: QuestionType; icon: typeof RadioButtonIcon; sub: string }[] = [
  { type: "SINGLE_CHOICE", icon: RadioButtonIcon, sub: "1 Kunci Pasti" },
  { type: "MULTIPLE_SELECT", icon: CheckListIcon, sub: "> 1 Jawaban" },
  { type: "TRUE_FALSE", icon: TaskDone01Icon, sub: "Benar atau Salah" },
  { type: "SHORT_ANSWER", icon: Menu01Icon, sub: "Kata/Angka Eksak" },
  { type: "ESSAY", icon: Note01Icon, sub: "Rubrik Guru" },
];

/** Stitch type tab strip. `links`: on /new each item picks the type; on edit the type is fixed. */
export function TypeStrip({ current, links }: { current?: QuestionType; links: boolean }) {
  return (
    <div className="bg-surface-card border border-border-subtle rounded-2xl p-2.5 shadow-sm mb-space-lg">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {ITEMS.map(({ type, icon, sub }) => {
          const on = type === current;
          const cls = cn(
            "flex items-center gap-2.5 p-3 min-h-12 rounded-xl text-left transition-all focus-visible:ring-[3px] focus-visible:ring-ring",
            on
              ? "bg-canvas-peach text-primary-strong border-2 border-border-active shadow-xs"
              : "bg-surface-card text-text-primary border border-border-subtle",
            links && !on && "hover:bg-surface-container-low group",
            !links && !on && "opacity-60",
          );
          const body = (
            <>
              <div
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  on ? "bg-primary text-primary-foreground" : "bg-surface-container text-text-muted",
                  links && !on && "group-hover:text-primary-strong group-hover:bg-canvas-peach",
                )}
              >
                <HugeiconsIcon icon={icon} className="size-5" aria-hidden="true" />
              </div>
              <div className="flex flex-col">
                <span className={cn("text-sm leading-tight", on ? "font-bold" : "font-semibold")}>{TYPE_LABEL[type]}</span>
                <span className="text-[11px] text-text-muted mt-0.5">{sub}</span>
              </div>
            </>
          );
          return links ? (
            <Link key={type} href={`/teacher/questions/new?type=${type}`} aria-current={on ? "true" : undefined} className={cls}>
              {body}
            </Link>
          ) : (
            <div key={type} aria-current={on ? "true" : undefined} className={cls}>
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
