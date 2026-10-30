"use client";

import { useActionState, useState } from "react";
import { ArrowRight01Icon, LockPasswordIcon, UserIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { FormMessage } from "@/components/form-field";
import { IconField } from "../../icon-field";
import { loginTeacherAction } from "../../actions";

export function TeacherLoginForm() {
  const [state, formAction, pending] = useActionState(loginTeacherAction, undefined);
  // Username is controlled so it survives the post-action reset; the password is not kept.
  const [username, setUsername] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-space-lg">
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
