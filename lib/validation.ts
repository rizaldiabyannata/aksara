import { z } from "zod";

export type Invalid = { ok: false; error: "INVALID"; fieldErrors: Record<string, string> };
export type NotFound = { ok: false; error: "NOT_FOUND" };

export function parse<S extends z.ZodType>(
  schema: S,
  input: unknown,
): { ok: true; data: z.infer<S> } | Invalid {
  const r = schema.safeParse(input);
  if (r.success) return { ok: true, data: r.data };
  const fieldErrors: Record<string, string> = {};
  for (const i of r.error.issues) {
    const key = i.path.length ? String(i.path[0]) : "form";
    fieldErrors[key] ??= i.message;
  }
  return { ok: false, error: "INVALID", fieldErrors };
}

export const required = (max: number, msg: string) =>
  z.string({ error: msg }).trim().min(1, { error: msg }).max(max, { error: msg });
export const optional = (max: number, msg: string) =>
  z
    .string({ error: msg })
    .trim()
    .max(max, { error: msg })
    .optional()
    .transform((v) => v || null);
