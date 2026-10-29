import {
  Alert02Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Badge } from "@/components/ui/badge";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONES = {
  success: { variant: "success", icon: CheckmarkCircle02Icon },
  warning: { variant: "warning", icon: Alert02Icon },
  danger: { variant: "destructive", icon: CancelCircleIcon },
  info: { variant: "info", icon: InformationCircleIcon },
  neutral: { variant: "secondary", icon: Clock01Icon },
} as const;

// Status = icon + text, so meaning never depends on color alone.
export function Status({ tone, children }: { tone: StatusTone; children: React.ReactNode }) {
  const { variant, icon } = TONES[tone];
  return (
    <Badge variant={variant}>
      <HugeiconsIcon icon={icon} aria-hidden="true" />
      {children}
    </Badge>
  );
}
