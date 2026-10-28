"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth/guard";
import { field, type FormState } from "@/lib/form-state";
import type { QuestionStatus, QuestionType } from "@/lib/generated/prisma/enums";
import {
  createQuestion,
  deleteQuestion,
  duplicateQuestion,
  setQuestionStatus,
  updateQuestion,
} from "@/lib/questions";

const UNEXPECTED = "Ada masalah. Coba lagi sebentar lagi.";
const ERRORS = {
  NOT_DRAFT: "Jadikan soal draft dulu sebelum menghapusnya.",
  IN_USE: "Soal ini dipakai di ulangan. Keluarkan dari ulangan draf dulu.",
  NOT_FOUND: "Soal tidak ditemukan. Muat ulang halaman.",
};

type Result =
  | { ok: true; id?: string }
  | { ok: false; error: "INVALID"; fieldErrors: Record<string, string> }
  | { ok: false; error: keyof typeof ERRORS };

// Only the domain call is inside try; the guard, revalidate and redirect stay outside.
async function run(
  call: () => Promise<Result>,
  success: string,
  values?: Record<string, string>,
): Promise<FormState> {
  let result: Result;
  try {
    result = await call();
  } catch {
    return { message: UNEXPECTED, values };
  }
  if (!result.ok) {
    return result.error === "INVALID"
      ? { fieldErrors: result.fieldErrors, values }
      : { message: ERRORS[result.error], values };
  }
  revalidatePath("/teacher/questions", "layout");
  return { message: success, ok: true };
}

const NAMES = [
  "chapterId", "subchapterId", "prompt", "explanation", "defaultPoints",
  "difficulty", "sourceReference", "verificationNote", "accepted", "rubric",
] as const;
const SLOTS = "abcdefgh";
const slotCount = (type: QuestionType) =>
  type === "SINGLE_CHOICE" ? 6 : type === "MULTIPLE_SELECT" ? 8 : 0;

// Input for the domain plus the string echo for the form. defaultPoints stays a raw string: the domain coerces and rejects.
function fromForm(fd: FormData, type: QuestionType) {
  const values: Record<string, string> = Object.fromEntries(NAMES.map((n) => [n, field(fd, n)]));
  const slots = [...SLOTS].slice(0, slotCount(type));
  for (const id of slots) values[`option_${id}`] = field(fd, `option_${id}`);
  const correct = fd.getAll("correct").filter((x) => typeof x === "string");
  values.correct = correct.join(",");
  values.caseSensitive = fd.get("caseSensitive") === "on" ? "on" : "";

  const options = slots
    .map((id) => ({ id, text: values[`option_${id}`].trim() }))
    .filter((o) => o.text);
  const answerKey =
    type === "SINGLE_CHOICE" ? { optionId: correct[0] ?? "" }
    : type === "TRUE_FALSE" ? { value: correct[0] === "true" ? true : correct[0] === "false" ? false : undefined }
    : type === "MULTIPLE_SELECT" ? { optionIds: correct }
    : type === "SHORT_ANSWER" ? {
        accepted: values.accepted.split("\n").map((l) => l.trim()).filter(Boolean),
        caseSensitive: values.caseSensitive === "on",
      }
    : { rubric: values.rubric.trim() || undefined };

  const input = {
    chapterId: values.chapterId,
    subchapterId: values.subchapterId || undefined,
    type,
    prompt: values.prompt,
    options: slots.length ? options : null,
    answerKey,
    explanation: values.explanation || undefined,
    defaultPoints: values.defaultPoints,
    difficulty: values.difficulty,
    sourceReference: values.sourceReference || undefined,
    verificationNote: values.verificationNote || undefined,
  };
  return { input, values };
}

export async function createQuestionAction(
  type: QuestionType,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireTeacher();
  const { input, values } = fromForm(formData, type);
  let id: string | undefined;
  const state = await run(
    async () => {
      const r = await createQuestion(user.id, input);
      if (r.ok) id = r.id;
      return r;
    },
    "Soal disimpan.",
    values,
  );
  if (id) redirect(`/teacher/questions/${id}`);
  return state;
}

export async function updateQuestionAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireTeacher();
  // The type is fixed after creation (D7); the domain rejects a changed type with "Tipe soal tidak bisa diubah."
  const type = field(formData, "type") as QuestionType;
  const { input, values } = fromForm(formData, type);
  return run(() => updateQuestion(user.id, id, input), "Soal disimpan.", values);
}

export async function setQuestionStatusAction(id: string, to: QuestionStatus): Promise<FormState> {
  const user = await requireTeacher();
  return run(() => setQuestionStatus(user.id, id, to), "Status soal diubah.");
}

export async function duplicateQuestionAction(id: string): Promise<FormState> {
  const user = await requireTeacher();
  let newId: string | undefined;
  const state = await run(
    async () => {
      const r = await duplicateQuestion(user.id, id);
      if (r.ok) newId = r.id;
      return r;
    },
    "Soal diduplikat.",
  );
  if (newId) redirect(`/teacher/questions/${newId}`);
  return state;
}

export async function deleteQuestionAction(id: string): Promise<FormState> {
  const user = await requireTeacher();
  const state = await run(() => deleteQuestion(user.id, id), "Soal dihapus.");
  if (state?.ok) redirect("/teacher/questions");
  return state;
}
