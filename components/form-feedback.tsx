import { FormMessage } from "@/components/form-field";
import type { FormState } from "@/lib/form-state";

/** Success is announced politely; errors are alerts. The status region stays mounted so inserted text is read out. */
export function Feedback({ state }: { state: FormState }) {
  return (
    <>
      <p role="status" className="text-sm font-medium text-muted-foreground">
        {state?.ok ? state.message : null}
      </p>
      {!state?.ok && <FormMessage message={state?.message} />}
    </>
  );
}
