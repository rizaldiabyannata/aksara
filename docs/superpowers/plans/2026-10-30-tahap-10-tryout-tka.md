# Tahap 10 — Tryout TKA SD

## Context
The teacher wants grade 6 students to practice for the TKA SD (Tes Kemampuan Akademik). The tryout has to match the TKA kisi-kisi and question formats, and the teacher needs the scores plus an evaluation of where students are weak.

**Research findings**
- Mapel: Matematika and Bahasa Indonesia, based on Perkaban BSKAP 047/H/AN/2025.
- Bentuk soal: PG, PGK MCMA, and PGK Kategori. Items are either single (tunggal) or grouped around one stimulus (grup).
- Format: about 30 soal / 75 menit per mapel.
- Reporting: score 0–100 with 2 decimals, plus 4 categories (Istimewa/Baik/Memadai/Kurang). The cut-offs have not been published.
- National average TKA SD 2026: Bahasa Indonesia 60.14, Matematika 43.41.
- Not verified: the official Pusmendik page could not be read (TLS failure, empty when fetched). The "2027" kisi-kisi is only a third-party claim, so it is labeled "perlu dicek ke Pusmendik".

The existing quiz engine (timer, token, autosave, release, export) is reused. Missing pieces: the PGK Kategori type, a cognitive-level tag, a tryout marker, per-element/per-level/per-item evaluation, and seed content.

## Decisions (user, grill session 2026-10-30)
- D1. The kisi-kisi follows 047/H/AN/2025. The research doc carries sources and a "perlu dicek ke Pusmendik" label.
- D2. Reuse `Quiz`. Add `Quiz.kind` = `REGULAR | TRYOUT_TKA`. A tryout defaults to 75 minutes with question shuffle off, and shows the category label.
- D3. New subjects "TKA Matematika" and "TKA Bahasa Indonesia".
  - Chapters are elements (Mat: Bilangan, Objek Geometri, Pengukuran, Data). Subchapters are sub-materi.
  - For BI the chapters are the 3 kompetensi (Pemahaman Tekstual, Pemahaman Inferensial, Evaluasi & Apresiasi).
- D4. New question type `CATEGORY`, graded all-or-nothing. Every statement must match, and any unanswered statement means 0.
  - The two labels can be set per question (default "Benar"/"Salah").
- D5. Grouped items: the stimulus is copied into each question's `prompt`. Tryouts have shuffle off, so a group stays in order. No Stimulus model.
- D6. New optional `Question.cognitiveLevel` = `PEMAHAMAN | APLIKASI | PENALARAN`. It is filled for Matematika only.
- D7. Score stays `earned/max × 100`. Category label (approximate, fixed in code): Kurang < 40, Memadai 40–59.99, Baik 60–79.99, Istimewa ≥ 80. UI text: "perkiraan, bukan skala resmi".
- D8. Teacher evaluation: % correct per chapter (element) and per level, for each student and the class average, plus item analysis (% correct per question number). Per-chapter and per-level breakdowns appear for regular quizzes too.
- D9. Student result after release: score, own % per chapter (e.g. "Bilangan 4/6"), and the label for a tryout. Only the student's own data.
- D10. Seed: kisi-kisi structure, 30 Mat + 30 BI questions written by Claude (DRAFT, 1 point each), and two DRAFT quizzes "Tryout TKA 1 – …" already filled with those questions.
  - Publish already refuses non-ACTIVE questions (`lib/quizzes.ts:166`), so this is safe.
  - `sourceReference`: "Disusun mengikuti kisi-kisi TKA SD (047/H/AN/2025), bukan soal resmi".
- D11. Math figures are drawn as SVG, converted to PNG with `sharp` (already a dep), and uploaded through the existing image pipeline.
- D12. Composition:
  - Mat by element: Bilangan 12, Geometri 5, Pengukuran 8, Data 5.
  - BI by kompetensi: Tekstual 9, Inferensial 13, Evaluasi 8, across ~6 original passages (fiction and information), 4–6 items each.
  - Format per mapel: PG 20, MCMA 5, Kategori 5.
  - Mat level: Pemahaman 10, Aplikasi 12, Penalaran 8.

Each stage ends with a green `bun run test` + `bun run lint` + `bunx tsc --noEmit` and a commit before the next stage starts.

## T1 — Research doc
- `docs/tka-sd-kisi-kisi.md` holds:
  - Both kisi-kisi in full (elements, sub-materi, levels/kompetensi).
  - The 3 bentuk soal, single vs grouped items, format, reporting, and national averages.
  - The scoring choices D4/D7 with the reasons.
  - A source list and the "perlu dicek" label.
- Plan doc `docs/superpowers/plans/2026-10-30-tahap-10-tryout-tka.md` with D1–D12.
- Vault: note `Projects/Aksara/<subfolder>/Aksara TKA SD Kisi-kisi.md`, following the vault's CLAUDE.md frontmatter contract. List it in the hub's `## Peta catatan`.

## T2 — Schema, grading, form, attempt UI
Migration `tahap10_tryout_tka`:
- `enum QuestionType` + `CATEGORY`.
- `enum CognitiveLevel { PEMAHAMAN APLIKASI PENALARAN }`.
- `Question.cognitiveLevel CognitiveLevel?`.
- `Question.categoryLabels String[] @default([])`.
- `enum QuizKind { REGULAR TRYOUT_TKA }`, `Quiz.kind QuizKind @default(REGULAR)`.
- `QuizQuestion.chapterSnapshot String?`, `QuizQuestion.levelSnapshot CognitiveLevel?`. Both are set at publish so later bank edits never change a published report (snapshot invariant).
- Then run `bunx prisma generate`.

