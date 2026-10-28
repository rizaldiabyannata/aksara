# Aksara Tahap 4 (Ulangan): Rencana Implementasi

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guru menyusun ulangan dari bank soal, menerbitkannya dengan snapshot beku, dan memantau percobaan (termasuk membuka percobaan pengganti); siswa mengerjakan ulangan bertimer server dengan autosave idempoten, submit manual/otomatis, dan penilaian objektif saat terkumpul.

**Architecture:** Dua modul domain dalam: `lib/quizzes.ts` (draf, soal, validasi terbit murni, publish/unpublish + snapshot, aturan setelah terbit) dan `lib/attempts.ts` (start/view/autosave/submit/lazy finalize/pengganti, semua idempoten, jam diinjeksi lewat argumen `now`). Siswa hanya menerima `AttemptView` (proyeksi dari `questionSnapshot` + jawaban sendiri, id = `quizQuestionId`). Attempt siswa lewat Route Handler; aksi guru lewat Server Action. Akses gambar soal siswa = satu query join `QuizQuestionImage` → attempt aktif.

**Tech Stack:** Next.js 16.4.3 (cacheComponents), React 19.3, Prisma 7 + adapter-pg, Zod 4, Vitest + Postgres Docker, R2 via `lib/storage.ts`, Bun.

**Spec:** PRD §7.4–7.6, §9.2, §9.7, §12 (`Quiz`…`AttemptAnswer`), §13, §14 Waktu, §15, §18 Tahap 4; vault `Projects/Aksara/Feature Specs/` F06 + F07 (utama), F13 (gambar soal siswa, `deletedAt`), F08 (aturan per tipe + status penilaian), F12 (audit), F14 (kelas tujuan). Pola: `docs/superpowers/plans/2026-10-27-tahap-3-bank-soal.md`.

## Context

Tahap 1–3 sudah di `main`. Tahap 4 membangun ulangan (F06) dan pengerjaannya (F07) di atas bank soal Tahap 3. Keputusan final dari prompt tidak diulang; tabel di bawah = hasil grilling 2026-10-28 (Q1–Q12) dan turunannya. Rencana ini disalin ke `docs/superpowers/plans/2026-10-28-tahap-4-ulangan.md` di Task 0.

## Keputusan

| # | Keputusan | Asal |
|---|---|---|
| D1 | Submit/lazy finalize menilai objektif di transaksi yang sama: `AttemptAnswer.objectivePoints` via `gradeObjective(answerKeySnapshot)`, `QuizAttempt.objectiveScore` (jumlah), `gradingStatus` (`PENDING_MANUAL_GRADING` bila ulangan punya soal `ESSAY`, selain itu `FINAL`). `maxPoints` diisi saat start. `finalScore`, `manual*`, nilai 0–100, rekap → Tahap 5 | Q1 |
| D2 | Remedial: start dengan `REMEDIAL` + `used ≥ 1` + `resultsReleasedAt` null → 409 `REMEDIAL_NOT_AVAILABLE`. Syarat FINAL + nilai < KKM ditambah Tahap 5 | Q2 |
| D3 | Idempotensi start: `@@unique([quizId, studentId, attemptNumber])` + `replacesAttemptId @unique`. P2002 ditangkap **di luar** transaksi → baca ulang attempt `IN_PROGRESS` → kembalikan (bila tidak ada: ulangi start sekali). Tanpa partial index | Q3 |
| D4 | `questionOrder Json` (`quizQuestionId[]`) + `optionOrder Json` (`{[quizQuestionId]: optionId[]}`, hanya `SINGLE_CHOICE`/`MULTIPLE_SELECT`) disimpan saat start; Fisher–Yates dengan `crypto.randomInt`. Saklar mati → urutan `position` / urutan opsi snapshot | Q4 |
| D5 | `AttemptAnswer.answer Json?` memakai bentuk `lib/grading.ts`: `{optionId}`, `{value}`, `{optionIds}`, `{text}` (singkat ≤200 code point, uraian ≤5.000). `parseAnswer(snapshot, raw)` murni: bentuk per tipe + `optionId(s)` harus ada di opsi snapshot + tanpa duplikat. Kosong (`null`, `[]`, teks kosong setelah trim) → disimpan `Prisma.DbNull`, baris tetap. Salah → 400, tidak menulis | Q5 |
| D6 | Waktu: fungsi domain menerima argumen terakhir `now = new Date()`; kondisi waktu ditulis di `where` Prisma dengan `Date` dari JS. `export const GRACE_MS = 60_000` di `lib/attempts.ts`. Tanpa `lib/time.ts`, tanpa fake timers di test DB | Q6 |
| D7 | `finalizeExpiredAttempts` dipanggil di: start, view, autosave, submit (siswa+quiz), `/student/quizzes` + dasbor siswa (siswa), detail ulangan guru (quiz). Akses gambar tidak memfinalisasi | Q7 |
| D8 | Builder satu halaman `/teacher/quizzes/[id]`, aksi granular `addQuizQuestion`/`removeQuizQuestion`/`moveQuizQuestion`/`setQuizQuestionPoints`; panel tambah memakai ulang `listQuestions({subjectId, status:"ACTIVE", …})`; poin default `defaultPoints`; mapel dipilih di `/new`, tidak bisa diubah | Q8 |
| D9 | Pemantauan minimal di `/teacher/quizzes/[id]` (terbit): tabel attempt + tombol "Beri percobaan pengganti" (dialog alasan 5–300). F11 lengkap → Tahap 5 | Q9 |
| D10 | `QuizQuestion.questionId` FK `Restrict`; `deleteQuestion` → `IN_USE` bila dipakai ulangan mana pun. `Image.deletedAt`; `removeImage` → soft delete bila dirujuk `QuizQuestionImage` (objek R2 disimpan), selain itu hapus seperti sekarang. `QuizQuestionImage.imageId` `Restrict`. Kueri gambar guru, `checkRefs`, batas 5 gambar, `duplicateQuestion` mengabaikan `deletedAt` | Q10 |
| D11 | Autosave klien: pilihan langsung, teks debounce 800 ms + blur/pindah soal; satu request per soal sekaligus, nilai terbaru menggantikan antrean; retry 1-2-4-8 s (maks 10 s) + event `online`; tanpa localStorage; `beforeunload` bila ada yang tertunda; `aria-live`; 409 → layar tutup | Q11 |
| D12 | Satu branch `tahap-4-ulangan`; Bagian A (T1–T4) → checkpoint (lint+tsc+test hijau, catatan ledger, tanpa review opus); Bagian B (T5–T12); satu review akhir opus | Q12 |
| D13 | Serialisasi tanpa partial index: `publishQuiz`/`unpublishQuiz` membuka transaksi dengan `SELECT … FROM "Quiz" WHERE id = … FOR UPDATE`; `startAttempt` dengan `FOR SHARE` (antar siswa tidak saling blokir; unpublish menunggu start dan sebaliknya). Satu helper `lockQuiz(tx, id, mode)` di `lib/quizzes.ts` dengan dua literal `$queryRaw` | turunan D3 |
| D14 | `QuestionSnapshot = Omit<PublicQuestion, "id">` (= `toPublicQuestion(detail)` tanpa `id`, termasuk metadata gambar beku). `AnswerKeySnapshot = { answerKey: QuestionContent["answerKey"]; explanation: string \| null }` | turunan F06 |
| D15 | `QuizQuestionImage @@id([quizQuestionId, imageId])`; `QUESTION` bila id dirujuk prompt/opsi, `EXPLANATION` bila hanya di pembahasan. Id gambar `deletedAt` di soal sumber → terbit ditolak | turunan F13 |
| D16 | Satu `updateQuiz` untuk semua setelan. Saat `PUBLISHED`: `durationMinutes`, `startsAt`, `shuffle*`, `showFeedbackAfterRelease` terkunci; `endsAt` hanya boleh sama atau lebih lambat (tidak boleh jadi null, tidak boleh dari null); `maxAttempts` hanya naik; `title`/`instructions`/`scoringPolicy`/`kkm` bebas. Ubah kebijakan/KKM → audit `QUIZ_SCORING_CHANGED`. Menggantikan 4 aksi F06 (F06 diperbarui) | turunan F06 |
| D17 | `setQuizClasses`: draf = ganti utuh (≥1); terbit = hanya menambah | F06/F14 |
| D18 | Halaman attempt dicari per `quizId` (tanpa `attemptId` di URL). Markdown soal dirender di RSC dan dioper ke klien sebagai `ReactNode`; JSON API berisi Markdown mentah | turunan D11 |
| D19 | `deadlineAt` beku saat start; memperpanjang `endsAt` tidak memperpanjang attempt yang sedang berjalan | turunan F07 |
| D20 | Jadwal diinput `datetime-local` sebagai WITA: `parseWitaInput(s) → Date \| null` (`s + ":00+08:00"`), `toWitaInput(d)`; di `lib/format.ts` | PRD §14 |
| D21 | Audit baru: `QUIZ_PUBLISHED {questionCount, maxPoints}`, `QUIZ_UNPUBLISHED {}`, `QUIZ_SCORING_CHANGED {fromPolicy,toPolicy,fromKkm,toKkm}`, `ATTEMPT_REPLACEMENT_GRANTED {attemptId, reason}`, `QUESTION_DELETED` tetap. `entityType` + `"Quiz"`, `"QuizAttempt"`; tipe metadata menerima `null` | F06/F07/F12 |
| D22 | Kode galat API siswa: 404 `NOT_FOUND`; 409 `ATTEMPT_LIMIT`, `REMEDIAL_NOT_AVAILABLE`, `DEADLINE_PASSED`, `ATTEMPT_CLOSED`; 400 `INVALID`; 403 Origin asing. Bentuk `{ ok, error?, message?, … }`, `Cache-Control: no-store` | F07 |

