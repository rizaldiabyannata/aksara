import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSaveQueue, remainingMs, type SaveStatus } from "./save-queue";

const res = (status: number, body: unknown = {}) => Response.json(body, { status });
const deferred = () => {
  let resolve!: (r: Response) => void;
  const promise = new Promise<Response>((r) => (resolve = r));
  return { promise, resolve };
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("createSaveQueue", () => {
  it("coalesces rapid sets for one question: exactly 2 sends, the second carries the last value", async () => {
    const first = deferred();
    const send = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(res(200));
    const q = createSaveQueue({ send, onStatus: () => {} });
    q.set("a", 1);
    q.set("a", 2);
    q.set("a", 3);
    expect(q.pending()).toBe(true);
    first.resolve(res(200));
    await q.flush();
    expect(send.mock.calls).toEqual([["a", 1], ["a", 3]]);
    expect(q.pending()).toBe(false);
  });

  it("retries 500 after 1s, 2s, 4s, 8s, then every 10s", async () => {
    const send = vi.fn().mockResolvedValue(res(500));
    const q = createSaveQueue({ send, onStatus: () => {} });
    q.set("a", 1);
    await vi.advanceTimersByTimeAsync(0);
    expect(send).toHaveBeenCalledTimes(1);
    for (const [wait, calls] of [[1000, 2], [2000, 3], [4000, 4], [8000, 5], [10000, 6], [10000, 7]]) {
      await vi.advanceTimersByTimeAsync(wait - 1);
      expect(send).toHaveBeenCalledTimes(calls - 1);
      await vi.advanceTimersByTimeAsync(1);
      expect(send).toHaveBeenCalledTimes(calls);
    }
    expect(q.pending()).toBe(true);
  });

  it("a newer value replaces the one waiting for retry", async () => {
    const send = vi.fn().mockResolvedValueOnce(res(500)).mockResolvedValue(res(200));
    const q = createSaveQueue({ send, onStatus: () => {} });
    q.set("a", 1);
    await vi.advanceTimersByTimeAsync(0);
    q.set("a", 2);
    await vi.advanceTimersByTimeAsync(1000);
    expect(send.mock.calls).toEqual([["a", 1], ["a", 2]]);
  });

  it("409 DEADLINE_PASSED closes without retry", async () => {
    const send = vi.fn().mockResolvedValue(res(409, { ok: false, error: "DEADLINE_PASSED" }));
    const seen: SaveStatus[] = [];
    const q = createSaveQueue({ send, onStatus: (s) => seen.push(s) });
    q.set("a", 1);
    await q.flush();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(send).toHaveBeenCalledTimes(1);
    expect(seen.at(-1)).toEqual({ kind: "closed", error: "DEADLINE_PASSED" });
    expect(q.pending()).toBe(false);
  });

  it("a 400 ends in error, never saved, until a later save succeeds", async () => {
    const send = vi.fn().mockResolvedValueOnce(res(400)).mockResolvedValue(res(200));
    const seen: SaveStatus[] = [];
    const q = createSaveQueue({ send, onStatus: (s) => seen.push(s) });
    q.set("a", 1);
    await q.flush();
    expect(seen.map((s) => s.kind)).toEqual(["saving", "error", "error"]);
    expect(send).toHaveBeenCalledTimes(1);
    q.set("a", 2);
    await q.flush();
    expect(seen.at(-1)?.kind).toBe("saved");
  });

  it("reports saving then saved once everything is sent", async () => {
    const seen: SaveStatus[] = [];
    const q = createSaveQueue({ send: async () => res(200), onStatus: (s) => seen.push(s) });
    q.set("a", 1);
    await q.flush();
    expect(seen.map((s) => s.kind)).toEqual(["saving", "saved"]);
  });
});

describe("remainingMs", () => {
  const deadline = "2026-01-01T10:30:00.000Z";
  const serverNow = "2026-01-01T10:00:00.000Z";
  it("is independent of the client clock (+2 hours)", () => {
    const correct = remainingMs(deadline, serverNow, 1_000_000, 1_000_000 + 60_000);
    const skewed = remainingMs(deadline, serverNow, 1_000_000 + 7_200_000, 1_000_000 + 7_200_000 + 60_000);
    expect(correct).toBe(29 * 60_000);
    expect(skewed).toBe(correct);
  });
  it("never goes negative", () => {
    expect(remainingMs(deadline, serverNow, 0, 10 * 3_600_000)).toBe(0);
  });
});
