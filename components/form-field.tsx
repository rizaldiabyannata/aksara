import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Labelled input whose error (and optional hint) is linked via aria-describedby. `name` doubles as the id. */
export function FormField({
  name,
  label,
  error,
  hint,
  ...props
}: ComponentProps<typeof Input> & {
  name: string;
  label: string;
  error?: string;
  hint?: string;
}) {
  const describedBy =
    [error && `${name}-error`, hint && `${name}-hint`].filter(Boolean).join(" ") ||
    undefined;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        className="h-11"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {hint && (
        <p id={`${name}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className="text-sm text-destructive">
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
    <p role="alert" className="text-sm font-medium text-destructive">
      {message}
    </p>
  );
}