## Global Constraints

- Bun saja. `bunx prisma generate` setelah `prisma migrate dev`. Jangan edit migrasi lama, jangan `migrate reset`. Raw SQL hanya `lockQuiz` (tagged template).
- Kerja di branch `tahap-4-ulangan` di checkout ini, tanpa worktree. Commit tanpa `.superpowers/`; akhiri pesan commit dengan trailer `Co-Authored-By` model pelaksana.
- Setiap action/route: guard dulu (`requireTeacher()`/`requireStudent()`); route siswa cek `Origin` (pola `sameOrigin` di `app/api/images/route.ts`, bandingkan dengan `new URL(req.url).host`); `req.json()` gagal → 400; `redirect()`/`notFound()` di luar `try`; `params`/`searchParams` dibaca di dalam `<Suspense>`.
- Ke klien siswa (RSC props, JSON) **tidak pernah**: `answerKeySnapshot`, `points`/`maxPoints`/`objective*`, `questionId` bank, `storageKey`, kode kelas, data siswa lain. Satu-satunya bentuk = `AttemptView`/`StudentQuizRow`.
- Log/audit tidak memuat kunci, isi jawaban, kode kelas, `storageKey`.
- `select` Prisma eksplisit; `Object.hasOwn` untuk lookup objek dari input; enum dari klien dicek dulu; `Json?` null = `Prisma.DbNull`; P2002 via `uniqueViolation`, P2003 via `e.meta`.
- Form: `values` di-echo saat galat, checkbox selalu `"on"`/`""`; test action per field opsional kosong (pelajaran C1).
- Teks berulang (Mulai/Lanjutkan/Ubah/Hapus/Naik/Turun/Beri pengganti) punya label aksesibel unik dengan fallback.
- UI Bahasa Indonesia, 360 px, keyboard, target sentuh ≥ 44 px, timer teks + ikon, status simpan `aria-live="polite"`.

## Model per peran

- **haiku**: T1, T2, T5, T12 + review-nya.
- **sonnet**: T3 (publish/snapshot/soft delete), T4 (halaman guru multi-file), T6 (attempts domain), T7+T8 (satu dispatch: pengganti + daftar + akses gambar siswa), T9 (route handler siswa), T10 (halaman siswa + autosave), T11 (pemantauan) + review-nya.
- **opus**: hanya review akhir seluruh branch (keamanan + lensa ponytail) → satu fix wave.
- Haiku gagal 2× pada test yang sama → sonnet. Dispatch ditolak classifier → lanjut inline dengan `superpowers:executing-plans`.
- Brief per task = file di `.superpowers/sdd/` berisi bagian task itu + Global Constraints + bagian Pesan baku yang disebut task. Review per task: hanya named risks task itu, tidak menjalankan ulang suite penuh; temuan minor → ledger.

## Pesan baku (dipakai persis)

**Guru, setelan:** judul "Judul wajib diisi, paling banyak 150 huruf." · petunjuk "Petunjuk paling banyak 5.000 huruf." · mapel "Pilih mata pelajaran." · durasi "Durasi harus bilangan bulat 1 sampai 300 menit." · jadwal tak valid "Tanggal dan jam tidak valid." · urutan jadwal "Jadwal selesai harus setelah jadwal mulai." · percobaan "Batas percobaan harus bilangan bulat 1 sampai 10." · KKM "KKM harus bilangan bulat 0 sampai 100." · remedial "Kebijakan Remedial butuh KKM dan batas percobaan minimal 2." · terkunci "Bagian ini terkunci setelah ulangan terbit." · `endsAt` "Setelah terbit, jadwal selesai hanya boleh diperpanjang." · `maxAttempts` "Setelah terbit, batas percobaan hanya boleh dinaikkan." · kelas kosong "Pilih minimal satu kelas." · lepas kelas "Kelas tidak bisa dilepas setelah ulangan terbit."

**Guru, soal:** sudah ada "Soal ini sudah ada di ulangan." · bukan aktif/mapel lain "Hanya soal aktif dari mata pelajaran ini yang bisa ditambahkan." · poin "Poin harus bilangan bulat 1 sampai 100." · ubah soal setelah terbit "Soal ulangan terkunci setelah terbit." · hapus soal bank dipakai "Soal ini dipakai di ulangan. Keluarkan dari ulangan draf dulu."

**Guru, terbit (daftar alasan):** "Tambahkan minimal satu soal." · "Soal nomor {n} masih draf. Aktifkan dulu di bank soal." · "Total poin harus lebih dari 0." · "Jadwal selesai sudah lewat." · "Pilih minimal satu kelas aktif." · (remedial, pesan setelan) · "Soal nomor {n} memakai gambar yang sudah dihapus." · batal terbit "Ulangan ini sudah dikerjakan siswa, jadi tidak bisa dikembalikan ke draf."

**Guru, pemantauan:** alasan "Alasan wajib diisi, 5 sampai 300 huruf." · sudah diganti "Percobaan ini sudah diganti." · kosong "Belum ada siswa yang mengerjakan."

**Guru, sukses & label:** "Ulangan dibuat.", "Ulangan disimpan.", "Kelas disimpan.", "Soal ditambahkan.", "Soal dikeluarkan.", "Poin disimpan.", "Ulangan diterbitkan.", "Ulangan dikembalikan ke draf.", "Percobaan pengganti dibuka." · status "Draf"/"Terbit" · kebijakan "Nilai tertinggi"/"Remedial" · attempt "Sedang dikerjakan"/"Terkumpul"/"Waktu habis"/"Diganti" · tombol "Buat ulangan", "Simpan", "Tambah", "Keluarkan", "Naik", "Turun", "Terbitkan", "Kembalikan ke draf", "Beri percobaan pengganti" · daftar kosong "Belum ada ulangan." · ringkasan "{n} soal · total {p} poin · {e} uraian" · peringatan kebijakan (terbit) "Mengubah kebijakan nilai atau KKM dapat mengubah rekap semua siswa."

