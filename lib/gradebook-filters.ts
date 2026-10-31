import { parseWitaInput } from "@/lib/format";
import type { QuizKind } from "@/lib/generated/prisma/enums";

export type GradeFilters = {
  classIds?: string[]; subjectIds?: string[]; quizIds?: string[];
  kind?: QuizKind; from?: string; to?: string; q?: string; includeHistory?: boolean;
};
export class GradebookError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export const MAX_GRADE_QUIZZES = 100;
export const MAX_GRADE_ROWS = 100_000;

export function parseGradeFilters(params: URLSearchParams): GradeFilters {
  const ids = (key: string) => {
    const values = [...new Set(params.getAll(key).filter(Boolean))];
    if (values.length > 100 || values.some((s) => s.length > 100)) throw new GradebookError("Terlalu banyak pilihan filter. Persempit pilihan.");
    return values;
  };
  const from = params.get("from") || undefined, to = params.get("to") || undefined;
  for (const s of [from, to]) if (s && !parseWitaInput(`${s}T00:00`)) throw new GradebookError("Tanggal filter tidak valid.");
  if (from && to && from > to) throw new GradebookError("Tanggal awal harus sebelum atau sama dengan tanggal akhir.");
  const rawKind = params.get("kind");
  if (rawKind && rawKind !== "REGULAR" && rawKind !== "TRYOUT_TKA") throw new GradebookError("Jenis ulangan tidak valid.");
  const kind = rawKind === "REGULAR" || rawKind === "TRYOUT_TKA" ? rawKind : undefined;
  const q = (params.get("q") || "").trim();
  if (q.length > 200) throw new GradebookError("Pencarian maksimal 200 karakter.");
  const history = params.get("includeHistory");
  if (history && history !== "1" && history !== "0") throw new GradebookError("Filter riwayat tidak valid.");
  return { classIds: ids("classId"), subjectIds: ids("subjectId"), quizIds: ids("quizId"), kind, from, to, q, includeHistory: history === "1" };
}

export function gradeFilterParams(f: GradeFilters): URLSearchParams {
  const p = new URLSearchParams();
  for (const [key, values] of [["classId", f.classIds], ["subjectId", f.subjectIds], ["quizId", f.quizIds]] as const)
    for (const value of values ?? []) p.append(key, value);
  for (const key of ["kind", "from", "to", "q"] as const) if (f[key]) p.set(key, f[key]);
  if (f.includeHistory) p.set("includeHistory", "1");
  return p;
}

export function checkGradeRows(count: number) {
  if (count > MAX_GRADE_ROWS) throw new GradebookError("Ekspor melebihi 100.000 baris. Persempit kelas, tanggal, atau pilihan ulangan; tidak ada data yang dipotong.", 422);
}
