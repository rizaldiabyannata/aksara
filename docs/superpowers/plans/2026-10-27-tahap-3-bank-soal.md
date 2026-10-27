# Aksara Tahap 3 (Bank Soal): Rencana Implementasi

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guru bisa membuat, mengubah, memfilter, menduplikat, menghapus (draft), mempratinjau soal 5 tipe beserta kunci dan gambarnya; penilaian objektif tersedia sebagai fungsi murni teruji.

**Architecture:** `Question` menyimpan `options`/`answerKey` sebagai JSON yang hanya ditulis lewat `lib/questions.ts` (Zod discriminated union per `type`). `toPublicQuestion` adalah satu-satunya bentuk soal yang boleh ke siswa. `lib/grading.ts` murni (tanpa I/O). `Image` mendapat pemilik kedua (`questionId`) dengan CHECK "tepat satu pemilik"; siswa selalu 404 untuk gambar soal di tahap ini.

**Tech Stack:** Next.js 16.4.3 (cacheComponents), React 19.3, Prisma 7.10.1 + adapter-pg, Zod ^4.6.7, Vitest + Postgres Docker, R2 via `lib/storage.ts`.

**Spec:** PRD §7.3, §9.2, §12 (`Question`, `Image`), §13, §15, §18 Tahap 3; vault `Feature Specs/Aksara F05 - Bank Soal.md` (utama), F13 (gambar soal), F08 (aturan per tipe), F12 (audit). Pola: `docs/superpowers/plans/2026-10-27-tahap-2-konten.md`.

## Context

Tahap 1–2 sudah di `main`. Tahap 3 membangun bank soal (F05) sebagai satu-satunya tempat kunci jawaban ditulis, sebagai fondasi Tahap 4 (snapshot ulangan). Keputusan final dari prompt tidak diulang; tabel di bawah hanya hasil grilling 2026-10-27 dan turunannya.

## Keputusan

| # | Keputusan | Asal |
|---|---|---|
| D1 | `Question.options Json?` + `Question.answerKey Json`, divalidasi satu Zod discriminated union per `type` (skema F05). `lib/questions.ts` satu-satunya pintu tulis | Q1 |
| D2 | `toPublicQuestion(q)` fungsi murni allowlist: membangun objek baru `{id,type,prompt,options:[{id,text}]\|null,images}`; `images` hanya gambar yang dirujuk prompt/opsi (gambar pembahasan tidak ikut). Jadi `questionSnapshot` di Tahap 4 | Q2 |
| D3 | `lib/grading.ts`: `gradeObjective(q, answer: unknown, points) → points\|0` + `normalizeShortAnswer(s, caseSensitive)`. `computeScore/Recap` ditunda ke Tahap 5 | Q3 |
| D4 | Daftar: filter GET (mapel/bab/subbab/tipe/kesulitan/status/`q`) + `?page=N`, 50/halaman, `take: 51`, tanpa COUNT; `q` = `prompt contains, mode insensitive`; urut `updatedAt desc, id desc` | Q4 |
| D5 | Hapus = hard delete hanya `DRAFT` (pola D10 Tahap 2). Tanpa soft delete. Cek "dipakai ulangan" datang di Tahap 4 | Q5 |
| D6 | Duplikat menyalin objek R2 di server (`copyObject` baru), `Image` baru, id `aksara-image:` di prompt/opsi/pembahasan diganti; hasil `DRAFT`. Gagal → objek tersalin dihapus best effort, tanpa baris yatim | Q6 |
| D7 | Editor slot tetap tanpa state klien: PG 6 slot, kompleks 8 slot, id opsi = huruf `a`…`h`, slot kosong dibuang. Tipe dipilih di `/new?type=` dan tidak bisa diubah. Gambar opsi lewat kode `aksara-image:` + panel gambar (hanya di halaman edit) | Q7 |
| D8 | Rentang F05 + turunan: `Difficulty` EASY/MEDIUM/HARD; poin bulat 1–100; prompt 1–5.000; PG 2–6 opsi; kompleks 3–8, ≥1 benar, tidak semua benar; singkat 1–10 kunci (tak kosong & tak kembar setelah normalisasi, ≤200), `caseSensitive` default false; uraian `rubric` opsional; teks opsi ≤1.000; pembahasan/rubrik/catatan ≤5.000; sumber ≤200; 5 gambar/soal | Q8 |
| D9 | Setiap simpan (DRAFT maupun ACTIVE) wajib lolos skema lengkap; status hanya menentukan "boleh dipilih ke ulangan". F05 diperbarui | Q9 |
| D10 | Task 1: `lib/validation.ts` (`Invalid`, `NotFound`, `parse`, `required`, `optional`); subjects + materials dipindah, students/images/classes dibiarkan. `parse` tetap memakai `path[0]` (lihat D14) | Q10 |
| D11 | Alt text gambar opsi: teks bantuan saja | Q11 |
| D12 | Audit pola materi: `QUESTION_STATUS_CHANGED {from,to}`, `QUESTION_UPDATED {fields}` hanya saat `ACTIVE` diedit (nama field saja; tanpa perubahan → 0 audit), `QUESTION_DELETED {type,chapterId}`, `IMAGE_ADDED/REMOVED {imageId, questionId}`. Buat/duplikat tidak diaudit. `entityType` + `"Question"`. F12 diperbarui | Q12 |
| D13 | `Image.deletedAt` ditunda ke Tahap 4 bersama `QuizQuestionImage`. Hapus gambar soal Tahap 3 = hapus baris + objek | Q13 |
| D14 | Galat validasi soal per blok, kunci tingkat atas: `options`, `answerKey`, `prompt`, … (`superRefine` memakai path tingkat atas). Form menampilkan galat `options`/`answerKey` di fieldset opsi | turunan D7/D10 |
| D15 | Rute `/teacher/questions` (bukan `question-bank` di F05; F05 diperbarui). Nav + kartu dasbor "Bank Soal" | prompt |
| D16 | Panel gambar + action gambar dipindah ke `app/(teacher)/teacher/image-panel.tsx` dan `image-actions.ts` (dipakai materi dan soal), `revalidatePath("/teacher", "layout")` | turunan D7 |
| D17 | Jawaban singkat diisi di satu textarea, satu jawaban per baris | turunan D7 |
| D18 | Pratinjau menampilkan dua bagian berurutan: "Tampilan siswa" (hanya dari `toPublicQuestion`) lalu "Kunci dan pembahasan" | turunan D2 |
| D19 | Normalisasi jawaban singkat memakai ulang `normalizeIdentity` (`lib/normalize.ts`) untuk case-insensitive; case-sensitive = NFKC + rapikan spasi + trim tanpa lowercase | turunan D3 |