**Siswa, daftar:** "Tersedia" · "Terjadwal, mulai {waktu WITA}" · "Sedang dikerjakan" · "Guru membukakan percobaan pengganti untukmu" · "Selesai" · "Ditutup" · info "Durasi {d} menit · {k} soal · Sisa percobaan {r}" · tombol "Mulai"/"Lanjutkan"/"Ulangi" · kosong "Belum ada ulangan untukmu."

**Siswa, API & pengerjaan:** 404 "Ulangan tidak ditemukan." · `ATTEMPT_LIMIT` "Kesempatan mengerjakan ulangan ini sudah habis." · `REMEDIAL_NOT_AVAILABLE` "Remedial belum bisa dimulai. Tunggu guru merilis hasil." · `DEADLINE_PASSED` "Waktu habis, jawabanmu sudah dikumpulkan." · `ATTEMPT_CLOSED` "Jawabanmu sudah dikumpulkan." · 400 "Jawaban tidak valid." · singkat "Jawaban paling banyak 200 huruf." · uraian "Jawaban paling banyak 5.000 huruf." · Origin "Permintaan ditolak." · simpan "Menyimpan…" / "Tersimpan {HH.MM}" / "Gagal menyimpan, mencoba lagi" · timer "Sisa waktu {mm:ss}" · peringatan "Sisa 5 menit." / "Sisa 1 menit." · nav aria "Soal {n}, sudah dijawab" / "Soal {n}, belum dijawab" · "Sebelumnya"/"Berikutnya" · konfirmasi "Kumpulkan jawaban?" + "{n} soal belum dijawab." bila n > 0 · tombol "Kumpulkan" · selesai "Jawabanmu sudah dikumpulkan. Nilai muncul setelah guru merilis hasil." · tanpa attempt "Tidak ada ulangan yang sedang kamu kerjakan." · tombol kembali "Kembali ke daftar ulangan"

## Peta file

- Baru: `lib/quizzes.ts`(+test), `lib/attempts.ts`(+test), `app/(teacher)/teacher/quizzes/{page.tsx,actions.ts,actions.test.ts,quiz-forms.tsx,labels.ts}`, `quizzes/new/page.tsx`, `quizzes/[id]/{page.tsx,attempts-table.tsx}`, `app/(student)/student/quizzes/{page.tsx,start-button.tsx}`, `quizzes/[quizId]/attempt/{page.tsx,attempt-client.tsx,save-queue.ts,save-queue.test.ts}`, `app/api/quizzes/[quizId]/{start,submit}/route.ts`, `app/api/quiz-attempts/[attemptId]/{route.ts,answers/route.ts}`, `app/api/quiz-attempts/routes.test.ts`, migrasi `tahap_4_ulangan`.
- Ubah: `prisma/schema.prisma`, `lib/audit.ts`, `lib/grading.ts`(+test), `lib/format.ts`(+test), `lib/subjects.ts` (ekspor `swapOrder`), `lib/questions.ts`(+test), `lib/images.ts`(+test), `tests/factories.ts`, `app/(teacher)/teacher/{layout.tsx,page.tsx}`, `questions/actions.ts` (pesan `IN_USE`), `app/(student)/student/page.tsx`, `CLAUDE.md`.

## Review Focus

1. **Siswa memalsukan PUT**: `quizQuestionId` dari ulangan lain, `optionId` di luar snapshot, `optionIds` kembar, `answer` berupa `{"__proto__":…}`/string/angka → 400/404, tidak ada baris tertulis, bukan 500 (T6 test "forged answers").
2. **Guru membuka pengganti saat siswa masih autosave** → autosave berikutnya 409 `ATTEMPT_CLOSED`, jawaban attempt yang diganti tidak berubah, attempt itu tidak dinilai (T7 test "replacement closes a live attempt").
3. **Jam HP salah ±2 jam / HP tidur** → hitung mundur memakai offset `serverNow`; `remainingMs` benar (T10 unit test `remainingMs`), resync lewat GET saat `visibilitychange`/`online`.
4. **Batalkan terbit bersamaan dengan siswa menekan Mulai** → salah satu menang: unpublish ditolak `HAS_ATTEMPTS` atau start 404; tidak pernah ada attempt di ulangan draf (T6 test "start vs unpublish race").
5. **Guru memperpanjang `endsAt` saat siswa sedang mengerjakan** → attempt berjalan tetap memakai `deadlineAt` lama (D19), attempt baru memakai jadwal baru (T6 test "extend endsAt keeps running deadline").

---

## Bagian A: Susun dan terbitkan

### Task 0: Branch, rencana, ledger (inline, tanpa dispatch)

- [ ] `git switch -c tahap-4-ulangan`.
- [ ] Salin rencana ini ke `docs/superpowers/plans/2026-10-28-tahap-4-ulangan.md`; commit `docs: Tahap 4 plan`.
- [ ] Pre-flight scan: bandingkan rencana dengan kode (`graft callers` untuk `deleteQuestion`, `removeImage`, `imageRedirectTarget`, `canStudentViewImage`, `toPublicQuestion`, `swapOrder`, `writeAudit`) → tabel konflik + "Ruling" di `.superpowers/sdd/ledger.md` sebelum T1.

### Task 1: Skema, migrasi, audit, factory (haiku)

**Files:** `prisma/schema.prisma`, migrasi `tahap_4_ulangan`, `lib/audit.ts`, `lib/format.ts`(+test), `tests/factories.ts`, `lib/quizzes.schema.test.ts`.

**Produces (Prisma):**
- Enum: `QuizStatus {DRAFT PUBLISHED}`, `ScoringPolicy {HIGHEST REMEDIAL}`, `AttemptStatus {IN_PROGRESS SUBMITTED}`, `SubmitReason {MANUAL TIMEOUT REPLACED}`, `GradingStatus {PENDING_MANUAL_GRADING FINAL}`, `ImageVisibility {QUESTION EXPLANATION}`.
- `Quiz`: `id`, `subjectId` (Restrict), `title`, `instructions String?`, `durationMinutes Int`, `startsAt?`, `endsAt?`, `maxAttempts Int @default(1)`, `shuffleQuestions`/`shuffleOptions Boolean @default(false)`, `showFeedbackAfterRelease Boolean @default(true)`, `scoringPolicy @default(HIGHEST)`, `kkm Int?`, `status @default(DRAFT)`, `resultsReleasedAt?`, `createdById` (Restrict), `publishedAt?`, `createdAt`, `updatedAt`. Semua waktu `@db.Timestamptz(3)`.
- `QuizClass`: `quizId` (Cascade), `classId` (Restrict), `@@id([quizId, classId])`, `@@index([classId])`.
- `QuizQuestion`: `id`, `quizId` (Cascade), `questionId` (Restrict), `position Int`, `points Int`, `questionSnapshot Json?`, `answerKeySnapshot Json?`; `@@unique([quizId, position])`, `@@unique([quizId, questionId])`, `@@index([questionId])`.
- `QuizQuestionImage`: `quizQuestionId` (Cascade), `imageId` (Restrict), `visibility`; `@@id([quizQuestionId, imageId])`, `@@index([imageId])`.
- `QuizAttempt`: `id`, `quizId` (Restrict), `studentId` (Restrict), `attemptNumber Int`, `slot Int`, `status @default(IN_PROGRESS)`, `submitReason?`, `startedAt`, `deadlineAt`, `submittedAt?`, `questionOrder Json`, `optionOrder Json`, `replacementGrantedAt?`, `replacementGrantedById?` (Restrict), `replacementReason String?`, `replacesAttemptId String? @unique` (self, Restrict), `maxPoints Int`, `objectiveScore Int?`, `gradingStatus GradingStatus?`, `createdAt`, `updatedAt`; `@@unique([quizId, studentId, attemptNumber])`, `@@index([quizId, status])`, `@@index([studentId, status])`, `@@index([deadlineAt])`.
- `AttemptAnswer`: `id`, `attemptId` (Cascade), `quizQuestionId` (Restrict), `answer Json?`, `objectivePoints Int?`, `savedAt`; `@@unique([attemptId, quizQuestionId])`.
- `Image.deletedAt DateTime? @db.Timestamptz(3)`.

