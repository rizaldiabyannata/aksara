import type { MaterialStatus } from "@/lib/generated/prisma/enums";

export const STATUS_LABEL: Record<MaterialStatus, string> = {
  DRAFT: "Draf",
  REVIEWED: "Sudah ditinjau",
  PUBLISHED: "Terbit",
};
