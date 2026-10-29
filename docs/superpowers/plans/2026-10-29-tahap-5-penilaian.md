# Tahap 5 — Penilaian, Rilis Hasil, Ekspor

> Status: dibangun di branch `tahap-5-penilaian` (2026-10-29). Belum diuji di browser.

## Context

Tahap 1–4 sudah di `main`. Attempt sudah dinilai objektif saat dikumpulkan (`objectiveScore`, `gradingStatus`),
tetapi belum ada skor 0–100, rekap HIGHEST/REMEDIAL, penilaian uraian, rilis hasil, halaman hasil siswa,
maupun ekspor Excel (PRD §7.6–7.9, vault F08/F09/F10/F13). Tahap 5 menutup alur guru 10–14 dan siswa 8–10.
Mode ponytail full: pakai ulang `lockQuiz`, `finalizeExpiredAttempts`, `writeAudit`, `parse`, `formatWita`,
`ConfirmAction`, `QuestionView`, `guarded`; tanpa opsi "untuk nanti".

## Keputusan (grilling, 2026-10-29)

| # | Keputusan |
|---|---|
| D1 | Skor 0–100 **dihitung saat dibaca**, tidak disimpan. Tidak ada `manualScore`/`finalScore`. `gradingStatus` tetap kolom. |
| D2 | Uraian tanpa jawaban: `gradeAttempt` membuat baris `AttemptAnswer` `answer=null` untuk setiap soal ESSAY yang belum punya baris. "Belum dinilai" = baris ESSAY dengan `manualPoints IS NULL`. |
| D3 | Guru menilai di `/teacher/quizzes/[id]/attempts/[attemptId]` (detail + form uraian). Tidak ada antrean per soal, tidak ada pohon `/teacher/results`. |
| D4 | Hasil siswa: satu halaman `/student/quizzes/[quizId]/result`, query selalu `studentId = sesi` (tanpa attemptId di URL). |
| D5 | HIGHEST: percobaan baru ditolak setelah hasil dirilis (`RESULTS_RELEASED`). |
| D6 | REMEDIAL: kunci, pembahasan, umpan balik, dan gambar EXPLANATION **ditahan** selama siswa itu masih bisa/sedang remedial. |
| D7 | Ekspor hanya per ulangan: `GET /api/exports/[quizId]` + tombol di `/teacher/quizzes/[id]`. Tanpa filter kelas/mapel, tanpa halaman `/teacher/exports`. |
| D8 | `grantReplacement` ditolak selama hasil dirilis (`RESULTS_RELEASED`, "Batalkan rilis dulu."). |
| D9 | Tabel rekap per siswa di `/teacher/quizzes/[id]`, dari fungsi yang sama dengan sheet `Rekap Nilai`. |
| D10 | `manualPoints` = `Decimal(5,2)`. `lib/scoring.ts` bekerja dalam **seperseratus poin (integer)**, jadi tidak ada galat float. Konversi Decimal→integer hanya di pemanggil DB (`d.mul(100).toNumber()`). |
| D11 | (saat implementasi) Rilis juga ditolak selama ada percobaan pengganti yang sudah diberikan tetapi belum dimulai. Tanpa ini, pengganti yang diberikan sebelum rilis bisa dimulai sesudah siswa melihat kunci, sehingga D8 bisa ditembus. |

## Skema (satu migrasi)

- `AttemptAnswer`: `manualPoints Decimal(5,2)?`, `teacherFeedback String?`, `gradedById String?` → `User` Restrict (relasi `"AnswerGradedBy"`), `gradedAt Timestamptz(3)?`, `@@index([gradedById])`.
- `Quiz`: `resultsReleasedById String?` → `User` Restrict (relasi `"QuizResultsReleasedBy"`).
- `lib/audit.ts` `AuditAction` + `MANUAL_SCORE_SET`, `RESULTS_RELEASED`, `RESULTS_UNRELEASED`, `EXPORT_DOWNLOADED`.
- `bun add exceljs@4.4.0`. Lalu `bunx prisma generate`.

## Interface modul

### `lib/scoring.ts` (baru, murni, tanpa Prisma)