**Produces (TS):** `AuditAction` + `"QUIZ_PUBLISHED" | "QUIZ_UNPUBLISHED" | "QUIZ_SCORING_CHANGED" | "ATTEMPT_REPLACEMENT_GRANTED"`; `entityType` + `"Quiz" | "QuizAttempt"`; metadata value + `null`. `parseWitaInput(s: string): Date | null`, `toWitaInput(d: Date): string` (`"YYYY-MM-DDTHH:mm"` WITA). Factory `makeQuiz(subjectId, createdById, overrides?)`, `makeQuizQuestion(quizId, questionId, overrides?)`, `makeAttempt(quizId, studentId, overrides?)` (default `attemptNumber 1`, `slot 1`, `deadlineAt` +30 menit, order `[]`/`{}`, `maxPoints 1`).

- [ ] Test dulu: `lib/quizzes.schema.test.ts` — menghapus `Question` yang dirujuk `QuizQuestion` → `rejects.toThrow(/QuizQuestion_questionId_fkey/)`; attempt kembar `(quizId, studentId, attemptNumber)` → `/QuizAttempt_quizId_studentId_attemptNumber_key/`; `replacesAttemptId` kembar → `/QuizAttempt_replacesAttemptId_key/`; menghapus `Image` yang dirujuk `QuizQuestionImage` → `/QuizQuestionImage_imageId_fkey/`. `lib/format.test.ts`: `parseWitaInput("2026-11-01T08:00")` = `2026-11-01T00:00:00.000Z`; `"2026-13-01T08:00"`, `""`, `"abc"` → `null`; `toWitaInput(new Date("2026-11-01T00:00:00Z"))` = `"2026-11-01T08:00"`.
- [ ] `bun run db:migrate --name tahap_4_ulangan` → `bunx prisma generate` → `bun run test lib/quizzes.schema.test.ts lib/format.test.ts` hijau. Commit `feat(quizzes): schema`.

**Named risks:** nama constraint di regex cocok dengan migrasi nyata; `Timestamptz(3)` di semua kolom waktu; tidak ada kolom Tahap 5 yang ikut (`finalScore`, `manualPoints`, `resultsReleasedById`, `resultsReleasePolicy`); `parseWitaInput` menolak tanggal yang di-roll-over (`02-30`).

### Task 2: `lib/quizzes.ts` bagian draf (haiku)

**Consumes:** T1, `parse`/`required`/`optional`/`Invalid`/`NotFound` (`lib/validation.ts`), `swapOrder` (ekspor dari `lib/subjects.ts:62`), `writeAudit`, `parseWitaInput`.

**Produces:**
```ts
export type QuizRow = { id: string; title: string; subjectName: string; status: QuizStatus; questionCount: number; classNames: string[]; updatedAt: Date };
export type QuizDetail = { id; title; instructions: string | null; subjectId; subjectName; durationMinutes: number; startsAt: Date | null; endsAt: Date | null; maxAttempts: number; shuffleQuestions: boolean; shuffleOptions: boolean; showFeedbackAfterRelease: boolean; scoringPolicy: ScoringPolicy; kkm: number | null; status: QuizStatus; publishedAt: Date | null; classIds: string[]; questions: { id: string; questionId: string; position: number; points: number; type: QuestionType; prompt: string; status: QuestionStatus }[]; attemptCount: number };
export type PublishCheck = { questions: { status: QuestionStatus; points: number; type: QuestionType }[]; endsAt: Date | null; scoringPolicy: ScoringPolicy; kkm: number | null; maxAttempts: number; activeClassCount: number };
export function validateForPublish(q: PublishCheck, now: Date): string[]; // murni, pesan baku "Guru, terbit"
export async function createQuiz(actorId: string, input: unknown): Promise<{ ok: true; id: string } | Invalid>;
export async function updateQuiz(actorId: string, id: string, input: unknown): Promise<{ ok: true } | Invalid | NotFound>;
export async function setQuizClasses(id: string, classIds: string[]): Promise<{ ok: true } | Invalid | NotFound>;
export async function addQuizQuestion(id: string, questionId: string): Promise<{ ok: true } | Invalid | NotFound>;
export async function removeQuizQuestion(id: string, quizQuestionId: string): Promise<{ ok: true } | Invalid | NotFound>;
export async function moveQuizQuestion(id: string, quizQuestionId: string, dir: "up" | "down"): Promise<{ ok: true } | Invalid | NotFound>;
export async function setQuizQuestionPoints(id: string, quizQuestionId: string, points: unknown): Promise<{ ok: true } | Invalid | NotFound>;
export async function listQuizzes(): Promise<QuizRow[]>;
export async function getQuizForTeacher(id: string): Promise<QuizDetail | null>;
```
- Input setelan (string dari form): `title` 1–150, `instructions` ≤5.000 opsional, `subjectId` (create saja), `durationMinutes` 1–300, `startsAt`/`endsAt` string `datetime-local` opsional → `parseWitaInput`, `maxAttempts` 1–10, checkbox `"on"`/`""`, `scoringPolicy` dicek `Object.hasOwn(ScoringPolicy, …)`, `kkm` opsional 0–100. Galat per field; remedial → `fieldErrors.kkm`.
- `updateQuiz` saat `PUBLISHED` mengikuti D16; field terkunci yang berubah → `fieldErrors[field] = "Bagian ini terkunci setelah ulangan terbit."`. Ubah kebijakan/KKM → satu `QUIZ_SCORING_CHANGED`.
- Mutasi soal saat `PUBLISHED` → `fieldErrors.form = "Soal ulangan terkunci setelah terbit."`. `addQuizQuestion`: soal `ACTIVE` dan `chapter.subjectId === quiz.subjectId`; posisi = maks+1; kembar → pesan "sudah ada" (P2002 via `uniqueViolation`). `removeQuizQuestion` merapatkan posisi. `moveQuizQuestion` memakai `swapOrder`; `dir` dicek.
- `setQuizClasses`: id kelas tak dikenal diabaikan; draf: kosong → "Pilih minimal satu kelas."; terbit: kelas lama hilang → "Kelas tidak bisa dilepas setelah ulangan terbit.".

- [ ] Test dulu (`lib/quizzes.test.ts`): create valid + tiap pesan galat (judul spasi, durasi 0/301/1.5, `maxAttempts` 0/11, KKM 101, REMEDIAL tanpa KKM, REMEDIAL + `maxAttempts` 1, `endsAt` ≤ `startsAt`, tanggal tak valid, `scoringPolicy: "__proto__"`); create dengan semua opsional kosong (`instructions:""`, `startsAt:""`, `endsAt:""`, `kkm:""`, checkbox `""`) → ok dan tersimpan null/false; `validateForPublish`: 0 soal, soal DRAFT nomor 2, total poin 0 (dipaksa langsung), `endsAt` lampau, 0 kelas aktif, remedial invalid → tiap pesan persis, valid → `[]`; add soal DRAFT / mapel lain / kembar → galat; remove + posisi rapat 1..n; move naik di posisi 1 → no-op; poin 0/101/"x" → galat; terbit: ubah judul+KKM ok + 1 audit `QUIZ_SCORING_CHANGED` dengan from/to; ubah durasi → terkunci; `endsAt` dimajukan / jadi null → galat, diperpanjang → ok; `maxAttempts` turun → galat; tambah soal → terkunci; lepas kelas → galat, tambah kelas → ok.
- [ ] `bun run test lib/quizzes.test.ts` hijau. Commit `feat(quizzes): draft domain`.

