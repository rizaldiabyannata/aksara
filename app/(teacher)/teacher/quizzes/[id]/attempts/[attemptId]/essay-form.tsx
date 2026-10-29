"use client";

import { useActionState } from "react";
import { Feedback } from "@/components/form-feedback";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { gradeEssayAction } from "../../../actions";

const textareaClass =
  "min-h-32 w-full rounded-xl border-2 border-input bg-card px-3 py-2 text-base outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30 aria-invalid:border-destructive";

export function EssayGradeForm({
  answerId, n, max, points, feedback, blank,
}: { answerId: string; n: number; max: number; points: number | null; feedback: string | null; blank: boolean }) {
  const [state, action, pending] = useActionState(gradeEssayAction.bind(null, answerId), undefined);
  const e = state?.fieldErrors;
  return (
    <div className="flex flex-col gap-3">
      <form action={action} className="flex flex-col gap-3">
        <FormField name="points" id={`points-${answerId}`} label={`Nilai soal ${n} (0 sampai ${max})`} inputMode="decimal"
          required hint="Boleh pecahan, misalnya 2,5." error={e?.points}
          defaultValue={state?.values?.points ?? (points === null ? "" : String(points).replace(".", ","))} />
        <div className="flex flex-col gap-2">
          <Label htmlFor={`feedback-${answerId}`}>Umpan balik untuk siswa (boleh kosong)</Label>
          <textarea id={`feedback-${answerId}`} name="feedback" rows={3} maxLength={2000} className={textareaClass}
            defaultValue={state?.values?.feedback ?? feedback ?? ""} aria-invalid={e?.feedback ? true : undefined}
            aria-describedby={e?.feedback ? `feedback-${answerId}-error` : undefined} />
          {e?.feedback && <p id={`feedback-${answerId}-error`} className="text-sm text-destructive">{e.feedback}</p>}
        </div>
        <Feedback state={state} />
        <Button type="submit" className="h-11 self-start" disabled={pending}>Simpan nilai</Button>
      </form>
      {blank && points === null && (
        <form action={action}>
          <input type="hidden" name="points" value="0" />
          <Button type="submit" variant="outline" className="h-11" disabled={pending} aria-label={`Beri 0 untuk soal ${n} yang kosong`}>
            Beri 0
          </Button>
        </form>
      )}
    </div>
  );
}
