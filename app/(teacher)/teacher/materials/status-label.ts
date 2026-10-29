import type { StatusTone } from "@/components/status";
import type { MaterialStatus } from "@/lib/generated/prisma/enums";

export const STATUS_LABEL: Record<MaterialStatus, string> = {
  DRAFT: "Draf",
  REVIEWED: "Sudah ditinjau",
  PUBLISHED: "Terbit",
};

export const STATUS_TONE: Record<MaterialStatus, StatusTone> = {
  DRAFT: "neutral",
  REVIEWED: "info",
  PUBLISHED: "success",
};