**Named risks:** checkbox kosong tidak boleh dibaca sebagai `true`; posisi unik saat hapus/geser (swap lewat nilai sementara, pola `swapOrder`); terbit vs draf dicek di dalam transaksi yang sama dengan tulis; audit hanya bila kebijakan/KKM benar-benar berubah.

### Task 3: Publish/unpublish + snapshot + hapus aman (sonnet)

**Consumes:** T1, T2, `getQuestionForTeacher`/`toPublicQuestion`/`QuestionContent` (`lib/questions.ts`), `extractImageIds`, `removeObject` (`lib/images.ts`).

**Produces:**
```ts
export type QuestionSnapshot = Omit<PublicQuestion, "id">;
export type AnswerKeySnapshot = { answerKey: QuestionContent["answerKey"]; explanation: string | null };
export async function lockQuiz(tx: Prisma.TransactionClient, id: string, mode: "UPDATE" | "SHARE"): Promise<boolean>; // false = tidak ada
export async function publishQuiz(actorId: string, id: string, now?: Date): Promise<{ ok: true } | NotFound | { ok: false; error: "INVALID_PUBLISH"; reasons: string[] }>;
export async function unpublishQuiz(actorId: string, id: string): Promise<{ ok: true } | NotFound | { ok: false; error: "HAS_ATTEMPTS" }>;
// lib/questions.ts
deleteQuestion(...): Promise<{ ok: true } | NotFound | { ok: false; error: "NOT_DRAFT" | "IN_USE" }>;
```
- `publishQuiz`: tx { `lockQuiz(UPDATE)`; status sudah `PUBLISHED` → `{ok:true}` tanpa menulis apa pun; baca setelan, kelas aktif, soal + konten bank; `validateForPublish`; gambar `deletedAt` yang dirujuk → alasan; ada alasan → lempar galat khusus yang ditangkap di luar tx → `INVALID_PUBLISH`; tulis snapshot (D14) + `QuizQuestionImage` (D15); `status=PUBLISHED`, `publishedAt=now`; audit `QUIZ_PUBLISHED {questionCount, maxPoints}` }.
- `unpublishQuiz`: tx { `lockQuiz(UPDATE)`; bukan `PUBLISHED` → `{ok:true}`; ada attempt → `HAS_ATTEMPTS`; snapshot → `Prisma.DbNull`, hapus `QuizQuestionImage` milik quiz, `DRAFT`, `publishedAt=null`; audit `QUIZ_UNPUBLISHED` }.
- `deleteQuestion`: cek `quizQuestion.count({questionId}) > 0` → `IN_USE` sebelum hapus. `removeImage`: dirujuk `QuizQuestionImage` → `deletedAt=now`, objek tidak dihapus, audit tetap. Filter `deletedAt: null` di `lib/questions.ts:211` (`checkRefs`), `:345` (duplikat), `:459` (detail guru) dan `lib/images.ts:144` (batas jumlah).

- [ ] Test dulu (`lib/quizzes.test.ts` + `lib/questions.test.ts` + `lib/images.test.ts`, storage fake): terbit tanpa soal → `INVALID_PUBLISH` berisi "Tambahkan minimal satu soal.", status tetap DRAFT, 0 snapshot; "double publish" `Promise.all([publish, publish])` → keduanya ok, tepat 1 audit `QUIZ_PUBLISHED`; snapshot: `questionSnapshot` = `toPublicQuestion` tanpa `id`, `answerKeySnapshot` berisi kunci + pembahasan; gambar di prompt → `QUESTION`, hanya di pembahasan → `EXPLANATION`; "bank edit after publish": `updateQuestion` ubah prompt+kunci → snapshot identik (`toEqual` sebelum/sesudah); `removeImage` gambar yang dirujuk → baris ada dengan `deletedAt`, objek masih di `objects`, panel guru tidak lagi menampilkannya; gambar tak dirujuk → baris + objek hilang; terbit ulangan lain dengan soal yang masih merujuk gambar terhapus → alasan "memakai gambar yang sudah dihapus"; `deleteQuestion` soal di draf ulangan → `IN_USE`; unpublish 0 attempt → DRAFT, snapshot null, `QuizQuestionImage` 0 baris, 1 audit; unpublish dengan 1 attempt (factory) → `HAS_ATTEMPTS`, tetap terbit.
- [ ] `bun run test lib/quizzes.test.ts lib/questions.test.ts lib/images.test.ts` hijau. Commit `feat(quizzes): publish with snapshot`.

**Named risks:** galat validasi harus me-rollback seluruh tx (tidak ada snapshot setengah); `lockQuiz` memakai tagged template (bukan `$queryRawUnsafe`); `answerKeySnapshot` tidak pernah masuk audit metadata; soft delete tidak menghapus objek R2; kueri gambar guru tanpa filter `deletedAt` tertinggal.

### Task 4: Halaman guru ulangan (sonnet)

**Files:** `app/(teacher)/teacher/quizzes/{page.tsx,actions.ts,actions.test.ts,quiz-forms.tsx,labels.ts}`, `quizzes/new/page.tsx`, `quizzes/[id]/page.tsx`, `app/(teacher)/teacher/layout.tsx` (nav "Ulangan" setelah "Bank Soal"), `questions/actions.ts` (pesan `IN_USE`).

**Consumes:** T2, T3, `listQuestions` (filter `subjectId`, `chapterId`, `type`, `difficulty`, `status:"ACTIVE"`, `page`), `ConfirmAction`, `FormField`/`FormMessage`, `Feedback`, `formatWita`, `toWitaInput`, pola `run()` + `revalidatePath` dari `questions/actions.ts`.

**Produces (Server Actions, semua `requireTeacher()` dulu):** `createQuizAction(prev, fd)` → redirect `/teacher/quizzes/{id}`; `updateQuizAction(id, prev, fd)`; `setQuizClassesAction(id, prev, fd)` (`fd.getAll("classId")`); `addQuizQuestionAction(id, questionId)`; `removeQuizQuestionAction(id, qqId)`; `moveQuizQuestionAction(id, qqId, dir)`; `setQuizQuestionPointsAction(id, qqId, prev, fd)`; `publishQuizAction(id)` (alasan → `message` berisi daftar); `unpublishQuizAction(id)`.
- `/teacher/quizzes`: tabel `QuizRow` + tombol "Buat ulangan". `/new`: judul + mapel saja. `/[id]` (params dalam `<Suspense>`): form setelan (field terkunci `disabled` saat terbit + peringatan kebijakan), checkbox kelas, daftar soal terpilih (poin, Naik/Turun/Keluarkan, label unik "Naik soal nomor {n}"), panel tambah (filter GET + `?page`, tombol "Tambah" atau teks "Sudah dipilih"), ringkasan, Terbitkan / Kembalikan ke draf (`ConfirmAction`). Slot pemantauan dikosongkan untuk T11.

- [ ] Test dulu (`actions.test.ts`): `describe.each` setiap action dengan sesi siswa → `expectForbidden`; tanpa sesi → redirect `/teacher/login`; `createQuizAction` dengan semua field opsional kosong → ok; `updateQuizAction` per field opsional kosong satu per satu (`instructions`, `startsAt`, `endsAt`, `kkm`, tiap checkbox `""`) → ok, nilai null/false tersimpan; galat → `values` di-echo termasuk checkbox `"on"`/`""`; `publishQuizAction` invalid → `message` memuat setiap alasan; `moveQuizQuestionAction(id, qq, "sideways")` → tidak melempar, tidak mengubah apa pun; hapus soal bank yang dipakai lewat action soal → pesan `IN_USE` persis.
- [ ] `bun run test app/(teacher)/teacher/quizzes` + `bun run lint` + `bunx tsc --noEmit` hijau. Commit `feat(quizzes): teacher pages`.