## Global Constraints

- Bun saja. `bunx prisma generate` setelah `prisma migrate dev`. Jangan edit migrasi lama, jangan `migrate reset`.
- Setiap action/route: guard dulu (`requireTeacher()`); `redirect()`/`notFound()` di luar `try`; `params`/`searchParams` dibaca di dalam `<Suspense>`.
- Kunci jawaban, pembahasan, rubrik, `verificationNote`, `storageKey` tidak pernah masuk log, audit metadata, atau objek yang dibangun `toPublicQuestion`.
- Tidak ada query bank soal dari halaman/rute siswa.
- `select` Prisma eksplisit; `Object.hasOwn` untuk lookup objek; `values` dikembalikan saat galat form.
- Teks berulang (Ubah/Hapus/Pratinjau) punya label aksesibel unik (`sr-only`/`triggerLabel`).
- UI Bahasa Indonesia, 360 px, keyboard, label di setiap field, target sentuh ≥ 44 px.
- Commit tanpa `.superpowers/`. Akhiri pesan commit dengan `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Model per peran

- **haiku**: T0, T1, T2, T3, T6, T8 + review per task-nya.
- **sonnet**: T4 (`lib/questions.ts`, validasi kunci), T5 (pemilik gambar + rute + duplikat), T7 (halaman multi-file) + review-nya.
- **opus**: satu review akhir seluruh branch (keamanan + lensa ponytail), lalu satu fix wave.
- Haiku gagal 2× pada test yang sama → ulang dengan sonnet. Dispatch ditolak classifier → lanjut inline dengan `superpowers:executing-plans`.

## Pesan baku (dipakai persis)

- Teks soal: "Teks soal wajib diisi, paling banyak 5.000 huruf."
- Poin: "Poin harus bilangan bulat 1 sampai 100."
- Kesulitan: "Pilih tingkat kesulitan."
- Opsi PG: "Isi 2 sampai 6 opsi." · Kompleks: "Isi 3 sampai 8 opsi."
- Opsi kembar: "Teks opsi tidak boleh sama." · Panjang: "Teks opsi paling banyak 1.000 huruf."
- Kunci PG: "Pilih satu jawaban benar dari opsi yang terisi."
- Kunci kompleks: "Tandai minimal satu jawaban benar, tetapi jangan semuanya."
- Benar/salah: "Pilih Benar atau Salah."
- Singkat: "Isi 1 sampai 10 jawaban yang diterima, satu per baris." · Kembar: "Ada jawaban diterima yang sama." · Panjang: "Setiap jawaban paling banyak 200 huruf."
- Pembahasan/rubrik/catatan: "Paling banyak 5.000 huruf." · Sumber: "Sumber paling banyak 200 huruf."
- Tipe diubah: "Tipe soal tidak bisa diubah."
- Subbab salah bab: "Subbab harus dari bab yang dipilih." (sama dengan materi)
- Gambar asing: "Ada kode gambar yang bukan milik soal ini. Pakai tombol Salin kode sisip."
- Hapus non-draft: "Jadikan soal draft dulu sebelum menghapusnya."
- Gambar: batas "Satu soal paling banyak 5 gambar.", tidak ada "Soal tidak ditemukan."
- Bantuan alt (panel gambar soal + bawah fieldset opsi): "Teks alternatif jangan membocorkan jawaban. Tulis mis. “Gambar A”."
- Sukses: "Soal disimpan.", "Status soal diubah.", "Soal dihapus.", "Soal diduplikat."
- Label: tipe "Pilihan ganda", "Benar/salah", "Pilihan ganda kompleks", "Jawaban singkat", "Uraian"; status "Draf", "Aktif"; kesulitan "Mudah", "Sedang", "Sulit"; tombol status "Aktifkan" / "Jadikan draft"; "Duplikat"; daftar "Sebelumnya" / "Berikutnya"; kosong "Belum ada soal." / "Tidak ada soal yang cocok."; pratinjau "Tampilan siswa", "Kunci dan pembahasan"; singkat/uraian di tampilan siswa "Siswa menjawab dengan mengetik."

## Peta file

- Baru: `lib/validation.ts`, `lib/grading.ts`(+test), `lib/questions.ts`(+test), `components/question-view.tsx`(+test), `app/(teacher)/teacher/image-panel.tsx`, `app/(teacher)/teacher/image-actions.ts`(+test), `app/(teacher)/teacher/questions/{page.tsx,actions.ts,actions.test.ts,question-form.tsx,labels.ts}`, `questions/new/page.tsx`, `questions/[id]/page.tsx`, `questions/[id]/preview/page.tsx`, migrasi `tahap_3_bank_soal`.
- Ubah: `prisma/schema.prisma`, `lib/audit.ts`, `lib/subjects.ts`, `lib/materials.ts`, `lib/images.ts`(+test), `lib/storage.ts`, `tests/storage-fake.ts`, `tests/factories.ts`, `tests/setup.ts`, `app/api/images/route.ts`(+test), `app/(teacher)/teacher/{page.tsx,layout.tsx}`, `materials/{actions.ts,actions.test.ts,[id]/page.tsx}`, hapus `materials/image-panel.tsx`, `CLAUDE.md`.

## Review Focus

1. **Siswa membuka `/api/images/<id>` gambar soal dengan id yang diketahui** → 404, termasuk soal `ACTIVE` (T5 test "student gets 404 for an ACTIVE question's image").
2. **Slot kosong ditandai benar / form dipalsukan** (kunci menunjuk id yang tidak ada, `type` diganti saat update, opsi dengan id `__proto__`) → `fieldErrors`, bukan 500 (T4 tests "correct mark on a blank slot", "type change on update", "option id outside a–h").
3. **Variasi spasi/kapital membuat kembar** (`"Jakarta"` vs `" jakarta "` di kunci singkat tidak case-sensitive; opsi `"A"` vs `"A "`) → ditolak sebagai kembar (T4 tests).
4. **Salin R2 gagal di tengah duplikat** → tidak ada `Question`/`Image` baru, objek yang sudah tersalin dihapus (T5 test dengan fake yang melempar pada salinan ke-2).
5. **`?page=abc`, `?page=0`, `?page=999`, `?type=FOO`** → halaman 1 / daftar kosong dengan "Sebelumnya", filter tak dikenal diabaikan, bukan 500 (T4 test `listQuestions` + T7 parsing).

---

### Task 0: Branch dan salin rencana

- [ ] `git switch -c tahap-3-bank-soal` di checkout ini (tanpa worktree).
- [ ] Salin file rencana ini ke `docs/superpowers/plans/2026-10-27-tahap-3-bank-soal.md`; commit `docs: Tahap 3 plan`.

### Task 1: `lib/validation.ts` (haiku)

**Files:** Create `lib/validation.ts`; Modify `lib/subjects.ts:5-52`, `lib/materials.ts:9-72`.

**Produces:** `export type Invalid = { ok: false; error: "INVALID"; fieldErrors: Record<string, string> }`, `export type NotFound = { ok: false; error: "NOT_FOUND" }`, `export function parse<S extends z.ZodType>(schema: S, input: unknown): { ok: true; data: z.infer<S> } | Invalid`, `export const required = (max: number, msg: string)`, `export const optional = (max: number, msg: string)`. Isi identik dengan salinan di `lib/subjects.ts:30-52` (path[0], kunci "form" bila kosong).

- [ ] Pindahkan; hapus salinan di subjects + materials; impor dari `@/lib/validation`.
- [ ] Verifikasi: `bun run test lib/subjects.test.ts lib/materials.test.ts` hijau tanpa mengubah test; `bunx tsc --noEmit`. Commit `refactor: shared validation helpers`.

### Task 2: Skema, migrasi, audit, factory (haiku)

**Files:** `prisma/schema.prisma`, migrasi baru, `lib/audit.ts`, `tests/factories.ts`, `tests/setup.ts`, `lib/questions.schema.test.ts`.

**Produces:**
- Enum `QuestionType {SINGLE_CHOICE TRUE_FALSE MULTIPLE_SELECT SHORT_ANSWER ESSAY}`, `QuestionStatus {DRAFT ACTIVE}`, `Difficulty {EASY MEDIUM HARD}`.
- `Question { id cuid, chapterId → Chapter Restrict, subchapterId String?, subchapter Subchapter? @relation(fields:[subchapterId, chapterId], references:[id, chapterId], onDelete: Restrict) (pola Material), type, prompt, options Json?, answerKey Json, explanation String?, defaultPoints Int, difficulty, status @default(DRAFT), sourceReference String?, verificationNote String?, createdById/updatedById → User Restrict (relasi "QuestionCreatedBy"/"QuestionUpdatedBy"), createdAt/updatedAt Timestamptz(3), images Image[]; @@index([chapterId, status]) @@index([type]) @@index([difficulty]) @@index([subchapterId, chapterId]) @@index([createdById]) @@index([updatedById]) }`.
- `Image.materialId String?`, `Image.questionId String?` → Question Restrict, `@@index([questionId])`, `@@index([createdById])`.
- Indeks FK tertunda: `Material @@index([subchapterId, chapterId])`, `@@index([createdById])`, `@@index([updatedById])`.
- Migrasi via `bunx prisma migrate dev --create-only --name tahap_3_bank_soal`, lalu tambahkan manual di akhir SQL: `ALTER TABLE "Image" ADD CONSTRAINT "Image_one_owner" CHECK (num_nonnulls("materialId", "questionId") = 1);` → `bunx prisma migrate dev` → `bunx prisma generate`.
- `AuditAction` + `"QUESTION_STATUS_CHANGED" | "QUESTION_UPDATED" | "QUESTION_DELETED"`; `entityType` + `"Question"`.
- `tests/setup.ts` TRUNCATE + `"Question"`. `makeQuestion(chapterId, createdById, overrides?)` membuat SINGLE_CHOICE valid: `options [{id:"a",text:"Satu"},{id:"b",text:"Dua"}]`, `answerKey {optionId:"a"}`, `defaultPoints 1`, `difficulty EASY`, `prompt "Soal uji"`. `makeImage(owner: { materialId: string } | { questionId: string }, createdById, overrides?)` (ubah pemanggil lama: `makeImage({ materialId }, …)`; cek `graft callers makeImage` dulu).

- [ ] Test dulu (`lib/questions.schema.test.ts`): "CHECK rejects an image with no owner" (`prisma.$executeRaw` insert tanpa owner → throw); "CHECK rejects an image with both owners"; "question with subchapter of another chapter is rejected by the composite FK".
- [ ] Verifikasi: test ini + `bun run test` penuh hijau. Commit `feat(db): question bank schema and image owner check`.

### Task 3: `lib/grading.ts` (haiku)

**Produces:**
```ts
export type ObjectiveQuestion =
  | { type: "SINGLE_CHOICE"; answerKey: { optionId: string } }
  | { type: "TRUE_FALSE"; answerKey: { value: boolean } }
  | { type: "MULTIPLE_SELECT"; answerKey: { optionIds: string[] } }
  | { type: "SHORT_ANSWER"; answerKey: { accepted: string[]; caseSensitive: boolean } };
