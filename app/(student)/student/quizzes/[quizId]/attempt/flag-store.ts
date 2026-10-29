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

export function toggleFlag(
  storage: FlagStorage | null,
  attemptId: string,
  questionId: string,
): Set<string> {
  const flags = readFlags(storage, attemptId);
  if (flags.has(questionId)) flags.delete(questionId);
  else flags.add(questionId);
  try {
    storage?.setItem(key(attemptId), JSON.stringify([...flags]));
  } catch {
    // Storage full or blocked: the in-memory result still reflects the toggle.
  }
  return flags;
}
