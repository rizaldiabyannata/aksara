// Runs in the browser (the roster file can be far larger than a request body may be).
// Pure: no server imports. The server re-validates every row in importStudents.

export const IMPORT_MAX = 200;

export type RosterRow = { displayName: string; nis: string; studentNo: string };

/** An ExcelJS cell value as plain text: numbers, rich text, formulas (their result), hyperlinks. */
export function cellText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("result" in o) return cellText(o.result);
    if (Array.isArray(o.richText)) return o.richText.map((t) => cellText((t as { text?: unknown }).text)).join("");
    if ("text" in o) return cellText(o.text);
  }
  return "";
}

const label = (v: unknown) =>
  cellText(v).toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const NAME = new Set(["NAMA", "NAMA SISWA", "NAMA LENGKAP", "NAMA PESERTA DIDIK"]);
const NIS = new Set(["NISN", "NO NISN", "NOMOR NISN", "NIS"]);
const NO = new Set(["NO INDUK", "NOMOR INDUK", "INDUK", "NO INDUK SISWA"]);
const HEADER = new Set([...NAME, ...NIS, ...NO, "NO", "NOMOR", "URUT", "NO URUT"]);

/**
 * Finds the first sheet with a header row naming a NAMA column (within its first 30 rows),
 * plus optional NISN/NIS and NO INDUK columns, and reads names until the first blank after the data.
 * `sheets` is one grid of cell values per worksheet.
 */
export function findRosterRows(
  sheets: unknown[][][],
): { ok: true; rows: RosterRow[] } | { ok: false; error: "NO_HEADER" | "EMPTY" | "TOO_MANY" } {
  for (const grid of sheets) {
    const h = grid.slice(0, 30).findIndex((row) => row.some((c) => NAME.has(label(c))));
    if (h < 0) continue;
    const head = grid[h]!.map(label);
    const col = (set: Set<string>) => head.findIndex((c) => set.has(c));
    const [name, nis, no] = [col(NAME), col(NIS), col(NO)];
    const rows: RosterRow[] = [];
    for (const row of grid.slice(h + 1)) {
      const displayName = cellText(row[name]).trim();
      if (!displayName) {
        if (rows.length) break;
        continue;
      }
      // Second header line (e.g. "URUT | INDUK | NISN | NAMA SISWA" under merged cells).
      if (HEADER.has(label(displayName))) continue;
      const text = (i: number) => (i < 0 ? "" : cellText(row[i]).trim());
      rows.push({ displayName, nis: text(nis), studentNo: text(no) });
    }
    if (!rows.length) return { ok: false, error: "EMPTY" };
    if (rows.length > IMPORT_MAX) return { ok: false, error: "TOO_MANY" };
    return { ok: true, rows };
  }
  return { ok: false, error: "NO_HEADER" };
}