**Named risks:** pelajaran C1 (field opsional kosong lewat jalur form); `searchParams` panel di dalam `<Suspense>`; enum `dir`/`scoringPolicy` dari klien; label aksesibel unik untuk tombol berulang; tidak ada `answerKey` di props halaman guru selain yang memang untuk guru.

### Checkpoint A

- [ ] `bun run lint`, `bunx tsc --noEmit`, `bun run test` hijau; catat di ledger. Tanpa review opus.

---

## Bagian B: Kerjakan

### Task 5: `parseAnswer` murni (haiku)

**Files:** `lib/grading.ts`, `lib/grading.test.ts`.

**Produces:**
```ts
export type StoredAnswer = { optionId: string } | { value: boolean } | { optionIds: string[] } | { text: string };
export function parseAnswer(q: { type: QuestionType; options: Option[] | null }, raw: unknown): { ok: true; answer: StoredAnswer | null } | Invalid;
```
- Memakai ulang skema jawaban yang sudah ada; ESSAY `{text}` ≤5.000 code point. Kosong → `answer: null`. Galat `fieldErrors.answer` dengan pesan baku (panjang singkat/uraian, selain itu "Jawaban tidak valid.").

- [ ] Test dulu: tiap tipe valid; `optionId` di luar opsi → invalid; `optionIds` kembar / di luar opsi → invalid; `[]` → `null`; teks `"   "` → `null`; singkat 201 code point → pesan singkat; uraian 5.001 → pesan uraian, 5.000 → ok; `{value:"true"}` → invalid; `raw = "a"`, `42`, `{optionId:"a", extra:1}` (ekstra dibuang dari hasil); `null` → `null`.
- [ ] `bun run test lib/grading.test.ts` hijau. Commit `feat(grading): parseAnswer`.

**Named risks:** hasil dibangun ulang (field ekstra tidak tersimpan); batas panjang diuji dengan jawaban yang selain panjangnya valid; TRUE_FALSE tanpa opsi tidak ikut cek opsi.

### Task 6: `lib/attempts.ts` inti (sonnet)

**Consumes:** T1, T3 (`lockQuiz`, `QuestionSnapshot`, `AnswerKeySnapshot`), T5, `gradeObjective`, `uniqueViolation`.

**Produces:**
```ts
export const GRACE_MS = 60_000;
export type AttemptQuestion = { id: string; number: number; type: QuestionType; prompt: string; options: Option[] | null; images: ImageView[]; answer: StoredAnswer | null };
export type AttemptView =
  | { status: "IN_PROGRESS"; attemptId: string; quizId: string; quizTitle: string; deadlineAt: string; serverNow: string; questions: AttemptQuestion[] }
  | { status: "SUBMITTED"; attemptId: string; quizId: string; quizTitle: string };
type StartError = "ATTEMPT_LIMIT" | "REMEDIAL_NOT_AVAILABLE";
export async function startAttempt(student: { id: string; classId: string | null }, quizId: string, now?: Date): Promise<{ ok: true; attemptId: string } | NotFound | { ok: false; error: StartError }>;
export async function getAttemptView(studentId: string, where: { attemptId: string } | { quizId: string }, now?: Date): Promise<AttemptView | null>;
export async function saveAnswer(studentId: string, attemptId: string, input: unknown, now?: Date): Promise<{ ok: true; savedAt: Date } | Invalid | NotFound | { ok: false; error: "DEADLINE_PASSED" | "ATTEMPT_CLOSED" }>;
export async function submitAttempt(studentId: string, quizId: string, attemptId: string, now?: Date): Promise<{ ok: true; reason: SubmitReason } | NotFound>;
export async function finalizeExpiredAttempts(filter: { quizId?: string; studentId?: string }, now?: Date): Promise<number>;
```
- `startAttempt` mengikuti F07 "Mulai" langkah 1–6 dengan D2, D3, D4, D13: finalize dulu (luar tx), lalu tx { `lockQuiz(SHARE)`; quiz `PUBLISHED`, kelas siswa di `QuizClass`, `startsAt ≤ now`, `endsAt` null atau `now < endsAt`, kalau tidak → `NOT_FOUND`; `IN_PROGRESS` ada → kembalikan; pengganti tertunda (diganti, belum ada yang `replacesAttemptId`-nya) → buat dengan `slot` warisan; `used` = attempt dengan `replacementGrantedAt` null; batas; remedial; buat `attemptNumber = total+1`, `slot = used+1`, `deadlineAt = min(now + durasi, endsAt)`, `maxPoints = Σ points` }.
- `getAttemptView`: finalize siswa+quiz dulu; `{quizId}` → attempt `IN_PROGRESS` siswa itu, kalau tidak ada → `null`; `{attemptId}` bukan milik siswa → `null`. Soal dari `questionSnapshot` dalam urutan `questionOrder`, opsi diurutkan `optionOrder`, `id = quizQuestionId`, `number` 1..n. Objek dibangun ulang field per field.
- `saveAnswer`: input `{ quizQuestionId: string; answer: unknown }`. Urutan cek: milik siswa (404) → `SUBMITTED` (`ATTEMPT_CLOSED`) → `now ≥ deadlineAt + GRACE` (finalize, `DEADLINE_PASSED`) → `quizQuestionId` milik quiz attempt (404) → `parseAnswer` (400) → tx { `updateMany({where:{id, status:IN_PROGRESS, deadlineAt:{gt: now-GRACE}}, data:{updatedAt: now}})`; 0 baris → `ATTEMPT_CLOSED`; upsert `(attemptId, quizQuestionId)` dengan `savedAt=now` }.
- `submitAttempt`: attempt milik siswa dan `quizId` cocok (404); tx { `updateMany` bersyarat `IN_PROGRESS` + `deadlineAt > now-GRACE` → `SUBMITTED/MANUAL`, `submittedAt=now`; 1 baris → nilai (D1) }; 0 baris → finalize lalu kembalikan `submitReason` tersimpan.
- `finalizeExpiredAttempts`: kandidat `IN_PROGRESS` + `deadlineAt ≤ now-GRACE`; per attempt tx { `updateMany` bersyarat → `SUBMITTED/TIMEOUT`, `submittedAt=deadlineAt`; 1 baris → nilai }. Mengembalikan jumlah yang difinalisasi.
- Penilaian (privat `gradeAttempt(tx, attemptId)`): per jawaban objektif `objectivePoints = gradeObjective({type, answerKey}, answer, points)`, ESSAY → `null`; `objectiveScore = Σ`; `gradingStatus` D1.

