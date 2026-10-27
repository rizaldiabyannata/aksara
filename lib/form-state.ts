/**
 * State shape for Server Actions used with `useActionState`.
 * `values` echoes submitted fields on errors: React resets the form after every action, so
 * forms use them as `defaultValue`. Never put passwords in it.
 */
export type FormState =
  | {
      message?: string;
      ok?: boolean;
      fieldErrors?: Record<string, string>;
      values?: Record<string, string>;
    }
  | undefined;

/** FormData value as a string; files and missing fields become "". */
export const field = (fd: FormData, name: string): string => {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
};
