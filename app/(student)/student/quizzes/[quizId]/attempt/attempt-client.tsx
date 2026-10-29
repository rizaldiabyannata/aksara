"use client";

import { Alert02Icon, CheckmarkCircle02Icon, Clock01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { StoredAnswer } from "@/lib/grading";
import { createSaveQueue, remainingMs, type SaveStatus } from "./save-queue";

type Q = {
  id: string; // quizQuestionId
  number: number;
  type: "SINGLE_CHOICE" | "MULTIPLE_SELECT" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY";
  answer: StoredAnswer | null;
  prompt: ReactNode;
  options: { id: string; node: ReactNode }[] | null;
};
type Props = { attemptId: string; quizId: string; quizTitle: string; deadlineAt: string; serverNow: string; questions: Q[] };
type Phase = "running" | "done" | "closed";

const LINK = "inline-flex min-h-11 items-center underline underline-offset-4";
const CHOICE = "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:checked]:border-2 has-[:checked]:font-medium has-[:focus-visible]:ring-2";
const SESSION_ENDED_MSG = "Sesimu berakhir. Masuk lagi untuk melanjutkan.";
const TEXT_DEBOUNCE_MS = 800;
const FLUSH_TIMEOUT_MS = 5000;

const isAnswered = (a: StoredAnswer | null | undefined) => {
  if (!a) return false;
  if ("optionIds" in a) return a.optionIds.length > 0;
  if ("text" in a) return a.text.trim() !== "";
  return true;
};
const clock = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const hhmm = (d: Date) => d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

export function AttemptClient({ attemptId, quizId, quizTitle, deadlineAt, serverNow, questions }: Props) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, StoredAnswer | null>>(() =>
    Object.fromEntries(questions.map((q) => [q.id, q.answer])),
  );
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });
  const [phase, setPhase] = useState<Phase>("running");
  const [closedMsg, setClosedMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Server-time anchor: remaining time never depends on the device clock (performance.now only measures elapsed).
  const anchor = useRef({ deadlineAt, serverNow, receivedAt: 0 });
  const [left, setLeft] = useState(() => remainingMs(deadlineAt, serverNow, 0, 0));
  useEffect(() => {
    if (anchor.current.receivedAt === 0) anchor.current.receivedAt = performance.now(); // keep the anchor when re-shown
  }, []);

  const [queue] = useState(() =>
    createSaveQueue({
      send: (quizQuestionId, answer) =>
        fetch(`/api/quiz-attempts/${encodeURIComponent(attemptId)}/answers`, {
          method: "PUT",
          redirect: "manual",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quizQuestionId, answer }),
        }),
      onStatus: (st) => {
        setStatus(st);
        if (st.kind === "closed") {
          setClosedMsg(
            st.error === "SESSION_ENDED"
              ? SESSION_ENDED_MSG
              : st.error === "DEADLINE_PASSED"
                ? "Waktu habis, jawabanmu sudah dikumpulkan."
                : "Jawabanmu sudah dikumpulkan.",
          );
          setPhase("closed");
        }
      },
    }),
  );
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const submitted = useRef(false);

  const commitText = useCallback(
    (qqId: string, text: string) => {
      const t = timers.current.get(qqId);
      if (t) clearTimeout(t);
      timers.current.delete(qqId);
      queue.set(qqId, text.trim() === "" ? null : { text });
    },
    [queue],
  );
  const textRef = useRef(new Map<string, string>()); // latest unsent text per question
  const commitPending = useCallback(() => {
    for (const qqId of [...timers.current.keys()]) commitText(qqId, textRef.current.get(qqId) ?? "");
  }, [commitText]);

  const choose = (qqId: string, answer: StoredAnswer | null) => {
    setAnswers((a) => ({ ...a, [qqId]: answer }));
    queue.set(qqId, answer);
  };
  const typeText = (qqId: string, text: string) => {
    setAnswers((a) => ({ ...a, [qqId]: text.trim() === "" ? null : { text } }));
    textRef.current.set(qqId, text);
    const old = timers.current.get(qqId);
    if (old) clearTimeout(old);
    timers.current.set(qqId, setTimeout(() => commitText(qqId, text), TEXT_DEBOUNCE_MS));
  };
  const go = (i: number) => {
    commitPending();
    setIndex(Math.max(0, Math.min(questions.length - 1, i)));
  };

  const submit = useCallback(
    async (byTimer: boolean) => {
      if (submitted.current) return;
      submitted.current = true;
      setSubmitting(true);
      setSubmitError("");
      commitPending();
      await Promise.race([queue.flush(), new Promise((r) => setTimeout(r, FLUSH_TIMEOUT_MS))]);
      try {
        const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/submit`, {
          method: "POST",
          redirect: "manual",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attemptId }),
        });
        if (res.type === "opaqueredirect") {
          setClosedMsg(SESSION_ENDED_MSG);
          setPhase("closed");
          return;
        }
        if (res.ok || res.status === 409 || res.status === 404) {
          setPhase("done");
          return;
        }
      } catch {
        // fall through
      }
      if (byTimer) {
        // The server finalizes expired attempts itself; answers saved before the deadline are kept.
        setClosedMsg("Waktu habis, jawabanmu sudah dikumpulkan.");
        setPhase("closed");
        return;
      }
      submitted.current = false;
      setSubmitting(false);
      setSubmitError("Gagal mengumpulkan. Coba lagi.");
    },
    [attemptId, quizId, queue, commitPending],
  );

  // Countdown: the interval only displays; expiry flushes and submits once.
  useEffect(() => {
    if (phase !== "running") return;
    const tick = () => {
      const ms = remainingMs(anchor.current.deadlineAt, anchor.current.serverNow, anchor.current.receivedAt, performance.now());
      setLeft(ms);
      if (ms <= 0) void submit(true);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, submit]);

  // Resync with the server after the tab was hidden or the network came back.
  useEffect(() => {
    if (phase !== "running") return;
    const resync = async () => {
      try {
        const res = await fetch(`/api/quiz-attempts/${encodeURIComponent(attemptId)}`, { cache: "no-store", redirect: "manual" });
        if (res.type === "opaqueredirect") {
          setClosedMsg(SESSION_ENDED_MSG);
          setPhase("closed");
          return;
        }
        if (res.status === 409 || res.status === 404) {
          setClosedMsg("Jawabanmu sudah dikumpulkan.");
          setPhase("closed");
          return;
        }
        const body = (await res.json()) as { ok?: boolean; attempt?: { status: string; deadlineAt?: string; serverNow?: string } };
        const a = body.attempt;
        if (!res.ok || !a) return;
        if (a.status !== "IN_PROGRESS") {
          setClosedMsg("Jawabanmu sudah dikumpulkan.");
          setPhase("closed");
        } else if (a.deadlineAt && a.serverNow) {
          anchor.current = { deadlineAt: a.deadlineAt, serverNow: a.serverNow, receivedAt: performance.now() };
        }
      } catch {
        // still offline; the next event retries
      }
    };
    void resync(); // a re-shown component (Activity) must not trust stale state
    const onVisible = () => {
      if (document.visibilityState === "visible") void resync();
    };
    const onOnline = () => {
      queue.retryNow();
      void resync();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [phase, attemptId, queue]);

  // Warn before leaving while something is unsaved.
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (queue.pending() || timers.current.size > 0) e.preventDefault();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [queue]);

  // On unmount push pending debounced text into the queue, then clear timers (strict mode runs this once with none pending).
  useEffect(() => {
    const t = timers.current;
    const text = textRef.current;
    return () => {
      t.forEach((id, qqId) => {
        clearTimeout(id);
        const v = text.get(qqId) ?? "";
        queue.set(qqId, v.trim() === "" ? null : { text: v });
      });
      t.clear();
    };
  }, [queue]);

  if (phase === "closed" && closedMsg === SESSION_ENDED_MSG) {
    return (
      <section className="flex flex-col gap-3" aria-live="polite">
        <p className="font-semibold">{SESSION_ENDED_MSG}</p>
        <div>
          <Link href="/login" className={LINK}>
            Masuk lagi
          </Link>
        </div>
      </section>
    );
  }
  if (phase !== "running") {
    return (
      <section className="flex flex-col gap-3" aria-live="polite">
        {phase === "closed" && closedMsg ? <p className="font-semibold">{closedMsg}</p> : null}
        <p className="flex items-center gap-2">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} aria-hidden />
          Jawabanmu sudah dikumpulkan. Nilai muncul setelah guru merilis hasil.
        </p>
        <div>
          <Link href="/student/quizzes" className={LINK}>
            Kembali ke daftar ulangan
          </Link>
        </div>
      </section>
    );
  }

  const q = questions[index];
  const a = answers[q.id] ?? null;
  const unanswered = questions.filter((x) => !isAnswered(answers[x.id])).length;
  const minutes = left / 60000;
  const warning = left <= 0 ? "" : minutes <= 1 ? "Sisa 1 menit." : minutes <= 5 ? "Sisa 5 menit." : "";
  const selected = a && "optionIds" in a ? a.optionIds : [];

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">{quizTitle}</h1>
        <p className="flex items-center gap-2 font-medium">
          <HugeiconsIcon icon={Clock01Icon} aria-hidden />
          <span>Sisa waktu {clock(left)}</span>
        </p>
        <div aria-live="polite" className="min-h-6 text-sm">
          {warning ? (
            <p className="flex items-center gap-2 font-semibold">
              <HugeiconsIcon icon={Alert02Icon} aria-hidden />
              {warning}
            </p>
          ) : null}
        </div>
        <p aria-live="polite" className="min-h-6 text-sm text-muted-foreground">
          {status.kind === "saving" && "Menyimpan…"}
          {status.kind === "saved" && `Tersimpan ${hhmm(status.at)}`}
          {status.kind === "error" && "Gagal menyimpan, mencoba lagi"}
        </p>
      </header>

      <nav aria-label="Daftar soal">
        <ul className="flex flex-wrap gap-2">
          {questions.map((x, i) => {
            const done = isAnswered(answers[x.id]);
            return (
              <li key={x.id}>
                <Button
                  variant={i === index ? "default" : "outline"}
                  className="h-11 min-w-11 gap-1"
                  aria-current={i === index ? "step" : undefined}
                  aria-label={`Soal ${x.number}, ${done ? "sudah" : "belum"} dijawab`}
                  onClick={() => go(i)}
                >
                  {x.number}
                  {done ? <HugeiconsIcon icon={CheckmarkCircle02Icon} aria-hidden /> : null}
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>

      <fieldset key={q.id} className="flex min-w-0 flex-col gap-3">
        <legend className="mb-2 font-semibold">Soal {q.number}</legend>
        <div>{q.prompt}</div>
        {q.type === "SINGLE_CHOICE" &&
          q.options?.map((o) => (
            <label key={o.id} className={CHOICE}>
              <input
                type="radio"
                name={`q-${q.id}`}
                className="mt-1 size-5"
                checked={!!a && "optionId" in a && a.optionId === o.id}
                onChange={() => choose(q.id, { optionId: o.id })}
              />
              <span className="min-w-0">{o.node}</span>
            </label>
          ))}
        {q.type === "MULTIPLE_SELECT" &&
          q.options?.map((o) => (
            <label key={o.id} className={CHOICE}>
              <input
                type="checkbox"
                className="mt-1 size-5"
                checked={selected.includes(o.id)}
                onChange={(e) => {
                  const ids = e.target.checked ? [...selected, o.id] : selected.filter((id) => id !== o.id);
                  choose(q.id, ids.length ? { optionIds: ids } : null);
                }}
              />
              <span className="min-w-0">{o.node}</span>
            </label>
          ))}
        {q.type === "TRUE_FALSE" &&
          [true, false].map((v) => (
            <label key={String(v)} className={CHOICE}>
              <input
                type="radio"
                name={`q-${q.id}`}
                className="mt-1 size-5"
                checked={!!a && "value" in a && a.value === v}
                onChange={() => choose(q.id, { value: v })}
              />
              <span>{v ? "Benar" : "Salah"}</span>
            </label>
          ))}
        {q.type === "SHORT_ANSWER" && (
          <input
            type="text"
            aria-label={`Jawaban soal ${q.number}`}
            className="h-11 rounded-lg border px-3"
            maxLength={200}
            autoComplete="off"
            value={a && "text" in a ? a.text : ""}
            onChange={(e) => typeText(q.id, e.target.value)}
            onBlur={() => commitPending()}
          />
        )}
        {q.type === "ESSAY" && (
          <textarea
            aria-label={`Jawaban soal ${q.number}`}
            className="min-h-40 rounded-lg border p-3"
            maxLength={5000}
            value={a && "text" in a ? a.text : ""}
            onChange={(e) => typeText(q.id, e.target.value)}
            onBlur={() => commitPending()}
          />
        )}
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="h-11" disabled={index === 0} onClick={() => go(index - 1)}>
          Sebelumnya
        </Button>
        <Button variant="outline" className="h-11" disabled={index === questions.length - 1} onClick={() => go(index + 1)}>
          Berikutnya
        </Button>
        <Button className="h-11" disabled={submitting} onClick={() => { commitPending(); setConfirmOpen(true); }}>
          Kumpulkan
        </Button>
      </div>
      <p role="alert" className="text-sm">
        {submitError}
      </p>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => setConfirmOpen(o && !submitting)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kumpulkan jawaban?</AlertDialogTitle>
            <AlertDialogDescription>{unanswered > 0 ? `${unanswered} soal belum dijawab.` : "Semua soal sudah dijawab."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="h-11"
              disabled={submitting}
              onClick={() => {
                setConfirmOpen(false);
                void submit(false);
              }}
            >
              Kumpulkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