```ts
export type ScoredAttempt = {
  slot: number; replaced: boolean;            // replaced = replacementGrantedAt != null
  status: AttemptStatus; gradingStatus: GradingStatus | null;
  maxPoints: number; earnedCenti: number;     // objectiveScore*100 + Σ manualPoints*100
};
export type ScoringQuiz = { scoringPolicy: ScoringPolicy; kkm: number | null; resultsReleasedAt: Date | null };

export function attemptScore(earnedCenti: number, maxPoints: number): number;   // round_half_up(earnedCenti*100/maxPoints)/100
export function computeRecap(attempts: ScoredAttempt[], quiz: ScoringQuiz): {
  primary: number | null; highest: number | null; recap: number | null;
  basis: ScoredAttempt | null;    // attempt dasar rekap (kolom "Poin diperoleh")
  final: boolean; passed: boolean | null;   // passed null bila kkm null
};
export function retakeOpen(attempts: ScoredAttempt[], quiz: ScoringQuiz): boolean;
```

- Hanya attempt `SUBMITTED` yang tidak diganti yang dihitung. `final` = semuanya `FINAL`. Skor dari attempt `PENDING` ikut sebagai nilai sementara (`final=false`).
- `retakeOpen` (attempt ke-2 dst., batas jatah dicek terpisah): HIGHEST → `!resultsReleasedAt` (D5); REMEDIAL → rilis ∧ semua yang dihitung FINAL ∧ utama < KKM ∧ tidak ada remedial ≥ KKM (PRD §7.6).
- Satu fungsi ini dipakai `startInTx`, `listStudentQuizzes`, proyeksi hasil (D6), dan gambar EXPLANATION.

### `lib/attempts.ts` (perluasan)

- `gradeAttempt`: tambah `createMany({ skipDuplicates })` baris `answer=null` untuk ESSAY yang belum ada (D2).
- `startInTx`: ganti cek remedial dengan `used >= 1 && !retakeOpen(...)` → `RESULTS_RELEASED` (HIGHEST) / `REMEDIAL_NOT_AVAILABLE` (REMEDIAL). Perlu memuat attempt siswa + skor. Pesan di `lib/attempt-http.ts` diperbarui.
- `listStudentQuizzes`: `locked` memakai `retakeOpen`; baris dapat `resultsReleased: boolean` (tautan "Lihat hasil").
- `grantReplacement`: tolak `RESULTS_RELEASED` bila kuis sudah dirilis (D8).
- `listQuizAttempts`: tambah `score: number | null`, `gradingStatus`, `pendingEssays` per baris.
- **Baru** `gradeEssay(actorId, answerId, input: unknown, now)` → `{ok:true} | Invalid | NotFound | {ok:false; error:"NOT_GRADABLE"}`:
  zod (`points` 0..`QuizQuestion.points`, ≤ 2 desimal, terima koma; `feedback` ≤ 2.000). Dalam satu transaksi: `SELECT … FOR UPDATE` baris attempt (serialisasi dua penilaian paralel), attempt harus `SUBMITTED` dan tidak diganti, soal harus ESSAY, update jawaban + `gradedById/gradedAt`, audit `MANUAL_SCORE_SET {attemptId, quizQuestionId, from, to}` bila poin berubah (tanpa isi umpan balik), lalu `gradingStatus` = `FINAL` bila tidak ada ESSAY `manualPoints IS NULL`, selain itu `PENDING_MANUAL_GRADING`.
- **Baru** `getAttemptForTeacher(quizId, attemptId)`: semua soal urut `position`, snapshot, kunci, jawaban, poin, umpan balik, skor, status, untuk halaman D3.
- Helper internal `toScored(row)` untuk mengubah baris Prisma → `ScoredAttempt` (dipakai juga oleh `lib/results.ts`, jadi diekspor).

### `lib/results.ts` (baru)

```ts
export async function releaseResults(actorId: string, quizId: string, now?: Date): Promise<{ok:true} | Invalid | NotFound>;
export async function unreleaseResults(actorId: string, quizId: string): Promise<{ok:true} | NotFound>;
export async function getQuizRecap(quizId: string, now?: Date): Promise<RecapRow[] | null>;
export async function getStudentResult(studentId: string, quizId: string, now?: Date): Promise<StudentResult | null>;
export async function studentMaySeeKey(studentId: string, quizId: string): Promise<boolean>;
```

