const WITA_MS = 8 * 3600_000;

/** Tahun ajaran and semester from the WITA calendar date: Jul–Dec = Ganjil, Jan–Jun = Genap. */
export function schoolTerm(now: Date): { year: string; semester: "Ganjil" | "Genap"; label: string } {
  const d = new Date(now.getTime() + WITA_MS);
  const y = d.getUTCFullYear();
  const ganjil = d.getUTCMonth() >= 6;
  const start = ganjil ? y : y - 1;
  const year = `${start}/${start + 1}`;
  const semester = ganjil ? "Ganjil" : "Genap";
  return { year, semester, label: `T.A ${year} · Semester ${semester}` };
}
