"use client";

import { useActionState, useState } from "react";
import { FormField, FormMessage } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { loginTeacherAction } from "../../actions";

export function TeacherLoginForm() {
  const [state, formAction, pending] = useActionState(loginTeacherAction, undefined);
  // Username is controlled so it survives the post-action reset; the password is not kept.
  const [username, setUsername] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormField
        name="username"
        label="Username"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <FormField
        name="password"
        label="Kata sandi"
        type="password"
        autoComplete="current-password"
        required
      />
      <FormMessage message={state?.message} />
      <Button type="submit" className="h-11 w-full text-base" disabled={pending} aria-busy={pending}>
        {pending ? "Sedang masuk…" : "Masuk"}
      </Button>
    </form>
  );
}
