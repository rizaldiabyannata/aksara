"use client";

import { useActionState, useState } from "react";
import { FormMessage } from "@/components/form-field";
import { ArrowRight01Icon, School01Icon, UserIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { IconField } from "../icon-field";
import { loginStudentAction } from "../actions";

export function StudentLoginForm() {
  const [state, formAction, pending] = useActionState(loginStudentAction, undefined);
  // Controlled, so React's post-action form reset keeps what the child typed.
  const [classCode, setClassCode] = useState("");
  const [identity, setIdentity] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-space-lg">
      <IconField
        icon={School01Icon}
        name="classCode"
        label="Kode kelas"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        required
        value={classCode}
        onChange={(e) => setClassCode(e.target.value)}
      />
      <IconField
        icon={UserIcon}
        name="identity"
        label="NIS atau nama"
        autoComplete="off"
        spellCheck={false}
        required
        value={identity}
        onChange={(e) => setIdentity(e.target.value)}
      />
      <FormMessage message={state?.message} />
      <div className="flex flex-col gap-space-sm pt-space-xs">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="w-full min-h-[52px] px-space-xl py-3 rounded-xl bg-primary-container hover:bg-primary-container/90 active:scale-[0.99] text-on-primary font-headline-sm text-headline-sm flex items-center justify-center gap-space-sm shadow-md shadow-primary-container/25 transition-all duration-200 cursor-pointer disabled:opacity-60 focus-visible:ring-[3px] focus-visible:ring-ring outline-none"
        >
          {pending ? "Sedang masuk…" : "Masuk"}
          <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" className="size-6" />
        </button>
      </div>
    </form>
  );
}
