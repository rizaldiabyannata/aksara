"use client";

import { useActionState, useState } from "react";
import { FormMessage } from "@/components/form-field";
import { LockPasswordIcon, UserIcon } from "@hugeicons/core-free-icons";
import { IconField } from "../../icon-field";
import { Button } from "@/components/ui/button";
import { loginTeacherAction } from "../../actions";

export function TeacherLoginForm() {
  const [state, formAction, pending] = useActionState(loginTeacherAction, undefined);
  // Username is controlled so it survives the post-action reset; the password is not kept.
  const [username, setUsername] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <IconField
        icon={UserIcon}
        name="username"
        label="Username"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <IconField
        icon={LockPasswordIcon}
        name="password"
        label="Kata sandi"
        type="password"
        autoComplete="current-password"
        required
      />
      <FormMessage message={state?.message} />
      <Button type="submit" size="lg" className="w-full" disabled={pending} aria-busy={pending}>
        {pending ? "Sedang masuk…" : "Masuk"}
      </Button>
    </form>
  );
}
