import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Labelled input whose error (and optional hint) is linked via aria-describedby. `id` defaults to `name`. */
export function FormField({
  name,
  id = name,
  label,
  error,
  hint,
  ...props
}: ComponentProps<typeof Input> & {
  name: string;
  id?: string;
  label: string;
  error?: string;
  hint?: string;
}) {
  const describedBy =
    [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") ||
    undefined;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Form-level error from a FormState; announced when it appears. */
export function FormMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm font-medium whitespace-pre-line text-destructive">
      {message}
    </p>
  );
}