- [ ] Test dulu (`lib/attempts.test.ts`, `t0` tetap): start → `deadlineAt = t0 + durasi`; dengan `endsAt` lebih awal → `deadlineAt = endsAt`; "two concurrent starts" `Promise.all` → id sama, 1 baris; start ke-2 setelah submit dengan `maxAttempts=1` → `ATTEMPT_LIMIT` (§15 #3); timeout dihitung dalam jatah; siswa kelas lain / quiz DRAFT / sebelum `startsAt` / setelah `endsAt` → `NOT_FOUND`; REMEDIAL `maxAttempts=2` setelah attempt 1 → `REMEDIAL_NOT_AVAILABLE`; HIGHEST → boleh; "start vs unpublish race" `Promise.all([startAttempt, unpublishQuiz])` diulang 10× → tidak pernah (attempt ada ∧ quiz DRAFT); "extend endsAt keeps running deadline"; acak: `shuffleQuestions` → `questionOrder` permutasi dari semua id, view dua kali → urutan sama (refresh); saklar mati → urutan `position`; autosave `t0+durasi+30s` diterima, `+61s` → `DEADLINE_PASSED` dan jawaban tetap nilai lama (§9.7); "saved answers come back": simpan lalu `getAttemptView({quizId})` → `answer` sama (§9.2); "forged answers" (Review Focus 1) → 400/404, 0 baris; upsert berulang → 1 baris; submit 3× → 1 hasil, `reason` sama, skor sama; `Promise.all([submit, finalize])` setelah lewat deadline+grace → satu status konsisten; submit setelah grace → `{ok:true, reason:"TIMEOUT"}`, `submittedAt = deadlineAt`; "expired locked by server time" (§15 #4): view pada `deadline+61s` → `SUBMITTED`; penilaian: SINGLE_CHOICE benar → poin penuh, kosong → 0, ulangan dengan ESSAY → `PENDING_MANUAL_GRADING`, tanpa → `FINAL`; "grading reads snapshot": setelah terbit ubah kunci di bank, jawaban kunci lama tetap benar; "no key leak": `JSON.stringify(view)` tidak memuat teks kunci singkat unik, pembahasan, rubrik, `questionId` bank, `"points"`, `storageKey`.
- [ ] `bun run test lib/attempts.test.ts` hijau. Commit `feat(attempts): start, autosave, submit, finalize`.

**Named risks:** P2002 dalam tx interaktif membatalkan tx (tangkap di luar); semua kondisi waktu memakai `now` argumen, tidak ada `new Date()` tersembunyi selain default; `optionOrder[qqId]` dibaca dengan `Object.hasOwn`; autosave tidak bisa menulis setelah submit (guard `updateMany` di tx yang sama); view tidak memuat field selain `AttemptView`.

### Task 7 + Task 8 (satu dispatch): Pengganti, daftar, akses gambar siswa (sonnet)

**Produces (`lib/attempts.ts`):**
```ts
export type StudentQuizState = "AVAILABLE" | "SCHEDULED" | "IN_PROGRESS" | "REPLACEMENT" | "DONE" | "CLOSED";
export type StudentQuizRow = { quizId: string; title: string; instructions: string | null; subjectName: string; durationMinutes: number; questionCount: number; startsAt: Date | null; endsAt: Date | null; remainingAttempts: number; state: StudentQuizState; hasAttempts: boolean };
export async function listStudentQuizzes(student: { id: string; classId: string | null }, now?: Date): Promise<StudentQuizRow[]>;
export type AttemptRow = { attemptId: string; studentName: string; className: string; attemptNumber: number; slot: number; status: AttemptStatus; submitReason: SubmitReason | null; replaced: boolean; startedAt: Date; submittedAt: Date | null };
export async function listQuizAttempts(quizId: string, now?: Date): Promise<AttemptRow[]>;
export async function grantReplacement(actorId: string, attemptId: string, reason: unknown, now?: Date): Promise<{ ok: true } | Invalid | NotFound | { ok: false; error: "ALREADY_REPLACED" }>;
```
**Produces (`lib/images.ts`):** `imageRedirectTarget(user: SessionUser, id: string, now?: Date): Promise<string | null>` — guru: semua (termasuk `deletedAt`); siswa: gambar materi `PUBLISHED` (aturan lama) **atau** ada `QuizQuestionImage {imageId, visibility: QUESTION}` yang quiz-nya punya attempt siswa ini `IN_PROGRESS`, `replacementGrantedAt` null, `deadlineAt > now - GRACE_MS`. `canStudentViewImage` tetap untuk cabang materi.
- `listStudentQuizzes`: finalize siswa dulu; quiz `PUBLISHED` dengan kelas siswa; urutan state: `IN_PROGRESS` > `REPLACEMENT` > `SCHEDULED` (now < startsAt) > `CLOSED` (endsAt ≤ now) > `DONE` (jatah habis atau remedial terkunci D2) > `AVAILABLE`. Tidak memuat kode kelas, poin, skor.
- `grantReplacement`: alasan trim 5–300 (`fieldErrors.reason`); tx { `updateMany` bersyarat `replacementGrantedAt: null` → isi granted*; 0 baris → `ALREADY_REPLACED`/404; bila masih `IN_PROGRESS` → `SUBMITTED/REPLACED` tanpa penilaian; audit `ATTEMPT_REPLACEMENT_GRANTED {attemptId, reason}` }.

- [ ] Test dulu: "replacement with maxAttempts=1": attempt 1 submit → grant → start → attempt baru `slot=1`, `replacesAttemptId` = lama, deadline penuh dibatasi `endsAt`; jatah setelah itu → `ATTEMPT_LIMIT`; pengganti bisa diganti lagi; grant ganda → `ALREADY_REPLACED`; "replacement closes a live attempt" (Review Focus 2): grant saat `IN_PROGRESS` → `saveAnswer` berikutnya `ATTEMPT_CLOSED`, jawaban tak berubah, `objectiveScore` null; REMEDIAL: pengganti tidak butuh rilis; alasan `"abc"`/301 huruf → galat; 1 audit. `listStudentQuizzes`: tiap state; kelas lain tidak muncul; `JSON.stringify` tanpa kode kelas. `listQuizAttempts`: memfinalisasi yang kedaluwarsa. Gambar (`lib/images.test.ts`): siswa 404 sebelum mulai; 302 saat `IN_PROGRESS`; 404 setelah submit (sebelum rilis); 404 setelah `deadline+61s` tanpa submit; `EXPLANATION` → selalu 404 (§15 #14); siswa ulangan lain 404; gambar `deletedAt` yang dibekukan → tetap 302 untuk attempt aktif; attempt yang diganti → 404; guru → 302.
- [ ] `bun run test lib/attempts.test.ts lib/images.test.ts` hijau. Commit `feat(attempts): replacement, lists, student image access`.

**Named risks:** "attempt yang dihitung" = `replacementGrantedAt` null di semua tempat (start, daftar, sisa percobaan); grant yang bersamaan dengan submit → satu status konsisten; akses gambar tidak memakai `questionId` bank; tidak ada finalize di jalur gambar.

### Task 9: Route Handler siswa (sonnet)

**Files:** `app/api/quizzes/[quizId]/start/route.ts` (POST), `app/api/quizzes/[quizId]/submit/route.ts` (POST, body `{attemptId}`), `app/api/quiz-attempts/[attemptId]/route.ts` (GET), `app/api/quiz-attempts/[attemptId]/answers/route.ts` (PUT), `app/api/quiz-attempts/routes.test.ts`.

**Consumes:** T6, T7. Pola `app/api/images/route.ts` (`json`, `fail`, `sameOrigin`). POST/PUT: `sameOrigin` → `requireStudent()` → body. GET: `requireStudent()` (tanpa cek Origin). Pemetaan galat D22 + pesan baku; start ok → `{ok:true, attemptId}`; PUT ok → `{ok:true, savedAt}`; GET → `AttemptView` atau 404; submit ok → `{ok:true, reason}`.

- [ ] Test dulu (`routes.test.ts`, `tests/next-mocks.ts`): tiap route dengan sesi guru → 403, tanpa sesi → redirect `/login`; POST/PUT `Origin: https://evil.test` → 403 tanpa menulis; body bukan JSON → 400; start 2× → `attemptId` sama; PUT `+30s` → 200, `+61s` → 409 `DEADLINE_PASSED`; submit `attemptId` milik quiz lain → 404; "no leak": gabungan `JSON.stringify` semua body respons satu skenario lengkap tidak memuat teks kunci unik, pembahasan, `"points"`, `"maxPoints"`, `questionId` bank, kode kelas, `storageKey`; setiap respons `Cache-Control: no-store`.
- [ ] `bun run test app/api/quiz-attempts` hijau. Commit `feat(attempts): student route handlers`.

**Named risks:** `forbidden()` dari `requireStudent` menjadi 403 di Route Handler; GET tidak ter-prerender (membaca cookie → dinamis; dicek di output `bun run build` bertanda ƒ); handler memakai `now` default (tidak menerima waktu dari klien); 500 mentah untuk body aneh.

### Task 10: Halaman siswa + autosave (sonnet)

**Files:** `app/(student)/student/quizzes/{page.tsx,start-button.tsx}`, `quizzes/[quizId]/attempt/{page.tsx,attempt-client.tsx,save-queue.ts,save-queue.test.ts}`, `app/(student)/student/page.tsx` (kartu "Ulangan").

**Produces (`save-queue.ts`, murni, tanpa React):**
```ts
export type SaveStatus = { kind: "idle" } | { kind: "saving" } | { kind: "saved"; at: Date } | { kind: "error" } | { kind: "closed"; error: "DEADLINE_PASSED" | "ATTEMPT_CLOSED" };
export function createSaveQueue(opts: { send: (qqId: string, answer: unknown) => Promise<Response>; onStatus: (s: SaveStatus) => void; sleep?: (ms: number) => Promise<void> }): { set(qqId: string, answer: unknown): void; flush(): Promise<void>; pending(): boolean };
export function remainingMs(deadlineAt: string, serverNow: string, receivedAt: number, now: number): number;
```
- Daftar: kartu `StudentQuizRow` + info + petunjuk (`Markdown`), tombol `StartButton` (POST start → `router.push(/student/quizzes/{quizId}/attempt)`; 409 → pesan baku), label unik "Mulai {judul}".
- Attempt page (RSC, params dalam `<Suspense>`): `getAttemptView(user.id, {quizId})`; `null` → pesan "Tidak ada ulangan…" + link; prompt/opsi dirender `Markdown` di server dan dioper sebagai `ReactNode` (D18). Klien: satu soal per layar, nav nomor (aria sudah/belum), radio/checkbox/`Benar`/`Salah`/input/textarea, `createSaveQueue` (D11), timer `remainingMs` tiap 1 s dengan ikon + teks + peringatan 5/1 menit, di 0 → `flush()` lalu POST submit; konfirmasi kumpul dengan jumlah belum dijawab; `closed`/submit ok → layar selesai; `visibilitychange`/`online` → GET resync `serverNow`/status.

- [ ] Test dulu (`save-queue.test.ts`, `vi.useFakeTimers` aman di sini): dua `set` cepat untuk soal sama saat request pertama berjalan → tepat 2 `send`, yang kedua membawa nilai terakhir (bukan 3); respons 500 → retry 1s, 2s, 4s, 8s, lalu tetap 10s; 409 `DEADLINE_PASSED` → status `closed`, tidak retry; `pending()` true selama antre; `remainingMs` dengan jam klien +2 jam → sama dengan jam benar (Review Focus 3); tidak pernah negatif.
- [ ] `bun run test app/(student)` + `bun run lint` + `bunx tsc --noEmit` hijau; cek manual 360 px di `bun dev` (keyboard: Tab ke opsi, Space pilih, nav nomor). Commit `feat(attempts): student pages and autosave`.

**Named risks:** `useEffect` cleanup timer/listener (React 19 strict mode memanggil dua kali); antrean tidak menimpa jawaban baru dengan respons lama; tombol kumpul tidak bisa terkirim dua kali; status hanya warna; props klien hanya dari `AttemptView`.

### Task 11: Pemantauan + percobaan pengganti (sonnet)

**Files:** `app/(teacher)/teacher/quizzes/[id]/{page.tsx,attempts-table.tsx}`, `quizzes/actions.ts`(+test).

**Consumes:** T7 `listQuizAttempts`, `grantReplacement`. **Produces:** `grantReplacementAction(attemptId, prev, fd)` (`reason`).
- Bagian "Pemantauan" (hanya bila `PUBLISHED`): tabel `AttemptRow` (label status baku, waktu `formatWita`), tombol "Beri percobaan pengganti" (label unik "… untuk {nama}, percobaan {n}") membuka dialog alasan; baris `replaced` → "Diganti", tanpa tombol.

- [ ] Test dulu: action dengan sesi siswa → 403; alasan kosong → `fieldErrors.reason` + `values` di-echo; sukses → pesan baku; attempt sudah diganti → "Percobaan ini sudah diganti.".
- [ ] `bun run test app/(teacher)/teacher/quizzes` hijau. Commit `feat(quizzes): monitoring and replacement`.

**Named risks:** `replacementReason` tidak pernah tampil ke siswa; halaman memfinalisasi sebelum render; dialog keyboard-friendly.

### Task 12: Dasbor, dokumen, verifikasi (haiku)

- [ ] Kartu "Ulangan" di dasbor guru (jumlah draf/terbit, link) dan siswa (jumlah `AVAILABLE`/`IN_PROGRESS`/`REPLACEMENT`, link). Update `CLAUDE.md` "Current state" (Tahap 4: model, modul, rute, D1 batas Tahap 5). Tidak ada env baru → `.env.example` tetap.
- [ ] `bun run lint`, `bunx tsc --noEmit`, `bun run test`, `bun run build` hijau (route API siswa bertanda dinamis). Commit `docs: Tahap 4 state`.

### Setelah semua task

`superpowers:verification-before-completion` → satu review akhir opus (keamanan + lensa ponytail, fokus Review Focus + Global Constraints) → satu fix wave → `superpowers:finishing-a-development-branch`. Lalu vault: hub (status Tahap 4, risiko terbuka: D19, remedial penuh di Tahap 5), F06 (D8, D10, D16, D17), F07 (D1, D3, D11, D18, D19, D22), F13 (`deletedAt` + akses siswa terbangun, D15), F12 (aksi audit D21). Tanpa log harian.

## Risiko & cara verifikasi

- **Konkurensi Prisma 7**: P2002 di tx interaktif membatalkan tx → ditangkap di luar dan baca ulang (T6 "two concurrent starts"). Unpublish vs start diserialisasi `FOR UPDATE`/`FOR SHARE` (T6 race test, diulang 10×). Submit vs finalize vs autosave diserialisasi lewat `updateMany` bersyarat pada baris attempt (T6).
- **Tanpa partial index**: tidak ada SQL manual di migrasi selain yang dibuat Prisma; constraint PRD cukup (D3). `bunx prisma migrate diff` bersih setelah T1.
- **Jam server vs klien**: server memakai `now` saja; klien `remainingMs` dengan offset `serverNow` (T10 unit). Jam DB tidak dipakai.
- **Route Handler no-store di bawah cacheComponents**: semua route membaca cookie sesi lebih dulu (dinamis) + header `Cache-Control: no-store`; `bun run build` menunjukkan route ƒ.
- **Autosave klien React 19**: logika antrean di modul murni teruji (`save-queue.ts`); komponen hanya merangkai. Cleanup efek diperiksa manual di dev (strict mode).
- **Ukuran transaksi publish**: satu `update` per `QuizQuestion` + `createMany` gambar; ulangan ±50 soal → ~55 query dalam satu tx, di bawah timeout default 5 s; bila lambat, set `timeout: 15_000` pada `$transaction` publish saja.

## Sengaja tidak dikerjakan (ponytail)

- Nilai 0–100, `finalScore`, penilaian uraian, rekap HIGHEST/REMEDIAL, syarat remedial berbasis nilai, rilis/unrelease, halaman hasil siswa, ekspor (Tahap 5).
- Pemantauan F11 lengkap (siswa belum mulai, progres, auto-refresh) (Tahap 5).
- Hapus ulangan draf, duplikat ulangan, `resultsReleasePolicy`/`resultsReleasedById` (selalu manual), cakupan bab tersimpan.
- Antrean offline localStorage, partial unique index, seed acak deterministik, `lib/time.ts`.
- E2E Playwright (Tahap 6).
