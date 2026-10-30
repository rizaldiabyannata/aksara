"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { clearHelpAction } from "../actions";

export function HelpClearButton({ attemptId, student }: { attemptId: string; student: string }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" className="h-11" disabled={pending} aria-label={`Tandai ${student} sudah dibantu`} onClick={() => start(async () => { await clearHelpAction(attemptId); })}>
      Sudah dibantu
    </Button>
  );
}
