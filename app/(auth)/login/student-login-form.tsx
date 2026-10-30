"use client";

import { useActionState, useState } from "react";
import { FormMessage } from "@/components/form-field";
import { School01Icon, UserIcon } from "@hugeicons/core-free-icons";
import { IconField } from "../icon-field";
import { Button } from "@/components/ui/button";
import { loginStudentAction } from "../actions";

export function StudentLoginForm() {
  const [state, formAction, pending] = useActionState(loginStudentAction, undefined);
  // Controlled, so React's post-action form reset keeps what the child typed.
  const [classCode, setClassCode] = useState("");
  const [identity, setIdentity] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-5">
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
      <Button type="submit" size="lg" className="w-full" disabled={pending} aria-busy={pending}>
        {pending ? "Sedang masuk…" : "Masuk"}
      </Button>
    </form>
  );
}
