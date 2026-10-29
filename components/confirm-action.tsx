"use client";

import { startTransition, useActionState, useState } from "react";
import { Feedback } from "@/components/form-feedback";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/form-state";

type ConfirmProps = {
  action: (prev: FormState) => Promise<FormState>;
  trigger: string;
  title: string;
  description: string;
  confirm: string;
  destructive?: boolean;
  /** Make the trigger the page's main button (default variant, large). */
  primary?: boolean;
  /** Green trigger for release-style actions. */
  success?: boolean;
  /** Accessible name for the trigger when `trigger` alone is not unique on the page. */
  triggerLabel?: string;
};

/** Button + AlertDialog confirmation. The action is dispatched before the dialog closes, so closing never cancels it. */
export function ConfirmAction({
  action,
  trigger,
  title,
  description,
  confirm,
  destructive,
  primary,
  success,
  triggerLabel,
}: ConfirmProps) {
  const [state, dispatch, pending] = useActionState(action, undefined);
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <AlertDialog open={open} onOpenChange={(next) => setOpen(next && !pending)}>
        {/* aria-disabled, not disabled: the trigger stays focusable so focus can return to it on close. */}
        <AlertDialogTrigger
          render={
            <Button
              variant={success ? "success" : primary ? "default" : destructive ? "destructive" : "outline"}
              size={primary || success ? "lg" : undefined}
              className={primary || success ? "aria-disabled:opacity-50" : "h-11 aria-disabled:opacity-50"}
              aria-disabled={pending || undefined}
              aria-busy={pending || undefined}
              aria-label={triggerLabel}
            />
          }
        >
          {trigger}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Batal</AlertDialogCancel>
            <AlertDialogAction
              variant={destructive ? "destructive" : "default"}
              className="h-11"
              disabled={pending}
              onClick={() => {
                startTransition(() => dispatch());
                setOpen(false);
              }}
            >
              {confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Feedback state={state} />
    </div>
  );
}
