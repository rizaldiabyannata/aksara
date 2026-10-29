const wita = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Makassar",
  dateStyle: "medium",
  timeStyle: "short",
});

export const formatWita = (d: Date): string => wita.format(d);

const WITA_INPUT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** Parses a `datetime-local` value read as WITA (UTC+8). Null if malformed or rolled over (e.g. 02-30). */
export function parseWitaInput(s: string): Date | null {
  const m = WITA_INPUT.exec(s);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 8, +m[5]));
  return toWitaInput(d) === s ? d : null;
}

export function toWitaInput(d: Date): string {
  return new Date(d.getTime() + 8 * 3600_000).toISOString().slice(0, 16);
}

/** Scores always show 2 decimals, Indonesian style: 66,67. */
export const formatScore = (n: number): string =>
  n.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