- `releaseResults`: `finalizeExpiredAttempts` → tx `lockQuiz(UPDATE)` → hitung attempt `IN_PROGRESS`, uraian belum dinilai (attempt tidak diganti), dan pengganti yang belum dimulai (D11) → bila ada: `INVALID` "Hasil belum bisa dirilis: …" → sudah dirilis = `ok` tanpa audit (kunci `UPDATE` menserialkan klik ganda) → audit `RESULTS_RELEASED {attemptCount}`.
- `unreleaseResults`: kosongkan `resultsReleasedAt/ById` bila terisi, audit `RESULTS_UNRELEASED`.
- `getQuizRecap`: siswa aktif di kelas tujuan ∪ siswa yang punya attempt; per siswa: kelas, NIS, nama, attempt ter-skor, `computeRecap`, status (`Belum mulai`/`Sedang dikerjakan`/`Belum final – N uraian belum dinilai`/`Final`), waktu kumpul terakhir. Dipakai D9 dan sheet `Rekap Nilai`.
- `getStudentResult`: `null` (→ 404) bila belum dirilis atau tidak ada attempt terkumpul. Proyeksi tabel F09: skor, rekap, KKM, ketuntasan, label Utama/Remedial ke-n, jawaban sendiri, benar/salah + poin. Kunci, pembahasan, dan umpan balik hanya bila `showFeedbackAfterRelease` ∧ `studentMaySeeKey`. Attempt `PENDING` → "Nilai belum final" tanpa angka. Rubrik dan `verificationNote` tidak pernah dikirim.
- `studentMaySeeKey` = rilis ∧ `showFeedbackAfterRelease` ∧ tidak ada attempt berjalan ∧ ¬(`retakeOpen` ∧ jatah tersisa) (D6).

### `lib/images.ts` (perluasan `imageRedirectTarget`)

Kueri `frozen` menjadi OR: (a) seperti sekarang; (b) attempt `SUBMITTED`, `replacementGrantedAt null`, `quiz.resultsReleasedAt not null`. Tidak lagi difilter `visibility: QUESTION`; bila baris yang cocok hanya `EXPLANATION`, wajib (b) ∧ `studentMaySeeKey(user.id, quizId)`. Komentar F13 baris 160 di vault diperbarui.

### `lib/export.ts` (baru)

```ts
export async function buildQuizWorkbook(quizId: string, now?: Date): Promise<{ filename: string; data: ArrayBuffer; rowCount: number } | null>;
```

- `finalizeExpiredAttempts` lalu `getQuizRecap` → sheet `Rekap Nilai` (kolom minimum PRD §7.9; rekap **kosong** bila `!final`; WITA via `formatWita`). Sheet `Rincian Jawaban`: semua attempt (termasuk yang diganti, berlabel `Diganti: <alasan>` atau `Pengganti`), semua soal snapshot urut `position`, jawaban/kunci dibuat terbaca (teks opsi, `Benar`/`Salah`, `; `, `(kosong)`, `![..](aksara-image:id)` → `[gambar: alt]`), status `Otomatis` / `Menunggu penilaian guru` / `Dinilai guru`.
- `safeText()` internal: awalan `'` bila diawali `= + - @ \t \r`. Angka ditulis sebagai angka.
- Nama file `Nilai_<slug a-z0-9->_<yyyy-mm-dd>.xlsx`.
- Route `app/api/exports/[quizId]/route.ts` (GET, `export const runtime = "nodejs"` bila diperlukan Next 16, cek docs): `requireTeacher` → `guarded` → `writeAudit EXPORT_DOWNLOADED {quizId, rowCount}` → `Content-Disposition: attachment`, `Cache-Control: no-store`.

## UI

