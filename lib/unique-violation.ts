import { Prisma } from "@/lib/generated/prisma/client";

// Prisma 7 + adapter-pg reports the violated index in
// meta.driverAdapterError.cause.constraint.index (e.g. "Class_code_key").
// `indexes` maps index name -> caller's label; null if not a P2002 or unknown index.
export function uniqueViolation<T extends string>(
  e: unknown,
  indexes: Record<string, T>,
): T | null {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") {
    return null;
  }
  const meta = JSON.stringify(e.meta ?? {});
  for (const [index, label] of Object.entries(indexes)) {
    if (meta.includes(index)) return label;
  }
  return null;
}
