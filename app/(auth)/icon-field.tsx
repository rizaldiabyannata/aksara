"use client";

import { useState, type ComponentProps } from "react";
import { ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Like FormField, plus a leading icon and (for type="password") a show/hide button. */
export function IconField({
  name,
  id = name,
  label,
  icon,
  type,
  error,
  hint,
  ...props
}: Omit<ComponentProps<typeof Input>, "id"> & {
  name: string;
  id?: string;
  label: string;
  icon: IconSvgElement;
  error?: string;
  hint?: string;
}) {
  const [shown, setShown] = useState(false);
  const isPassword = type === "password";
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative flex items-center">
        <HugeiconsIcon
          icon={icon}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 text-muted-foreground"
        />
        <Input
          id={id}
          name={name}
          type={isPassword && shown ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="pl-12"
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            // "sandi" only: getByLabel("Kata sandi") in e2e must match the field alone.
            aria-label={shown ? "Sembunyikan sandi" : "Tampilkan sandi"}
            aria-pressed={shown}
            onClick={() => setShown((s) => !s)}
            className="absolute right-0.5 flex size-11 items-center justify-center rounded-xl text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <HugeiconsIcon icon={shown ? ViewOffIcon : ViewIcon} aria-hidden="true" />
          </button>
        )}
      </div>
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