- `/teacher/quizzes/[id]/page.tsx`: tombol "Rilis Hasil" / "Batalkan Rilis" (`ConfirmAction`; peringatan bila `endsAt` belum lewat), tabel rekap per siswa (D9), link "Unduh Excel", `attempts-table.tsx` + kolom nilai (label "Sementara: N uraian belum dinilai") + link "Nilai".
- **Baru** `/teacher/quizzes/[id]/attempts/[attemptId]/page.tsx`: `QuestionView` per soal + kunci + poin. Form uraian (poin + umpan balik, tombol "Beri 0" untuk jawaban kosong). Action `gradeEssayAction`, `releaseResultsAction`, `unreleaseResultsAction` di `app/(teacher)/teacher/quizzes/actions.ts` (pola action yang ada: `requireTeacher`, `FormState`, `revalidatePath`).
- `/student/quizzes/page.tsx`: "Lihat hasil" bila dirilis, "Menunggu guru merilis hasil" bila belum.
- **Baru** `/student/quizzes/[quizId]/result/page.tsx`: `getStudentResult` → `notFound()` bila null. Teks anak kelas 6, status tidak bergantung warna.

## Test (TDD, Vitest + Docker Postgres)

- `lib/scoring.test.ts`: 36/40 → 90; 2/3 → 66.67; 5 baris contoh F08 (termasuk 60/68,88 → 75); ganti HIGHEST↔REMEDIAL dan KKM pada data yang sama; attempt diganti tidak dihitung; PENDING → `final=false`; `retakeOpen` setiap cabang.
- `lib/attempts.test.ts`: kumpul membuat baris ESSAY null; `gradeEssay` 0..poin, 2,5 diterima, 2,555 / −1 / poin+0,01 ditolak; attempt berjalan/diganti → `NOT_GRADABLE`; uraian terakhir → FINAL; ubah setelah FINAL → tetap FINAL, 1 audit per perubahan, metadata tanpa umpan balik; dua `gradeEssay` paralel pada attempt yang sama → status akhir FINAL; HIGHEST setelah rilis → `RESULTS_RELEASED`; gerbang remedial (utama ≥ KKM, remedial ≥ KKM, PENDING); `grantReplacement` saat dirilis → ditolak.
- `lib/results.test.ts`: rilis ditolak dengan pesan berisi jumlah; rilis ganda paralel → 1 audit; `resultsReleasedById` terisi; batal rilis → `getStudentResult` null; siswa B → null untuk hasil A; `JSON.stringify` proyeksi tanpa kunci/pembahasan/umpan balik saat saklar mati **dan** saat remedial terbuka (D6); rubrik tidak pernah muncul; KKM 75, 60/90 → asli 90, rekap 75, Tuntas.
- `lib/images.test.ts`: (b) QUESTION 302 setelah rilis, 404 setelah batal rilis; EXPLANATION 404 saat saklar mati / remedial terbuka, 302 bila boleh; attempt diganti → 404.
- `lib/export.test.ts`: buka buffer dengan ExcelJS, nama sheet dua; nama `=HYPERLINK("http://x")` → sel teks `'=HYPERLINK…`; PENDING → kolom rekap kosong; remedial 60/90 → rekap 75, tertinggi asli 90, `Tuntas`; siswa belum mulai muncul `Belum mulai`.
- Test action/route: siswa memanggil ekspor → 403, anonim → 401/redirect sesuai `requireTeacher`.

## Dokumen

- `CLAUDE.md`: paragraf state Tahap 5.
- `docs/superpowers/plans/2026-10-29-tahap-5-penilaian.md`: salinan rencana ini + tabel D1–D10.
- Vault: status di hub, catat D5/D6/D8 di tabel Keputusan, perbarui F13 baris 160 dan F08/F09/F10 bila berbeda (rute D3/D4, kolom tidak disimpan D1, ekspor D7).

## Verifikasi

1. `bun run db:up && bun run db:migrate && bunx prisma generate`
2. `bun run test` (semua hijau), `bun run lint`, `bunx tsc --noEmit`, `bun run build`
3. Manual `bun dev`: guru menerbitkan kuis dengan uraian → siswa mengerjakan → guru menilai → rilis (pertama ditolak saat ada uraian) → siswa melihat hasil → Unduh Excel, lalu buka di LibreOffice dan cek kedua sheet → batal rilis → hasil siswa 404.

Dilewati: antrean per soal, ekspor per mapel/kelas, kolom `Status akun` [Usulan F10], dasbor F11, Playwright.
