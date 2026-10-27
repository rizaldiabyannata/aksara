"use client";

import { useActionState, useId, useState } from "react";
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
};

/** Button + AlertDialog confirmation. The form lives outside the dialog so closing it never cancels the submit. */
export function ConfirmAction({
  action,
  trigger,
  title,
  description,
  confirm,
  destructive,
}: ConfirmProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [open, setOpen] = useState(false);
  const formId = useId();
  return (
    <div className="flex flex-col gap-2">
      <form id={formId} action={formAction} />
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger
          render={<Button variant="outline" className="h-11" disabled={pending} />}
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
              type="submit"
              form={formId}
              variant={destructive ? "destructive" : "default"}
              className="h-11"
              onClick={() => setOpen(false)}
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
