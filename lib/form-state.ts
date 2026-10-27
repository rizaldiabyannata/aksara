/** State shape for Server Actions used with `useActionState`. */
export type FormState =
  | { message?: string; fieldErrors?: Record<string, string> }
  | undefined;

/** FormData value as a string; files and missing fields become "". */
export const field = (fd: FormData, name: string): string => {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
};
