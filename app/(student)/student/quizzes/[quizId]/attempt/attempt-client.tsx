"use client";

import { Alert02Icon, ArrowLeft01Icon, ArrowRight01Icon, CheckmarkCircle02Icon, Clock01Icon, Flag02Icon, GridViewIcon, InformationCircleIcon, Calculator01Icon, AlarmClockIcon, Tick02Icon, CloudIcon, UserIcon } from "@hugeicons/core-free-icons";
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
import { readFlags, writeFlags } from "./flag-store";
import { createSaveQueue, remainingMs, type SaveStatus } from "./save-queue";

type Q = {
  id: string; // quizQuestionId
  number: number;
  type: "SINGLE_CHOICE" | "MULTIPLE_SELECT" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY" | "CATEGORY";
  answer: StoredAnswer | null;
  prompt: ReactNode;
  options: { id: string; node: ReactNode }[] | null;
  labels: [string, string] | null;
};
type Props = { attemptId: string; quizId: string; quizTitle: string; participant: { name: string; nis: string | null }; deadlineAt: string; serverNow: string; questions: Q[] };
type Phase = "running" | "done" | "closed";

const LINK = "inline-flex min-h-11 items-center underline underline-offset-4";
const SESSION_ENDED_MSG = "Sesimu berakhir. Masuk lagi untuk melanjutkan.";
const TEXT_DEBOUNCE_MS = 800;
const FLUSH_TIMEOUT_MS = 5000;
const TYPE_LABEL = {
  SINGLE_CHOICE: "Pilihan ganda",
  MULTIPLE_SELECT: "Pilih lebih dari satu",
  TRUE_FALSE: "Benar atau salah",
  SHORT_ANSWER: "Isian singkat",
  ESSAY: "Uraian",
  CATEGORY: "Jawab setiap pernyataan",
} as const;
const safeLocalStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};
// Radio/checkbox stay real inputs (same name/value); only the wrapping label is styled.
// Invisible but full-size, so taps and automation hit the input itself rather than a covering label.
const HIT = "absolute inset-0 size-full cursor-pointer appearance-none rounded-2xl opacity-0";
function Choice({ letter, checked, input, children }: { letter: string; checked: boolean; input: ReactNode; children: ReactNode }) {
  return (
    <label
      className={`group relative flex min-h-14 cursor-pointer items-center gap-space-md rounded-2xl p-space-md shadow-xs transition-all has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring ${
        checked ? "border-2 border-primary-strong bg-canvas-peach" : "border border-border-subtle bg-surface-card hover:bg-canvas-peach"
      }`}
    >
      {input}
      <span
        aria-hidden="true"
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-headline-sm text-headline-sm transition-colors ${
          checked ? "bg-primary-strong text-on-primary" : "bg-canvas-peach text-text-primary group-hover:bg-primary-container group-hover:text-on-primary"
        }`}
      >
        {letter}
      </span>
      <span className="flex w-full min-w-0 items-center justify-between gap-2">
        <span className="flex min-w-0 flex-col">
          <span className="font-headline-sm text-headline-sm text-text-primary">{children}</span>
          {checked ? <span aria-hidden="true" className="font-label-sm text-label-sm text-primary-strong lg:hidden">Jawaban kamu saat ini</span> : null}
        </span>
        {checked ? <HugeiconsIcon icon={CheckmarkCircle02Icon} className="shrink-0 text-headline-md text-primary-strong" aria-hidden="true" /> : null}
      </span>
    </label>
  );
}

const isAnswered = (q: Q, a: StoredAnswer | null | undefined) => {
  if (!a) return false;
  if ("optionIds" in a) return a.optionIds.length > 0;
  // A statement left open scores 0 (all-or-nothing), so it is not "terjawab" yet.
  if ("values" in a) return (q.options ?? []).every((o) => Object.hasOwn(a.values, o.id));
  if ("text" in a) return a.text.trim() !== "";
  return true;
};
const clock = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const hhmm = (d: Date) => d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

export function AttemptClient({ attemptId, quizId, quizTitle, participant, deadlineAt, serverNow, questions }: Props) {
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
  const [helpMsg, setHelpMsg] = useState("");
  const [helpBusy, setHelpBusy] = useState(false);
  // D6: idempotent on the server, so pressing again is harmless.
  async function askHelp() {
    if (helpBusy) return;
    setHelpBusy(true);
    try {
      const res = await fetch(`/api/quiz-attempts/${encodeURIComponent(attemptId)}/help`, { method: "POST", redirect: "manual" });
      setHelpMsg(res.ok ? "Guru sudah diberi tahu. Tunggu sebentar, gurumu akan datang." : "Belum terkirim. Coba tekan lagi.");
    } catch {
      setHelpMsg("Belum terkirim karena tidak ada sambungan. Coba tekan lagi.");
    }
    setHelpBusy(false);
  }
  // Doubt flags stay in this browser only; state is the source of truth, storage only persists it.
  const [flags, setFlags] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is unavailable during SSR
    setFlags(readFlags(safeLocalStorage(), attemptId));
  }, [attemptId]);
  const flip = (qid: string) => {
    const next = new Set(flags);
    if (!next.delete(qid)) next.add(qid);
    setFlags(next);
    writeFlags(safeLocalStorage(), attemptId, next);
  };

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
      setSubmitError("Jawabanmu belum terkumpul. Coba lagi, ya.");
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
          Jawabanmu sudah dikumpulkan. Nilaimu akan muncul setelah gurumu membagikannya.
        </p>
        <div>
          <Link href="/student" className={LINK}>
            Kembali ke daftar ulangan
          </Link>
        </div>
      </section>
    );
  }

  const q = questions[index];
  const a = answers[q.id] ?? null;
  const unanswered = questions.filter((x) => !isAnswered(x, answers[x.id])).length;
  const minutes = left / 60000;
  const warning = left <= 0 ? "" : minutes <= 1 ? "Sisa 1 menit." : minutes <= 5 ? "Sisa 5 menit." : "";
  const selected = a && "optionIds" in a ? a.optionIds : [];
  const letter = (i: number) => String.fromCharCode(65 + i);

  const answeredCount = questions.length - unanswered;
  const openConfirm = () => {
    commitPending();
    setConfirmOpen(true);
  };

  const saveText = (
    <>
      {status.kind === "saving" && "Menyimpan…"}
      {status.kind === "saved" && `✓ Tersimpan ${hhmm(status.at)}`}
      {status.kind === "error" && "Jawabanmu belum tersimpan. Coba lagi, ya."}
    </>
  );
  const warnTone = warning ? "border-tone-warning bg-tone-warning-bg" : "border-primary-strong/20 bg-canvas-peach";

  return (
    <section className="flex flex-col pb-56 lg:relative lg:left-1/2 lg:w-[min(72rem,calc(100vw-2rem))] lg:-translate-x-1/2 lg:pb-0">
      {/* Phone header (Stitch mobile): sticky compact bar */}
      <div className="sticky top-0 z-40 -mx-4 -mt-4 flex flex-col gap-space-xs bg-surface/95 px-gutter-mobile py-space-sm shadow-sm backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-space-xs">
          <div className="flex min-w-0 items-center gap-space-xs">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-tone-success" />
            <span className="truncate font-headline-sm text-headline-sm text-text-primary">{quizTitle}</span>
          </div>
          <div role="timer" aria-label="Waktu tersisa" className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 shadow-sm ${warnTone}`}>
            <HugeiconsIcon icon={Clock01Icon} className="size-[18px] text-tone-warning" aria-hidden="true" />
            <span className="font-code-mono text-code-mono font-bold tracking-tight text-text-primary">{clock(left)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-0.5 font-label-sm text-label-sm">
          <p aria-live="polite" className={`flex items-center gap-1 ${status.kind === "error" ? "text-tone-danger" : "text-tone-success"}`}>
            <HugeiconsIcon icon={CloudIcon} className="size-4" aria-hidden="true" />
            {saveText}
          </p>
          <p className="flex items-center gap-1 text-text-muted">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-4" aria-hidden="true" />
            Terjawab: {answeredCount}/{questions.length}
          </p>
        </div>
      </div>

      {/* Desktop header (Stitch desktop) */}
      <header className="mb-space-lg hidden w-full rounded-2xl bg-surface-card px-space-lg py-space-md shadow-sm lg:block">
        <div className="flex flex-wrap items-center justify-between gap-y-3">
          <div className="flex items-center gap-space-md">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-canvas-peach-subtle text-primary-container">
              <HugeiconsIcon icon={Calculator01Icon} className="text-headline-md" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-headline-sm text-headline-sm tracking-tight text-text-primary">{quizTitle}</h1>
              <p aria-live="polite" className={`mt-0.5 flex items-center gap-1.5 font-label-sm text-label-sm ${status.kind === "error" ? "text-tone-danger" : "text-tone-success"}`}>
                <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-tone-success" />
                {saveText}
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-space-md">
            <div role="timer" aria-label="Waktu tersisa" className={`flex items-center gap-space-sm rounded-xl border px-space-md py-2.5 shadow-xs ${warnTone}`}>
              <HugeiconsIcon icon={AlarmClockIcon} className="text-headline-md text-primary-strong" aria-hidden="true" />
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-text-muted">Sisa Waktu</span>
                <span className="font-headline-sm text-headline-sm tabular-nums text-text-primary">{clock(left)}</span>
              </div>
            </div>
            <Button className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl! bg-primary-strong! px-space-lg font-label-lg text-label-lg text-on-primary shadow-sm" disabled={submitting} onClick={openConfirm}>
              <HugeiconsIcon icon={CheckmarkCircle02Icon} className="text-headline-sm" aria-hidden="true" />
              Kumpulkan jawaban
            </Button>
          </div>
        </div>
      </header>

      <div aria-live="polite" className="empty:hidden">
        {warning ? (
          <p className="mx-0 mt-space-sm flex items-center gap-2 rounded-xl bg-tone-warning-bg p-space-sm font-label-md text-label-md font-semibold text-text-primary lg:mt-0 lg:mb-space-lg">
            <HugeiconsIcon icon={Alert02Icon} aria-hidden="true" />
            {warning}
          </p>
        ) : null}
      </div>

      {/* Phone number strip (Stitch mobile) */}
      <nav aria-label="Daftar soal" className="no-scrollbar -mx-4 overflow-x-auto bg-surface-container-low px-gutter-mobile py-space-sm shadow-sm lg:hidden">
        <ul className="flex min-w-max items-center gap-2">
          {questions.map((x, i) => {
            const done = isAnswered(x, answers[x.id]);
            const flagged = flags.has(x.id);
            const current = i === index;
            return (
              <li key={x.id}>
                <button
                  type="button"
                  className={`relative flex h-11 w-11 items-center justify-center rounded-full font-label-md text-label-md shadow-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring ${
                    current ? "scale-105 bg-primary-container text-on-primary shadow-md" : done ? "bg-tone-success text-on-primary" : "bg-surface-card text-text-muted"
                  }`}
                  aria-current={current ? "step" : undefined}
                  aria-label={`Soal ${x.number}, ${done ? "sudah" : "belum"} dijawab${flagged ? ", ditandai ragu" : ""}`}
                  onClick={() => go(i)}
                >
                  {x.number}
                  {done && current ? <HugeiconsIcon icon={Tick02Icon} className="absolute bottom-0.5 size-3" aria-hidden="true" /> : null}
                  {flagged ? <HugeiconsIcon icon={Flag02Icon} className="absolute -top-1 -right-1 size-5 rounded-full bg-surface-card text-tone-warning" aria-hidden="true" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="grid w-full grid-cols-[minmax(0,1fr)] gap-space-lg pt-space-md lg:grid-cols-12 lg:pt-0">
        <section className="flex min-w-0 flex-col gap-space-lg lg:col-span-8">
          <fieldset key={q.id} className="flex w-full min-w-0 flex-col rounded-2xl bg-surface-card p-space-md shadow-sm sm:p-space-xl">
            <legend className="sr-only">Soal {q.number}</legend>
            <div className="mb-space-md flex items-center justify-between gap-2 border-b border-border-subtle pb-space-md">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary-strong px-3 py-1 font-label-md text-label-md text-on-primary">Nomor {q.number}</span>
                <span className="font-label-md text-label-md text-text-muted">dari {questions.length} Soal</span>
              </div>
              <span className="rounded-full bg-canvas-peach px-3 py-1 font-label-sm text-label-sm font-semibold text-primary-strong">{TYPE_LABEL[q.type]}</span>
            </div>
            <div className="mb-space-lg font-body-xl text-body-xl leading-relaxed text-text-primary">{q.prompt}</div>
            <div className="flex w-full flex-col gap-space-md">
              {q.type === "SINGLE_CHOICE" &&
                q.options?.map((o, i) => {
                  const checked = !!a && "optionId" in a && a.optionId === o.id;
                  return (
                    <Choice
                      key={o.id}
                      letter={letter(i)}
                      checked={checked}
                      input={<input type="radio" name={`q-${q.id}`} className={HIT} checked={checked} onChange={() => choose(q.id, { optionId: o.id })} />}
                    >
                      {o.node}
                    </Choice>
                  );
                })}
              {q.type === "MULTIPLE_SELECT" &&
                q.options?.map((o, i) => {
                  const checked = selected.includes(o.id);
                  return (
                    <Choice
                      key={o.id}
                      letter={letter(i)}
                      checked={checked}
                      input={
                        <input
                          type="checkbox"
                          className={HIT}
                          checked={checked}
                          onChange={(e) => {
                            const ids = e.target.checked ? [...selected, o.id] : selected.filter((id) => id !== o.id);
                            choose(q.id, ids.length ? { optionIds: ids } : null);
                          }}
                        />
                      }
                    >
                      {o.node}
                    </Choice>
                  );
                })}
              {q.type === "TRUE_FALSE" &&
                [true, false].map((v, i) => {
                  const checked = !!a && "value" in a && a.value === v;
                  return (
                    <Choice
                      key={String(v)}
                      letter={letter(i)}
                      checked={checked}
                      input={<input type="radio" name={`q-${q.id}`} className={HIT} checked={checked} onChange={() => choose(q.id, { value: v })} />}
                    >
                      {v ? "Benar" : "Salah"}
                    </Choice>
                  );
                })}
              {q.type === "CATEGORY" &&
                q.options?.map((o, i) => {
                  const values = a && "values" in a ? a.values : {};
                  const labels = q.labels ?? ["Benar", "Salah"];
                  return (
                    <div
                      key={o.id}
                      role="radiogroup"
                      aria-labelledby={`st-${q.id}-${o.id}`}
                      className="flex flex-col gap-space-sm rounded-2xl border border-border-subtle bg-surface-card p-space-md shadow-xs sm:flex-row sm:items-center"
                    >
                      <div id={`st-${q.id}-${o.id}`} className="flex min-w-0 flex-1 gap-2 font-headline-sm text-headline-sm text-text-primary">
                        <span aria-hidden="true" className="shrink-0 font-bold">{i + 1}.</span>
                        <span className="min-w-0">{o.node}</span>
                      </div>
                      <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-64">
                        {([true, false] as const).map((v, j) => {
                          const checked = Object.hasOwn(values, o.id) && values[o.id] === v;
                          return (
                            <label
                              key={String(v)}
                              className={`relative flex min-h-12 cursor-pointer items-center justify-center gap-1 rounded-xl px-3 text-center font-label-md text-label-md has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring ${
                                checked ? "border-2 border-primary-strong bg-canvas-peach font-bold text-primary-strong" : "border border-border-subtle bg-surface-card text-text-primary hover:bg-canvas-peach"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q-${q.id}-${o.id}`}
                                className={HIT}
                                checked={checked}
                                onChange={() => choose(q.id, { values: { ...values, [o.id]: v } })}
                              />
                              {checked ? <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-5 shrink-0" aria-hidden="true" /> : null}
                              {labels[j]}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
            {q.type === "SHORT_ANSWER" && (
              <input
                type="text"
                aria-label={`Jawaban soal ${q.number}`}
                className="h-12 w-full rounded-xl border-2 border-input bg-surface-card px-3 font-body-lg text-body-lg outline-none focus-visible:border-primary-strong focus-visible:ring-[3px] focus-visible:ring-ring"
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
                className="min-h-40 w-full rounded-xl border-2 border-input bg-surface-card px-3 py-2 font-body-lg text-body-lg outline-none focus-visible:border-primary-strong focus-visible:ring-[3px] focus-visible:ring-ring"
                maxLength={5000}
                value={a && "text" in a ? a.text : ""}
                onChange={(e) => typeText(q.id, e.target.value)}
                onBlur={() => commitPending()}
              />
            )}
            <label className="mt-space-md flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl bg-tone-warning-bg p-3 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring">
              <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-card text-tone-warning">
                <HugeiconsIcon icon={Flag02Icon} />
              </span>
              <span className="min-w-0 flex-1 font-label-md text-label-md text-text-primary">
                Ragu-ragu dengan nomor ini?
                <span className="block font-label-sm text-label-sm text-text-muted">Tandai untuk diperiksa lagi nanti</span>
              </span>
              <input type="checkbox" className="size-6 shrink-0" checked={flags.has(q.id)} onChange={() => flip(q.id)} />
            </label>

            {/* Phone: fixed bar; desktop: action row in the card */}
            <div className="fixed inset-x-0 bottom-0 z-40 flex flex-wrap items-center justify-between gap-2 bg-surface/95 px-gutter-mobile py-space-sm shadow-lg backdrop-blur-xl lg:static lg:mt-space-2xl lg:flex-row lg:border-t lg:border-border-subtle lg:bg-transparent lg:p-0 lg:pt-space-lg lg:shadow-none lg:backdrop-blur-none">
              <Button className="order-first min-h-12 basis-full rounded-xl! bg-primary-strong! font-label-lg text-label-lg text-on-primary lg:hidden" disabled={submitting} onClick={openConfirm}>
                Kumpulkan jawaban
              </Button>
              <button
                type="button"
                disabled={index === 0}
                onClick={() => go(index - 1)}
                className="flex min-h-12 shrink-0 items-center justify-center gap-1 rounded-xl bg-surface-container px-3.5 font-label-md text-label-md text-text-primary transition-transform focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none active:scale-95 disabled:opacity-50 lg:gap-2 lg:bg-canvas-peach lg:px-space-lg lg:font-label-lg lg:text-label-lg"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-5" aria-hidden="true" />
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={askHelp}
                aria-disabled={helpBusy || undefined}
                className="flex min-h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-tone-info-bg px-3 font-label-md text-label-md text-tone-info transition-transform focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none active:scale-95"
              >
                <HugeiconsIcon icon={InformationCircleIcon} className="size-5" aria-hidden="true" />
                Bantuan Guru / Kendala
              </button>
              <p role="status" className="basis-full font-label-md text-label-md text-tone-info">{helpMsg}</p>
              <button
                type="button"
                disabled={index === questions.length - 1}
                onClick={() => go(index + 1)}
                className="flex min-h-12 shrink-0 items-center justify-center gap-1 rounded-xl bg-primary-container px-4 lg:bg-primary-strong font-label-md text-label-md text-on-primary shadow-md transition-transform focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none active:scale-95 disabled:opacity-50 lg:gap-2 lg:px-space-xl lg:font-label-lg lg:text-label-lg"
              >
                Berikutnya
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-5" aria-hidden="true" />
              </button>
            </div>
          </fieldset>
        </section>

        {/* Desktop navigator (Stitch desktop) */}
        <aside className="hidden flex-col gap-space-md lg:col-span-4 lg:flex">
          <nav aria-label="Daftar nomor soal ujian" className="flex w-full flex-col rounded-2xl bg-surface-card p-space-lg shadow-sm">
            <div className="mb-space-md flex items-center justify-between border-b border-border-subtle pb-space-sm">
              <h2 className="flex items-center gap-2 font-headline-sm text-headline-sm text-text-primary">
                <HugeiconsIcon icon={GridViewIcon} className="text-primary-strong" aria-hidden="true" />
                Navigasi Soal
              </h2>
              <span className="font-label-sm text-label-sm text-text-muted">Total: {questions.length} Butir</span>
            </div>
            <div className="mb-space-md grid grid-cols-3 gap-2 rounded-xl bg-canvas-peach p-2.5 text-center">
              <div className="flex flex-col items-center">
                <span aria-hidden="true" className="mb-1 h-3.5 w-3.5 rounded-full bg-tone-success" />
                <span className="font-label-sm text-label-sm text-text-primary">{answeredCount} Terjawab</span>
              </div>
              <div className="flex flex-col items-center">
                <span aria-hidden="true" className="mb-1 h-3.5 w-3.5 rounded-full bg-primary-strong" />
                <span className="font-label-sm text-label-sm text-text-primary">1 Aktif</span>
              </div>
              <div className="flex flex-col items-center">
                <span aria-hidden="true" className="mb-1 h-3.5 w-3.5 rounded-full border border-border-subtle bg-surface-container" />
                <span className="font-label-sm text-label-sm text-text-primary">{unanswered} Belum</span>
              </div>
            </div>
            <ul className="grid grid-cols-5 gap-2.5">
              {questions.map((x, i) => {
                const done = isAnswered(x, answers[x.id]);
                const flagged = flags.has(x.id);
                const current = i === index;
                return (
                  <li key={x.id}>
                    <button
                      type="button"
                      className={`relative flex aspect-square w-full flex-col items-center justify-center rounded-xl font-headline-sm text-headline-sm transition-transform outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95 ${
                        current
                          ? "border-2 border-primary-strong bg-canvas-peach text-primary-strong shadow-xs"
                          : done
                            ? "bg-tone-success text-on-primary hover:opacity-90"
                            : "border border-border-subtle bg-canvas-peach text-text-primary hover:bg-canvas-peach-subtle"
                      }`}
                      aria-current={current ? "step" : undefined}
                      aria-label={`Soal ${x.number}, ${done ? "sudah" : "belum"} dijawab${flagged ? ", ditandai ragu" : ""}`}
                      onClick={() => go(i)}
                    >
                      <span>{x.number}</span>
                      {done ? <HugeiconsIcon icon={Tick02Icon} className="-mt-1 size-4" aria-hidden="true" /> : null}
                      {current && !done ? <span aria-hidden="true" className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary-strong" /> : null}
                      {flagged ? <HugeiconsIcon icon={Flag02Icon} className="absolute -top-1 -right-1 size-5 rounded-full bg-surface-card text-tone-warning" aria-hidden="true" /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="flex w-full items-center gap-space-md rounded-2xl bg-surface-card p-space-md shadow-sm">
            <div aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-canvas-peach text-primary-strong">
              <HugeiconsIcon icon={UserIcon} className="size-7" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="font-label-sm text-label-sm text-text-muted">Peserta Ujian:</span>
              <span className="truncate font-headline-sm text-headline-sm text-text-primary">{participant.name}</span>
              {participant.nis && <span className="font-body-md text-body-md text-text-muted">NIS: {participant.nis}</span>}
            </div>
          </div>
        </aside>
      </div>
      <p role="alert" className="font-label-md text-label-md text-tone-danger">
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