export function normalizeShortAnswer(s: string, caseSensitive: boolean): string; // D19
export function gradeObjective(q: ObjectiveQuestion, answer: unknown, points: number): number;
```
Bentuk jawaban (F05): `{optionId}`, `{value}`, `{optionIds}`, `{text}` (≤200), di-parse Zod per tipe; gagal parse → 0. Modul tanpa impor Prisma/DB.

- [ ] Test dulu (`lib/grading.test.ts`): PG benar → points, salah → 0; B/S; kompleks `["a","c"]` vs kunci `["c","a"]` → penuh, kurang satu → 0, lebih satu → 0, duplikat `["a","a","c"]` → 0; singkat `" Jakarta "` vs `"jakarta"` (caseSensitive false) → penuh, true → 0; `"Kota  Jakarta"` cocok `"kota jakarta"`; NFKC (`"ｊａｋａｒｔａ"` cocok); tidak ada fuzzy (`"Jakartaa"` → 0); `null`, `{}`, `"a"`, `{optionId: 1}`, teks 201 huruf → 0.
- [ ] Verifikasi `bun run test lib/grading.test.ts`. Commit `feat(grading): pure objective grading`.

### Task 4: `lib/questions.ts` (sonnet)

**Consumes:** T1, T2, `normalizeShortAnswer` (T3), `extractImageIds` dan `ImageView` (sudah ada).

**Produces:**
```ts
export type Option = { id: string; text: string };
export type QuestionContent =
  | { type: "SINGLE_CHOICE"; options: Option[]; answerKey: { optionId: string } }
  | { type: "TRUE_FALSE"; options: null; answerKey: { value: boolean } }
  | { type: "MULTIPLE_SELECT"; options: Option[]; answerKey: { optionIds: string[] } }
  | { type: "SHORT_ANSWER"; options: null; answerKey: { accepted: string[]; caseSensitive: boolean } }
  | { type: "ESSAY"; options: null; answerKey: { rubric: string | null } };
