// Ragu-ragu flags live only in this browser. They are never sent to the server.
export type FlagStorage = Pick<Storage, "getItem" | "setItem">;

const key = (attemptId: string) => `aksara:flags:${attemptId}`;

export function readFlags(storage: FlagStorage | null, attemptId: string): Set<string> {
  try {
    const raw = storage?.getItem(key(attemptId));
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every((v) => typeof v === "string")) return new Set();
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

export function writeFlags(storage: FlagStorage | null, attemptId: string, flags: Set<string>): void {
  try {
    storage?.setItem(key(attemptId), JSON.stringify([...flags]));
  } catch {
    // Storage full or blocked: the on-screen flags still work for this page load.
  }
}