CATEGORY shape:
- `options: Option[]` (statements).
- `answerKey: { values: Record<optionId, boolean> }`.
- Student answer: `{ values: Record<optionId, boolean> }`.
- Labels live in `categoryLabels` (public).

Grading:
- `lib/grading.ts`: add to `ObjectiveQuestion`, `StoredAnswer`, `parseAnswer`, and `isCorrect`.
- `parseAnswer` accepts only known option ids, so `{}` means null. `isCorrect` is all-or-nothing and needs every statement answered.

Every `MULTIPLE_SELECT` call site gets a `CATEGORY` branch:
- `lib/questions.ts`: Zod schema, `QuestionContent`, `toPublicQuestion` (labels yes, key never), `countQuestionsByType`.
- `lib/attempts.ts`: `isChoice` / option shuffle.
- `lib/quizzes.ts`: publish snapshot, plus chapter/level snapshot.
- `lib/export.ts`: answer text in "Rincian Jawaban".
- `app/(teacher)/teacher/questions/`: labels.ts, type-strip.tsx, question-defaults.ts, question-form.tsx (statement rows with a key toggle, 2 label inputs, level select), actions.ts, preview page.
- `components/question-view.tsx`.
- `app/(student)/student/quizzes/[quizId]/attempt/attempt-client.tsx`: one radio pair per statement, keyboard-navigable, labels as text.
- `tests/quiz-setup.ts` and `tests/factories.ts`.

Quiz form and `lib/quizzes.ts`:
- Add a `kind` select.
- Choosing TRYOUT_TKA pre-fills 75 minutes and shuffle off. These are just defaults; the teacher can change them.

Tests (TDD):
- grading.test: CATEGORY all-correct / one wrong / one missing / unknown id / duplicate.
- questions.test: key is never in `toPublicQuestion`.
- attempts.test: CATEGORY autosave + submit.
- quizzes.test: publish writes chapter/level snapshots.

## T3 — Seed
- `prisma/seed-tka.ts` + script `db:seed:tka`. It runs `bun --conditions=react-server` (like `e2e/seed.ts`) because it reuses `lib/*`.
- Content lives in `prisma/tka/matematika.ts`, `prisma/tka/bahasa-indonesia.ts`, and `prisma/tka/figures/*.svg`.
- The seed is idempotent:
  - Upsert subjects, chapters, and subchapters the same way `prisma/seed-content.ts` does.
  - Skip questions and quizzes if the TKA subject already has questions.
- Create questions with plain Prisma writes, DRAFT, `createdById` = the seeded teacher, plus an audit entry like `createQuestion`.
- Images: `sharp(svg).png()`, then the same `processImage`/`putImage` path as `app/api/images`. Needs `S3_*` env.
- Create the 2 DRAFT quizzes: `kind: TRYOUT_TKA`, 75 minutes, `QuizQuestion` in order, points 1, no classes.
- Content rules:
  - All original text, never attributed to the books.
  - Composition per D12.
  - Every item carries `difficulty`, `cognitiveLevel` (Mat), and `explanation` (pembahasan).
- Self-check test `prisma/tka/content.test.ts` (pure, no DB). For each mapel it asserts:
  - 30 items.
  - Composition counts.
  - Every answer key passes the `lib/questions.ts` Zod schema.
  - Option ids are unique.
  - Every figure file exists.

## T4 — Evaluation
- New pure `lib/evaluation.ts`:
  - `breakdown(answers, by: "chapter" | "level")` returns `{ key, earned, max, pct }[]`.
  - `itemAnalysis(rows)` returns `{ position, chapter, level, type, correctPct }[]`.
  - `tkaCategory(score)` implements D7.
  - Unit tests for all three.
- `lib/results.ts`:
  - `getQuizEvaluation(quizId)`, teacher-only. Uses the recap `basis` attempt of each FINAL row.
  - `getStudentResult` gains `breakdown` (own chapters) and `category` (tryout only). Keys are still gated by `studentMaySeeKey`.
- Teacher UI: an "Evaluasi" section on `/teacher/quizzes/[id]`. It has a per-chapter table (class average + per-student matrix), a per-level table, and item analysis sorted by lowest %. Built from `StatCard`, `Status`, and existing tables. The label always comes with text, never color alone.
- Student UI: `/student/quizzes/[quizId]/result` gets the per-chapter list and the label with "perkiraan" text.
- `lib/export.ts`: new sheets "Rincian Elemen" and "Analisis Butir". Escape user text as before.
- `lib/export.test.ts`: covers the 2 new sheets.
- Update CLAUDE.md "Current state" with a Tahap 10 paragraph.

## Verification
- After each stage: `bun run test`, `bun run lint`, `bunx tsc --noEmit`.
- After T3: `bun run db:seed:tka` twice against dev. The second run is a no-op. Then check in `/teacher/questions` that 60 drafts with images exist.
- After T4: activate the questions and publish the tryout to a test class.
  - Log in as a student, do the tryout, and submit.
  - Release, then check the teacher Evaluasi section, the student result, and the Excel sheets.
- Add one `e2e/tahap10.spec.ts` flow: a student answers a CATEGORY item → submit → release → per-chapter breakdown is visible. Then run `bun run test:e2e`, separately from vitest.