export type QuestionDetail = QuestionContent & { id; chapterId; subchapterId: string | null; subjectName; chapterTitle; subchapterTitle: string | null; prompt; explanation: string | null; defaultPoints: number; difficulty: Difficulty; status: QuestionStatus; sourceReference: string | null; verificationNote: string | null; images: ImageView[]; updatedAt: Date };
export type PublicQuestion = { id: string; type: QuestionType; prompt: string; options: Option[] | null; images: ImageView[] };
export type QuestionRow = { id; type; difficulty; status; prompt; defaultPoints; chapterTitle; subjectName; updatedAt: Date };
export type QuestionFilter = { subjectId?; chapterId?; subchapterId?; type?: QuestionType; difficulty?: Difficulty; status?: QuestionStatus; q?: string; page?: number };
export function toPublicQuestion(q: Pick<QuestionDetail, "id" | "type" | "prompt" | "options" | "images">): PublicQuestion;
export async function createQuestion(actorId: string, input: unknown): Promise<{ ok: true; id: string } | Invalid>;
export async function updateQuestion(actorId: string, id: string, input: unknown): Promise<{ ok: true } | Invalid | NotFound>;
export async function setQuestionStatus(actorId: string, id: string, to: QuestionStatus): Promise<{ ok: true } | NotFound>;
export async function deleteQuestion(actorId: string, id: string): Promise<{ ok: true } | NotFound | { ok: false; error: "NOT_DRAFT" }>;
export async function listQuestions(f: QuestionFilter): Promise<{ rows: QuestionRow[]; hasNext: boolean }>;
export async function getQuestionForTeacher(id: string): Promise<QuestionDetail | null>;
export async function countQuestionsByStatus(): Promise<Record<QuestionStatus, number>>;
```
- Input = field dasar (`chapterId`, `subchapterId?`, `prompt`, `explanation?`, `defaultPoints`, `difficulty`, `sourceReference?`, `verificationNote?`) + varian `QuestionContent` (`z.discriminatedUnion("type", …)`). Id opsi `^[a-h]$`, unik. Aturan D8, pesan baku, kunci galat D14. Kembar opsi = teks setelah `trim` sama persis (Markdown lengkap). Kembar kunci singkat = `normalizeShortAnswer` sama.
- `checkRefs` seperti `lib/materials.ts:108-136`: bab ada, subbab milik bab, `aksara-image:` di `prompt`, setiap `options[].text`, `explanation` harus milik soal ini (create: tidak ada gambar → setiap rujukan ditolak).
- `options: null` ditulis sebagai `Prisma.DbNull`. Baca JSON → cast ke `QuestionContent` di satu fungsi `toDetail` (ditulis hanya lewat skema, D9).
- `updateQuestion`: `type` beda dari tersimpan → `fieldErrors.type`. Field berubah dibandingkan dengan `JSON.stringify`; audit `QUESTION_UPDATED {fields}` hanya bila status `ACTIVE` dan ada perubahan.
- `setQuestionStatus`: status sama → no-op tanpa audit.
- `deleteQuestion`: satu transaksi hapus `Image` milik soal + `Question` + audit `QUESTION_DELETED {type, chapterId}`, lalu `deleteImage` R2 best effort (pola `deleteMaterial`).
- `listQuestions`: `page` bukan bilangan bulat ≥1 → 1; `skip (page-1)*50, take 51`; `subjectId` via `chapter: { subjectId }`; `q` di-trim, kosong diabaikan.
- `toPublicQuestion`: bangun objek baru; `images` disaring ke id dari `extractImageIds(prompt)` + setiap teks opsi.

- [ ] Test dulu (`lib/questions.test.ts`, storage fake): valid untuk kelima tipe; PG kunci tak ada di opsi → `answerKey`; "correct mark on a blank slot" (kunci `"c"`, opsi hanya a,b) → `answerKey`; PG 1 opsi / 7 opsi → `options`; kompleks semua benar / 0 benar → `answerKey`; opsi kembar `"A"` vs `"A "` → `options`; kembar dengan id gambar berbeda diterima; singkat 0 / 11 kunci → `answerKey`, `"Jakarta"` + `" jakarta "` (case-insensitive) → kembar, tetapi diterima bila caseSensitive true; uraian tanpa rubrik valid dan `answerKey` `{rubric:null}`; "option id outside a–h" (`"__proto__"`) → `options`; poin 0 / 101 / 1.5 → `defaultPoints`; prompt spasi saja → `prompt`; subbab bab lain → `subchapterId`; `aksara-image` milik soal lain dan milik materi → pesan gambar asing, milik sendiri diterima; "type change on update" → `type`; edit DRAFT → 0 audit; edit ACTIVE ubah `answerKey`+`prompt` → tepat 1 `QUESTION_UPDATED` dengan `fields` `["prompt","answerKey"]` (urutan FIELDS), `JSON.stringify(metadata)` tidak memuat isi kunci/prompt baru; simpan ulang tanpa perubahan → tetap 1; status DRAFT→ACTIVE → 1 audit, ACTIVE→ACTIVE → 0; hapus ACTIVE → `NOT_DRAFT`; hapus DRAFT → baris soal + gambar hilang, `objects` fake kosong, 1 `QUESTION_DELETED`; `toPublicQuestion`: `JSON.stringify` hasilnya tidak memuat nilai `answerKey` (mis. teks kunci singkat unik), `explanation`, `verificationNote`, `rubric`, id gambar yang hanya dirujuk pembahasan, maupun `storageKey`; field ekstra di opsi (`{id,text,correct:true}` dipaksa ke input) tidak ikut; `listQuestions` filter tiap dimensi + `q` insensitive, 51 baris → 50 + `hasNext`, `page: NaN`/`0` → halaman 1, halaman 999 → kosong; `getQuestionForTeacher` tidak memuat `storageKey`.
- [ ] Verifikasi `bun run test lib/questions.test.ts`. Commit `feat(questions): question bank domain`.

### Task 5: Gambar milik soal + rute + duplikat (sonnet)

**Consumes:** T2, T4.

**Produces:**
- `lib/storage.ts`: `export async function copyObject(fromKey: string, toKey: string): Promise<void>` (`CopyObjectCommand`, `CopySource: \`${bucket}/${fromKey}\``). Fake: `copyObject` menyalin entri `objects`.
- `lib/images.ts`: `addImage(actorId, input: { materialId?: string; questionId?: string; altText; caption?; sourceReference?; file })` — tepat satu pemilik tak kosong, selain itu `INVALID {form}`; batas 20 materi / 5 soal (`LIMIT`); audit metadata memuat `materialId` atau `questionId`. `removeImage` metadata sama. `canStudentViewImage(ctx: { role; materialStatus: MaterialStatus | null })` — `null` (gambar soal) → hanya guru. `imageRedirectTarget` memilih `material: { select: { status } }` nullable.
- `lib/questions.ts`: `export async function duplicateQuestion(actorId: string, id: string): Promise<{ ok: true; id: string } | NotFound>` — `copyObject` setiap gambar ke `images/<randomUUID>.<ext lama>` di luar transaksi; transaksi membuat soal `DRAFT` + baris `Image` baru, lalu memperbarui prompt/opsi/pembahasan dengan id baru; bila apa pun gagal → `deleteImage` untuk setiap kunci yang sudah tersalin (best effort), lempar ulang.
- `app/api/images/route.ts`: baca `questionId` atau `materialId`; pesan batas & tidak-ditemukan per pemilik (pesan baku); log galat memuat id pemilik saja.

