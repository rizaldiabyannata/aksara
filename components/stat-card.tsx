import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";

import { Card } from "@/components/ui/card";

const TONES = {
  primary: { value: "text-primary-strong", box: "bg-primary-soft text-primary-strong" },
  info: { value: "text-info", box: "bg-info-soft text-info" },
  success: { value: "text-success", box: "bg-success-soft text-success" },
  warning: { value: "text-warning", box: "bg-warning-soft text-warning" },
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: IconSvgElement;
  tone: keyof typeof TONES;
}) {
  const t = TONES[tone];
  return (
    <Card>
      <div className="flex items-start justify-between gap-3 px-(--card-spacing)">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-semibold text-muted-foreground">{label}</p>
          <p className={`text-metric font-extrabold ${t.value}`}>{value}</p>
          {hint && <p className="text-muted-foreground">{hint}</p>}
        </div>
        <span className={`flex size-12 shrink-0 items-center justify-center rounded-full ${t.box}`}>
          <HugeiconsIcon icon={icon} aria-hidden="true" />
        </span>
      </div>
    </Card>
  );
}
