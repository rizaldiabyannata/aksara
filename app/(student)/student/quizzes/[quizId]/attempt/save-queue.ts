// Pure autosave queue (D11): one request per question at a time, the latest value replaces anything waiting.
export type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: Date }
  | { kind: "error" }
  | { kind: "closed"; error: "DEADLINE_PASSED" | "ATTEMPT_CLOSED" };

const BACKOFF_MS = [1000, 2000, 4000, 8000, 10000];
const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function createSaveQueue(opts: {
  send: (qqId: string, answer: unknown) => Promise<Response>;
  onStatus: (s: SaveStatus) => void;
  sleep?: (ms: number) => Promise<void>;
}) {
  const sleep = opts.sleep ?? realSleep;
  const waiting = new Map<string, unknown>(); // latest unsent value per question
  const running = new Map<string, Promise<void>>();
  let closed = false;
  let rejected = false; // server refused an answer (400/403); stays until a later save succeeds
  let wake: (() => void) | null = null; // set while a retry is sleeping

  const finish = () => {
    if (!closed && running.size === 0) opts.onStatus(rejected ? { kind: "error" } : { kind: "saved", at: new Date() });
  };

  async function drain(qqId: string) {
    let failures = 0;
    while (!closed && waiting.has(qqId)) {
      const answer = waiting.get(qqId);
      waiting.delete(qqId);
      opts.onStatus({ kind: "saving" });
      let status = 0;
      let code: unknown;
      try {
        const r = await opts.send(qqId, answer);
        status = r.status;
        if (status === 409) code = (await r.json().catch(() => null))?.error;
      } catch {
        status = 0;
      }
      if (status >= 200 && status < 300) {
        failures = 0;
        rejected = false;
        continue;
      }
      if (status === 409 || status === 404) {
        closed = true;
        waiting.clear();
        opts.onStatus({ kind: "closed", error: code === "DEADLINE_PASSED" ? "DEADLINE_PASSED" : "ATTEMPT_CLOSED" });
        return;
      }
      if (status === 400 || status === 403) {
        rejected = true;
        opts.onStatus({ kind: "error" }); // retrying the same payload cannot help
        continue;
      }
      // Network failure or 5xx: keep this value unless a newer one arrived meanwhile.
      if (!waiting.has(qqId)) waiting.set(qqId, answer);
      opts.onStatus({ kind: "error" });
      await Promise.race([
        sleep(BACKOFF_MS[Math.min(failures++, BACKOFF_MS.length - 1)]),
        new Promise<void>((r) => (wake = r)),
      ]);
      wake = null;
    }
  }

  function start(qqId: string) {
    if (running.has(qqId)) return;
    const p = drain(qqId).finally(() => {
      running.delete(qqId);
      finish();
    });
    running.set(qqId, p);
  }

  return {
    set(qqId: string, answer: unknown) {
      if (closed) return;
      waiting.set(qqId, answer);
      start(qqId);
    },
    async flush() {
      while (running.size > 0) await Promise.all(running.values());
    },
    /** Skip the current backoff wait (e.g. the browser came back online). */
    retryNow: () => wake?.(),
    pending: () => !closed && (running.size > 0 || waiting.size > 0),
  };
}

/** Time left by the server's clock: the client's own clock only measures elapsed time since `receivedAt`. */
export function remainingMs(deadlineAt: string, serverNow: string, receivedAt: number, now: number): number {
  const serverEstimate = Date.parse(serverNow) + (now - receivedAt);
  return Math.max(0, Date.parse(deadlineAt) - serverEstimate);
}