- [ ] Test dulu: `lib/images.test.ts` — "adds an image to a question, 6th → LIMIT", "both or no owner → INVALID", "teacher gets presigned URL for a question image", "student gets 404 for an ACTIVE question's image" (`imageRedirectTarget` → null), `canStudentViewImage` tabel dengan `materialStatus: null`, audit `IMAGE_ADDED` memuat `questionId`. `app/api/images/route.test.ts` — POST `questionId` sukses; POST ke soal tak dikenal → 404 "Soal tidak ditemukan."; GET siswa gambar soal → 404. `lib/questions.test.ts` — "duplicate copies images and rewrites ids" (objek baru di fake, prompt/opsi/pembahasan merujuk id baru, soal asal tak berubah, status DRAFT, 0 audit); "duplicate rolls back when the 2nd copy fails" (fake melempar → jumlah `Question`/`Image` tetap, `objects` tanpa salinan baru).
- [ ] Verifikasi `bun run test lib/images.test.ts lib/questions.test.ts app/api/images`. Commit `feat(images): question-owned images and duplicate`.

### Task 6 (satu dispatch): panel gambar bersama + `QuestionView` (haiku)

**Produces:**
- `app/(teacher)/teacher/image-actions.ts`: `updateImageMetaAction(imageId, prev, fd)` dan `removeImageAction(imageId)` dipindah dari `materials/actions.ts` (perilaku sama, `revalidatePath("/teacher", "layout")`); test authz mereka ikut pindah ke `image-actions.test.ts`.
- `app/(teacher)/teacher/image-panel.tsx`: `ImagePanel({ owner, ownerId, images }: { owner: "materialId" | "questionId"; ownerId: string; images: ImageView[] })`; hidden input `name={owner}`; bila `owner === "questionId"` tampilkan teks bantuan alt (pesan baku). `materials/[id]/page.tsx` dipindah ke komponen ini; `materials/image-panel.tsx` dihapus.
- `components/question-view.tsx`: `QuestionView({ question }: { question: PublicQuestion })`, Server Component: prompt lewat `Markdown` (`components/material-view.tsx`) dengan `question.images`; opsi sebagai `<ol>` berlabel A, B, … menurut posisi; B/S menampilkan "Benar"/"Salah"; singkat/uraian menampilkan "Siswa menjawab dengan mengetik."

