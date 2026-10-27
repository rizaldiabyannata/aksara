"use client";

import { useActionState, useState } from "react";
import { FormField, FormMessage } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { loginStudentAction } from "../actions";

export function StudentLoginForm() {
  const [state, formAction, pending] = useActionState(loginStudentAction, undefined);
  // Controlled, so React's post-action form reset keeps what the child typed.
  const [classCode, setClassCode] = useState("");
  const [identity, setIdentity] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormField
        name="classCode"
        label="Kode kelas"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        required
        value={classCode}
        onChange={(e) => setClassCode(e.target.value)}
      />
      <FormField
        name="identity"
        label="NIS atau nama"
        autoComplete="off"
        spellCheck={false}
        required
        value={identity}
        onChange={(e) => setIdentity(e.target.value)}
      />
      <FormMessage message={state?.message} />
      <Button type="submit" className="h-11 w-full text-base" disabled={pending} aria-busy={pending}>
        {pending ? "Sedang masuk…" : "Masuk"}
      </Button>
    </form>
  );
}
