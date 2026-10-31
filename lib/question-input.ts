import { z } from "zod";
import { required, optional } from "@/lib/validation";
import { normalizeShortAnswer } from "@/lib/grading";
import type { Option } from "@/lib/questions";

const base = {
  chapterId: required(100, "Pilih bab dulu."),
  subchapterId: optional(100, "Subbab tidak valid."),
  prompt: required(5000, "Teks soal wajib diisi, paling banyak 5.000 huruf."),
  explanation: optional(5000, "Paling banyak 5.000 huruf."),
  defaultPoints: z.coerce
    .number({ error: "Poin harus bilangan bulat 1 sampai 100." })
    .int({ error: "Poin harus bilangan bulat 1 sampai 100." })
    .min(1, { error: "Poin harus bilangan bulat 1 sampai 100." })
    .max(100, { error: "Poin harus bilangan bulat 1 sampai 100." }),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"], { error: "Pilih tingkat kesulitan." }),
  cognitiveLevel: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.enum(["PEMAHAMAN", "APLIKASI", "PENALARAN"], { error: "Level kognitif tidak valid." }).nullable(),
  ),
  sourceReference: optional(200, "Sumber paling banyak 200 huruf."),
  verificationNote: optional(5000, "Paling banyak 5.000 huruf."),
};

const optionSchema = z.object({
  id: z.string().regex(/^[a-h]$/, { error: "Opsi tidak valid." }),
  text: required(1000, "Teks opsi paling banyak 1.000 huruf."),
});
const optionsOf = (min: number, max: number) =>
  z.array(optionSchema, { error: `Isi ${min} sampai ${max} opsi.` });

// Issues go on top-level paths (D14): the form shows them per block.
type Ctx = z.RefinementCtx;
const bad = (ctx: Ctx, path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });

function checkOptions(o: Option[], min: number, max: number, ctx: Ctx) {
  if (o.length < min || o.length > max) return bad(ctx, "options", `Isi ${min} sampai ${max} opsi.`);
  if (new Set(o.map((x) => x.id)).size !== o.length) return bad(ctx, "options", "Opsi tidak valid.");
  if (new Set(o.map((x) => x.text)).size !== o.length) bad(ctx, "options", "Teks opsi tidak boleh sama.");
}

const SHORT_MSG = "Isi 1 sampai 10 jawaban yang diterima, satu per baris.";
const CATEGORY_MSG = "Pilih jawaban benar untuk setiap pernyataan.";
const LABEL_MSG = "Isi dua nama pilihan jawaban, paling banyak 30 huruf.";
export const questionSchema = z.discriminatedUnion(
  "type",
  [
    z
      .object({
        ...base,
        type: z.literal("SINGLE_CHOICE"),
        options: optionsOf(2, 6),
        answerKey: z.object({ optionId: z.string() }, { error: "Pilih satu jawaban benar dari opsi yang terisi." }),
      })
      .superRefine((d, ctx) => {
        checkOptions(d.options, 2, 6, ctx);
        if (!d.options.some((o) => o.id === d.answerKey.optionId)) {
          bad(ctx, "answerKey", "Pilih satu jawaban benar dari opsi yang terisi.");
        }
      }),
    z.object({
      ...base,
      type: z.literal("TRUE_FALSE"),
      answerKey: z.object({ value: z.boolean({ error: "Pilih Benar atau Salah." }) }, { error: "Pilih Benar atau Salah." }),
    }),
    z
      .object({
        ...base,
        type: z.literal("MULTIPLE_SELECT"),
        options: optionsOf(3, 8),
        answerKey: z.object(
          {
            optionIds: z
              .array(z.string(), { error: "Tandai minimal satu jawaban benar, tetapi jangan semuanya." })
              .max(8, { error: "Tandai minimal satu jawaban benar, tetapi jangan semuanya." })
              .transform((ids) => [...new Set(ids)]),
          },
          { error: "Tandai minimal satu jawaban benar, tetapi jangan semuanya." },
        ),
      })
      .superRefine((d, ctx) => {
        checkOptions(d.options, 3, 8, ctx);
        const ids = new Set(d.options.map((o) => o.id));
        const keys = new Set(d.answerKey.optionIds);
        if (keys.size < 1 || keys.size >= ids.size || [...keys].some((k) => !ids.has(k))) {
          bad(ctx, "answerKey", "Tandai minimal satu jawaban benar, tetapi jangan semuanya.");
        }
      }),
    z
      .object({
        ...base,
        type: z.literal("SHORT_ANSWER"),
        answerKey: z.object(
          {
            accepted: z.array(z.string({ error: SHORT_MSG }).trim().max(200, { error: "Setiap jawaban paling banyak 200 huruf." }), {
              error: SHORT_MSG,
            }),
            caseSensitive: z.boolean().default(false),
          },
          { error: SHORT_MSG },
        ),
      })
      .superRefine((d, ctx) => {
        const { accepted, caseSensitive } = d.answerKey;
        const norm = accepted.map((a) => normalizeShortAnswer(a, caseSensitive));
        if (accepted.length < 1 || accepted.length > 10 || norm.some((n) => !n)) return bad(ctx, "answerKey", SHORT_MSG);
        if (new Set(norm).size !== norm.length) bad(ctx, "answerKey", "Ada jawaban diterima yang sama.");
      }),
    z
      .object({
        ...base,
        type: z.literal("CATEGORY"),
        options: optionsOf(2, 6),
        answerKey: z.object({ values: z.record(z.string(), z.boolean()) }, { error: CATEGORY_MSG }),
        categoryLabels: z
          .tuple([required(30, LABEL_MSG), required(30, LABEL_MSG)], { error: LABEL_MSG })
          .default(["Benar", "Salah"]),
      })
      .superRefine((d, ctx) => {
        checkOptions(d.options, 2, 6, ctx);
        const ids = d.options.map((o) => o.id);
        const keys = Object.keys(d.answerKey.values);
        if (keys.length !== ids.length || !ids.every((id) => Object.hasOwn(d.answerKey.values, id))) {
          bad(ctx, "answerKey", CATEGORY_MSG);
        }
        if (d.categoryLabels[0] === d.categoryLabels[1]) bad(ctx, "categoryLabels", "Dua pilihan jawaban tidak boleh sama.");
      }),
    z.object({
      ...base,
      type: z.literal("ESSAY"),
      answerKey: z.object({ rubric: optional(5000, "Paling banyak 5.000 huruf.") }).prefault({}),
    }),
  ],
  { error: "Pilih tipe soal." },
);
export type QuestionInput = z.infer<typeof questionSchema>;