- [ ] Test dulu (`components/question-view.test.ts`, `renderToStaticMarkup`): render PG memuat teks opsi dan `src="/api/images/<id>"` untuk gambar opsi; gambar yang tidak ada di `question.images` dirender sebagai teks, bukan `<img>`.
- [ ] Verifikasi `bun run test components "app/(teacher)/teacher/image-actions.test.ts" "app/(teacher)/teacher/materials"`, `bun run lint`. Commit `refactor(images): shared image panel; feat: QuestionView`.

### Task 7: Halaman guru bank soal + action (sonnet)

**Consumes:** T4, T5, T6, `listChapterOptions`/`getSubjectTree` (`lib/subjects.ts`), `ConfirmAction`, `FormField`, `Feedback`, `formatWita`, pola `run()` di `materials/actions.ts:31-55`.

**Produces (actions, `questions/actions.ts`):** `createQuestionAction(type: QuestionType, prev, fd)` → `redirect("/teacher/questions/<id>")`; `updateQuestionAction(id, prev, fd)`; `setQuestionStatusAction(id, to: QuestionStatus)`; `duplicateQuestionAction(id)` → redirect ke soal baru; `deleteQuestionAction(id)` → redirect ke daftar. `revalidatePath("/teacher/questions", "layout")`. `fromForm(fd, type)`: opsi dari `option_a`…(6 atau 8 slot), slot kosong setelah trim dibuang; `correct` = `fd.get` (PG, B/S `"true"/"false"`) atau `fd.getAll` (kompleks); `accepted` = baris textarea non-kosong; `caseSensitive` = `"on"`; `defaultPoints` = `Number(...)`. `values` echo semua field (`correct` kompleks digabung koma).

