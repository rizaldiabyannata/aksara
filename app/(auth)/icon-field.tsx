"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

const LOGIN_INPUT =
  "w-full min-h-[52px] pl-12 pr-space-md py-3 rounded-xl bg-canvas-peach/40 text-text-primary font-body-lg text-body-lg focus:outline-none focus:bg-surface-card focus:shadow-[0_0_0_3px_rgba(255,112,52,0.2)] focus-visible:ring-[3px] focus-visible:ring-ring transition-all duration-200 aria-invalid:ring-2 aria-invalid:ring-tone-danger";
const FORM_INPUT =
  "w-full min-h-[48px] pl-12 pr-12 rounded-xl bg-surface-card text-text-primary font-body-md text-body-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-container focus:bg-canvas-peach/30 transition-all placeholder:text-text-muted/60 aria-invalid:ring-2 aria-invalid:ring-tone-danger";

/** Stitch-styled labelled input with a leading icon and (for type="password") a show/hide button. */
export function IconField({
  name,
  id = name,
  label,
  labelAside,
  icon,
  type,
  error,
  hint,
  variant = "login",
  className,
  ...props
}: Omit<ComponentProps<"input">, "id"> & {
  name: string;
  id?: string;
  label: string;
  labelAside?: ReactNode;
  icon: IconSvgElement;
  error?: string;
  hint?: string;
  variant?: "login" | "form";
}) {
  const [shown, setShown] = useState(false);
  const isPassword = type === "password";
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
  const form = variant === "form";
  return (
    <div className="flex flex-col gap-space-xs">
      <div className="flex items-center justify-between gap-space-sm">
        <label htmlFor={id} className="font-label-md text-label-md text-text-primary">
          {label}
        </label>
        {labelAside}
      </div>
      <div className="relative flex items-center">
        <HugeiconsIcon
          icon={icon}
          aria-hidden="true"
          className={`pointer-events-none absolute text-text-muted size-[22px] ${form ? "left-4" : "left-space-md"}`}
        />
        <input
          id={id}
          name={name}
          type={isPassword && shown ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${form ? FORM_INPUT : LOGIN_INPUT} ${isPassword ? "pr-14" : ""} ${className ?? ""}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            // "sandi" only: getByLabel("Kata sandi") in e2e must match the field alone.
            aria-label={shown ? "Sembunyikan sandi" : "Tampilkan sandi"}
            aria-pressed={shown}
            onClick={() => setShown((s) => !s)}
            className="absolute right-0.5 w-11 h-11 flex items-center justify-center text-text-muted hover:text-text-primary rounded-lg transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <HugeiconsIcon icon={shown ? ViewOffIcon : ViewIcon} aria-hidden="true" className="size-[22px]" />
          </button>
        )}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="font-label-sm text-label-sm text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="font-label-sm text-label-sm text-tone-danger">
          {error}
        </p>
      )}
    </div>
  );
}
