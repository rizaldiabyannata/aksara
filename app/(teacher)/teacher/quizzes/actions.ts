"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth/guard";
import { field, type FormState } from "@/lib/form-state";
import {
  addQuizQuestion, createQuiz, moveQuizQuestion, publishQuiz, removeQuizQuestion,
  setQuizClasses, setQuizQuestionPoints, unpublishQuiz, updateQuiz,
} from "@/lib/quizzes";

const UNEXPECTED = "Ada masalah. Coba lagi sebentar lagi.";
const NOT_FOUND = "Ulangan tidak ditemukan. Muat ulang halaman.";
const HAS_ATTEMPTS = "Ulangan ini sudah dikerjakan siswa, jadi tidak bisa dikembalikan ke draf.";

type Result =
  | { ok: true; id?: string }
  | { ok: false; error: "INVALID"; fieldErrors: Record<string, string> }
  | { ok: false; error: "INVALID_PUBLISH"; reasons: string[] }
  | { ok: false; error: "NOT_FOUND" | "HAS_ATTEMPTS" };

/** Only the domain call is inside try. `flat`: no form to show field errors on, so they become one message. */
async function run(
  call: () => Promise<Result>,
  success: string,
  opts: { values?: Record<string, string>; flat?: boolean } = {},
): Promise<FormState> {
  const { values, flat } = opts;
  let r: Result;
  try {
    r = await call();
  } catch {
    return { message: UNEXPECTED, values };
  }
  if (!r.ok) {
    if (r.error === "INVALID") {
      return flat
        ? { message: Object.values(r.fieldErrors).join(" "), values }
        : { fieldErrors: r.fieldErrors, values };
    }
    if (r.error === "INVALID_PUBLISH") return { message: r.reasons.join(" ") };
    return { message: r.error === "HAS_ATTEMPTS" ? HAS_ATTEMPTS : NOT_FOUND, values };
  }
  revalidatePath("/teacher/quizzes", "layout");
  return { message: success, ok: true };
}

// Defaults only for fields the form did not send at all (the /new form sends title + subject).
const DEFAULTS: Record<string, string> = { durationMinutes: "30", maxAttempts: "1", scoringPolicy: "HIGHEST" };
const TEXT = [
  "title", "instructions", "durationMinutes", "startsAt", "endsAt", "maxAttempts", "scoringPolicy", "kkm",
] as const;
const CHECKS = ["shuffleQuestions", "shuffleOptions", "showFeedbackAfterRelease"] as const;

// Raw strings go to the domain, which coerces and rejects. Checkboxes are always "on" or "".
function fromForm(fd: FormData, withSubject: boolean) {
  const values: Record<string, string> = {};
  if (withSubject) values.subjectId = field(fd, "subjectId");
  for (const n of TEXT) values[n] = fd.has(n) ? field(fd, n) : (DEFAULTS[n] ?? "");
  for (const n of CHECKS) values[n] = fd.get(n) === "on" ? "on" : "";
  return values;
}

export async function createQuizAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireTeacher();
  const values = fromForm(fd, true);
  let id: string | undefined;
  const state = await run(
    async () => {
      const r = await createQuiz(user.id, values);
      if (r.ok) id = r.id;
      return r;
    },
    "Ulangan dibuat.",
    { values },
  );
  if (id) redirect(`/teacher/quizzes/${id}`);
  return state;
}

export async function updateQuizAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireTeacher();
  const values = fromForm(fd, false);
  return run(() => updateQuiz(user.id, id, values), "Ulangan disimpan.", { values });
}

export async function setQuizClassesAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireTeacher();
  const classIds = fd.getAll("classId").filter((x): x is string => typeof x === "string");
  return run(() => setQuizClasses(id, classIds), "Kelas disimpan.", { flat: true });
}

export async function addQuizQuestionAction(id: string, questionId: string): Promise<FormState> {
  await requireTeacher();
  return run(() => addQuizQuestion(id, questionId), "Soal ditambahkan.", { flat: true });
}

export async function removeQuizQuestionAction(id: string, quizQuestionId: string): Promise<FormState> {
  await requireTeacher();
  return run(() => removeQuizQuestion(id, quizQuestionId), "Soal dikeluarkan.", { flat: true });
}

// The domain ignores any dir other than "up"/"down", so a forged value changes nothing.
export async function moveQuizQuestionAction(
  id: string,
  quizQuestionId: string,
  dir: "up" | "down",
): Promise<FormState> {
  await requireTeacher();
  return run(() => moveQuizQuestion(id, quizQuestionId, dir), "Urutan diubah.", { flat: true });
}

export async function setQuizQuestionPointsAction(
  id: string,
  quizQuestionId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireTeacher();
  const points = field(fd, "points");
  return run(() => setQuizQuestionPoints(id, quizQuestionId, points), "Poin disimpan.", {
    values: { points },
  });
}

export async function publishQuizAction(id: string): Promise<FormState> {
  const user = await requireTeacher();
  return run(() => publishQuiz(user.id, id), "Ulangan diterbitkan.");
}

export async function unpublishQuizAction(id: string): Promise<FormState> {
  const user = await requireTeacher();
  return run(() => unpublishQuiz(user.id, id), "Ulangan dikembalikan ke draf.");
}