**Halaman (`app/(teacher)/teacher/questions/`):**
- `page.tsx`: form GET berlabel (mapel, bab, subbab, tipe, kesulitan, status, kata kunci); nilai enum tak dikenal diabaikan dengan `Object.hasOwn(LABEL, v)`; kartu/tabel responsif: cuplikan prompt (≤120 huruf, teks polos), tipe, kesulitan, Badge status, bab; link Ubah/Pratinjau berlabel unik; tautan Sebelumnya/Berikutnya mempertahankan filter.
- `new/page.tsx`: tanpa `?type` valid → daftar 5 link tipe; dengan `?type` → `QuestionForm`.
- `question-form.tsx` (client, `useActionState`): select bab + subbab (pola material-form), textarea prompt, fieldset per tipe (D7/D17), pembahasan, poin, kesulitan, sumber, catatan verifikasi; galat `options`/`answerKey` di fieldset dengan `aria-describedby`.
- `[id]/page.tsx`: form + tombol status ("Aktifkan"/"Jadikan draft") + Duplikat + Hapus (ConfirmAction, hanya DRAFT) + `ImagePanel owner="questionId"` + info diubah (`formatWita`); id tak dikenal → `notFound()`.
- `[id]/preview/page.tsx`: "Tampilan siswa" = `<QuestionView question={toPublicQuestion(q)} />`; lalu "Kunci dan pembahasan" (kunci per tipe, poin, pembahasan via `Markdown` dengan semua gambar soal, rubrik, catatan verifikasi).
- `labels.ts`: `TYPE_LABEL`, `STATUS_LABEL`, `DIFFICULTY_LABEL` (pesan baku).

- [ ] Test dulu (`questions/actions.test.ts`): `describe.each` 5 action → siswa 403 (`forbidden`), tanpa sesi → redirect login; "createQuestionAction keeps values on error" (termasuk `correct`); "fromForm drops blank slots and maps MULTIPLE_SELECT correct" (lewat `createQuestionAction` lalu `getQuestionForTeacher`); "deleteQuestionAction on ACTIVE returns the draft-first message".
- [ ] Verifikasi `bun run test "app/(teacher)/teacher/questions"`, `bun run lint`, `bunx tsc --noEmit`. Commit `feat(questions): teacher question bank pages`.

### Task 8: Dasbor, nav, dokumen, verifikasi akhir (haiku)

- [ ] `app/(teacher)/teacher/layout.tsx` nav + `{ href: "/teacher/questions", label: "Bank Soal" }`; `page.tsx` kartu "Bank Soal" dengan `countQuestionsByStatus()` → link `?status=DRAFT|ACTIVE` ("Draf: n", "Aktif: n").
- [ ] `CLAUDE.md` "Current state": Tahap 3 dibangun (Question model, `lib/questions.ts`, `lib/grading.ts`, `toPublicQuestion` satu-satunya bentuk ke siswa, gambar soal guru-saja, `/teacher/questions`). Tidak ada env baru → `.env.example` tidak berubah.
- [ ] Verifikasi: `bun run lint`, `bunx tsc --noEmit`, `bun run test`, `bun run build` semua lulus; `graft grep "answerKey"` menunjukkan tidak ada pemakaian di `app/(student)` atau `console.`; commit `docs: Tahap 3 state`.

### Setelah semua task

`superpowers:verification-before-completion` → satu review akhir opus (keamanan + ponytail) → satu fix wave → `superpowers:finishing-a-development-branch`. Lalu vault: hub (status Tahap 3, risiko terbuka), F05 (rute `/teacher/questions`, D9 draft selalu valid, D12 audit, D17), F12 (3 aksi `QUESTION_*`), F13 (`deletedAt` ditunda ke Tahap 4, CHECK dibuat). Tanpa log harian.

## Risiko & cara verifikasi

- **JSON + Zod DU di Prisma 7**: `Json?` null harus `Prisma.DbNull`; tipe baca adalah `JsonValue` → satu cast di `toDetail`. Dibuktikan test round-trip kelima tipe (T4).
- **CHECK lewat SQL migrasi**: Prisma tidak memodelkan CHECK; `migrate dev` berikutnya tidak menghapusnya (Prisma tidak men-drift CHECK). Dibuktikan test raw insert (T2).
- **Form slot React 19 + `useActionState`**: form di-reset setelah action → nilai dikembalikan lewat `values` sebagai `defaultValue`/`defaultChecked`. Dibuktikan test "keeps values on error" (T7).
- **Pagination di bawah cacheComponents**: `searchParams` dibaca dalam komponen async di dalam `<Suspense>` (pola `materials/page.tsx:19-30`); `bun run build` membuktikan tidak ada "uncached data outside Suspense".
- **`copyObject` R2**: CopySource harus `bucket/key`; fake tidak membuktikan ini → smoke manual di `lib/storage.r2.test.ts` ditambah satu langkah copy (ter-skip tanpa env R2).

## Sengaja tidak dikerjakan (ponytail)

- `Image.deletedAt`, `QuizQuestionImage`, cek "soal dipakai ulangan", banner "dipakai di N ulangan" (Tahap 4).
- `computeScore`/`computeRecap`, penilaian uraian (Tahap 5).
- Daftar opsi dinamis, ganti tipe soal, draft setengah jadi, full-text search, COUNT total halaman.
- Validasi heuristik alt text, impor massal, nilai parsial, E2E Playwright.
- Pindah `Invalid`/`parse` di students/images/classes.
