# Tahap 6 — Dasbor (F11) + Perbaikan Desain UI/UX — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> Status: dibangun di branch `tahap-6-dasbor-desain` (2026-10-30). Vitest 604/1, E2E 4/4 (alur siswa, alur guru, sapuan 360 px + keyboard), lint/tsc/build bersih. Task 15–22 dikerjakan langsung oleh controller (dispatch subagent ditolak classifier auto mode); review akhir terpisah.

**Goal:** Dasbor guru menjawab "apa yang perlu saya lakukan sekarang?", dasbor siswa menampilkan ulangannya, pemantauan per siswa menurut F11, dan fondasi desain yang mudah dibaca diterapkan ke semua halaman.

**Architecture:** Tidak ada model DB baru.
- Satu modul query baru, `lib/dashboard.ts`.
- `getQuizRecap` diperluas dan menjadi sumber tunggal pemantauan + rekap.
- `listStudentQuizzes` mendapat `deadlineAt`.
- Fondasi desain: token di `app/globals.css` (skala huruf lewat override `--text-*`), komponen `components/ui/*` yang lebih besar, dan satu komponen `components/status.tsx` (ikon + teks).
- Playwright (Chromium) untuk alur dan sapuan 360 px.

**Tech Stack:** Next.js 16.4.3 (cacheComponents), React 19.3, Prisma 7.10.1, Tailwind v4, shadcn `base-maia` (Base UI), Hugeicons, Vitest + Docker Postgres, `@playwright/test` (baru).

**Spec:**
- PRD §4, §8, §14.
- Vault `Aksara F11 - Dasbor dan Pemantauan`, `Aksara F12` (a11y, strategi test).
- Keputusan D1–D20 di bawah.

## Context

Tahap 1–5 di `main`; UI fungsional-minimal. Audit 2026-10-29 (Chrome desktop 1280 px, jendela tersempit 500 px):

**Sistemik**
- Huruf 14 px, badge 12 px.
- Kolom isian tanpa garis tepi (~1,05:1).
- Cincin fokus samar.
- 404 Next berbahasa Inggris di layar hitam (siswa membuka hasil yang belum dirilis).
- Palet abu-abu tanpa ikon: aksi utama, berbahaya, dan biasa tampak sama.
- Checkbox 20×20.

**Guru**
- Dasbor hanya berisi tautan + "Draf: 0".
- Detail ulangan 2.371 px dengan Pemantauan/Hasil di paling bawah; "Rilis hasil" sama dengan "Unduh Excel".
- Pemantauan tanpa ringkasan/sisa waktu/terjawab/filter kelas; tabelnya menggulir ke samping di ponsel.
- Aksi berbahaya tidak dibedakan.
- Nav tanpa penanda halaman aktif.

**Siswa**
- Dasbor tanpa ulangan/"Lanjutkan".
- Tanpa header/nav.
- Istilah dewasa ("merilis hasil", "Sisa percobaan 0").

Mode ponytail full. Pakai ulang: `getQuizRecap`, `listStudentQuizzes`, `finalizeExpiredAttempts`, `retakeOpen`, `releaseResults`, `countMaterialsByStatus`, `countQuestionsByStatus`, `listPublishedTree`, `ConfirmAction`, `StartButton`, `formatWita`, `writeAudit`.

## Keputusan (grilling, 2026-10-29)

| # | Keputusan |
|---|---|
| D1 | Satu skala huruf besar untuk guru dan siswa: isi 18 px, terkecil 16 px, judul 28–32 px. Tanpa tombol pengatur. |
| D2 | Tenang + 1 aksen. Status selalu ikon Hugeicons + teks (hijau/kuning/merah/biru muda). Ikon di nav. Tanpa ilustrasi. |
| D3 | Hanya tema terang. Teks isi ≥ 7:1, batas kolom dan fokus ≥ 3:1. Blok `.dark` dihapus. |
| D4 | Nav guru = menu atas, ikon + teks, `aria-current`. Di ponsel: `<details>` "Menu" (tanpa JS). |
| D5 | Dasbor guru = daftar "Perlu tindakan" (kalimat + tombol) + satu baris ringkas. Ketuntasan KKM tidak di dasbor. |
| D6 | Pemantauan `router.refresh()` tiap 30 detik, hanya saat tab terlihat dan ada attempt `IN_PROGRESS`. Ada tombol "Muat ulang" + "Diperbarui pukul …". |
| D7 | Detail ulangan diurutkan menurut status. Draf: Setelan → Kelas → Soal → "Terbitkan". Terbit: "Langkah berikutnya" → Pemantauan → Hasil, dengan Setelan/Kelas/Soal di `<details>`. |
| D8 | Pemantauan + rekap = satu daftar per siswa (termasuk yang belum mulai). Ringkasan per status, filter `?kelas=`, kartu di ponsel, `<details>` percobaan per siswa (Lihat jawaban, Beri pengganti). |
| D9 | "Masuk dari perangkat lain" (7 hari) = satu baris tugas di dasbor guru → `/teacher/students`. |
| D10 | Dasbor siswa = satu daftar berurut: "Lanjutkan" → bisa dikerjakan (pengganti, remedial "Kamu bisa mencoba lagi") → nilai sudah keluar → akan datang → materi per mapel. `/student/quizzes` → `redirect("/student")`. |
| D11 | Header siswa (Aksara, Beranda, Materi, Keluar) di semua halaman siswa kecuali `/attempt`. |
| D12 | Fondasi diterapkan ke semua halaman. Penataan ulang khusus: dasbor, detail ulangan/pemantauan, hasil siswa, login, kelas & siswa. |
| D13 | Playwright kecil: Chromium, 3 spesifikasi (siswa, guru, 360 px + keyboard). |
| D14 | Aksen biru tua `oklch(0.45 0.13 255)` (≈ #1f4e9c). |
| D15 | Skala lewat override `--text-*` di `@theme`, sehingga semua `text-sm`/`text-xs` yang ada ikut membesar tanpa diedit. |
| D16 | `app/not-found.tsx` berbahasa Indonesia. Hasil siswa null (tak dikenal **atau** belum dirilis) → satu pesan ramah yang sama, tanpa oracle. |
| D17 | Pesan `required` browser dan format `datetime-local` mengikuti bahasa browser, jadi tidak diubah. |
| D18 | Sisa waktu di dasbor siswa statis: "Waktu habis pukul 10.42", tanpa timer klien. |
| D19 | Tanpa ikon perangkat lain per baris pemantauan (cukup D9 + halaman Siswa). |
| D20 | E2E memakai `aksara_test` dan dijalankan **bergantian** dengan Vitest. Server: `next build && next start -p 3100`. |

## Global Constraints

- Authz server di setiap halaman/action: `requireTeacher()` / `requireStudent()` di dalam `<Suspense>`. Dasbor siswa tidak memuat data siswa lain.
- Kunci jawaban, pembahasan, rubrik, dan skor sebelum rilis tidak pernah masuk payload siswa.
- Semua teks UI berbahasa Indonesia. Status tidak bergantung pada warna saja (ikon + teks).
- Bisa dipakai dengan keyboard dan fokusnya terlihat. Target sentuh ≥ 44 px. Layout jalan di 360 px tanpa scroll samping.
- Teks guru: kalimat perintah yang menyebut objeknya ("Nilai 3 jawaban uraian"); keadaan kosong menyebut langkah berikutnya.
- Teks siswa: ≤ 10 kata, sapaan "kamu". Dilarang memakai "gagal", "tidak lulus", "Sisa percobaan 0" (pakai "Kamu sudah memakai semua kesempatan"), atau "merilis" (pakai "Nilaimu akan muncul setelah gurumu membagikannya").
- Bun saja. `bunx tsc --noEmit`, `bun run lint`, `bun run test` hijau di setiap commit; `bun run build` di akhir tiap area.
- Sebelum mengubah simbol bersama, jalankan `graft callers <simbol> --depth all`.

## Review Focus

1. Ulangan tanpa KKM (`kkm = null`): kolom ketuntasan menampilkan "—", bukan "Belum tuntas" (test di Task 8).
2. Siswa tanpa kelas (`classId = null`): dasbor menampilkan keadaan kosong, tidak crash (assert di Task 9).
3. Ulangan yang dikembalikan ke draf atau tanpa attempt tidak menghasilkan tugas apa pun (test di Task 7).
4. Siswa nonaktif: tidak dihitung di OTHER_DEVICE dan `activeStudents`, tetapi tetap tampil di pemantauan bila punya attempt (test di Task 7 dan 8).
5. Nama siswa/ulangan sangat panjang di 360 px membungkus dan tidak meluber (seed nama panjang di Task 19, assert di Task 20).

---

## A. Fondasi

### Task 0: Dokumen rencana
- [ ] Simpan dokumen ini, lalu commit `docs: Tahap 6 plan`.

### Task 1: Token, skala huruf, font
**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

**Produces:**
- Kelas Tailwind `bg-success`/`text-success`/`bg-success-soft`, dan pola yang sama untuk `warning`, `info`, `destructive` (+ `-soft`).
- Ukuran `text-xs`/`text-sm` = 16 px, `text-base` = 18 px.

- [ ] Di `:root` set:
  - `--primary: oklch(0.45 0.13 255)`, `--ring: var(--primary)`.
  - `--input: oklch(0.55 0 0)` dan `--border: oklch(0.85 0 0)`.
  - `--muted-foreground: oklch(0.40 0 0)`.
  - `--success: oklch(0.45 0.12 150)`, `--warning: oklch(0.50 0.12 70)`, `--info: var(--primary)`.
  - Tiap warna punya `-soft` dengan L ≈ 0.96.
- [ ] Petakan semua warna di `@theme inline`. Tambah:
  - `--text-xs: 1rem`, `--text-sm: 1rem`, `--text-base: 1.125rem`, `--text-lg: 1.25rem`, `--text-xl: 1.5rem`, `--text-2xl: 1.75rem`, `--text-3xl: 2rem`.
  - `--text-*--line-height` untuk masing-masing (1.5 untuk isi, 1.25 untuk judul).
- [ ] Hapus blok `.dark`. `body`: `text-base leading-relaxed`. Fokus global: `outline-ring`, `outline-offset-2`.
- [ ] `app/layout.tsx`: hapus `Geist` sans, pertahankan `Geist_Mono` (`font-mono` dipakai untuk kode kelas).
- [ ] Verifikasi kontras dengan skrip node di scratchpad (konversi oklch → sRGB → rasio WCAG). Syarat lolos:
  - teks `foreground` dan `muted-foreground` di atas putih ≥ 7:1;
  - `primary-foreground` di atas `primary` ≥ 7:1;
  - teks `success`/`warning`/`destructive` di atas `-soft`-nya ≥ 4.5:1;
  - `input` dan `ring` di atas putih ≥ 3:1.
- [ ] `bun run lint && bunx tsc --noEmit`. Screenshot `/login` + `/teacher` di Chrome. Commit `feat(ui): design tokens, type scale, accent`.

### Task 2: Kontrol dasar
**Files:**
- Modify: `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/badge.tsx`
- Modify: pemanggil `size="xs"` (1 tempat; cari dengan `graft grep 'size="xs"'`)
- Modify: `<select>`/`<textarea>` inline (cari dengan `graft grep "<select"` dan `graft grep "<textarea"`)

**Produces:**
- `Button`: ukuran `default` = `h-12 px-5 text-base`, `sm` = `h-11`, `lg` = `h-14 text-lg`; `xs` dihapus.
- `variant="destructive"` = latar `destructive` solid, teks putih.
- `outline` = `border-2 border-input`.
- `Input`/`select`/`textarea` = `h-12` (textarea `min-h-32`), `border-2 border-input bg-background`, fokus `ring-[3px] ring-ring`.
- `Badge` = varian `success|warning|info|destructive|secondary`, teks `text-sm`, `min-h-7`.

- [ ] Jalankan `graft callers buttonVariants --depth all` dan `graft callers Button --depth all`, lalu catat pemanggil yang memakai `size`.
- [ ] Ubah varian. Ganti `size="xs"` → `sm`. Samakan kelas `<select>`/`<textarea>` inline dengan `Input` (salin string kelasnya; tanpa komponen baru).
- [ ] `bun run test && bun run lint && bunx tsc --noEmit`. Cek `/teacher/classes`, `/teacher/questions`, `/login` di Chrome. Commit `feat(ui): larger controls, visible fields, focus ring`.

### Task 3: `components/status.tsx`
**Files:**
- Create: `components/status.tsx`
- Modify: label status di `app/(teacher)/teacher/materials/status-label.ts`, `questions/labels.ts`, `quizzes/labels.ts`, kartu kelas, kartu siswa, kartu ulangan siswa

**Produces:** `export function Status({ tone, children }: { tone: "success" | "warning" | "danger" | "info" | "neutral"; children: React.ReactNode })`.
- Isinya `Badge` dengan varian yang sesuai + ikon Hugeicons di depan teks.
- Pemetaan ikon: success → `CheckmarkCircle02Icon`, warning → `Alert02Icon`, danger → `CancelCircleIcon`, info → `InformationCircleIcon`, neutral → `Clock01Icon`.
- Ikon diberi `aria-hidden`; teks tetap terbaca.

- [ ] Buat komponen. Ganti setiap `<Badge>` status dengan `<Status>`. Tone per status:
  - materi: DRAFT neutral, REVIEWED info, PUBLISHED success;
  - soal: DRAFT neutral, ACTIVE success;
  - ulangan: DRAFT neutral, PUBLISHED success;
  - kelas/siswa: aktif success, nonaktif neutral.
- [ ] Lint/tsc/test. Commit `feat(ui): status with icon and text`.

### Task 4: 404 Indonesia + hasil belum ada [TB]
**Files:**
- Create: `app/not-found.tsx`
- Modify: `app/(student)/student/quizzes/[quizId]/result/page.tsx`
- Test: `lib/results.test.ts`

- [ ] Test (tambah ke `describe("getStudentResult")`):
```ts
it("unknown quiz and unreleased quiz are indistinguishable", async () => {
  const s = await setup({}, [{}]);
  await submitAttempt(s.student.id, s.quiz.id, await started(s), at(10));
  expect(await getStudentResult(s.student.id, s.quiz.id, at(20))).toBeNull();
  expect(await getStudentResult(s.student.id, "tidak-ada", at(20))).toBeNull();
});
```
- [ ] Jalankan `bun run test lib/results.test.ts -t "indistinguishable"`. Harus PASS (perilaku sudah benar; ini mengunci invariant).
- [ ] `app/not-found.tsx`:
  - judul "Halaman tidak ditemukan";
  - kalimat "Alamat ini tidak ada atau sudah dipindah.";
  - tombol "Kembali ke beranda" ke `/`, yang sudah mengalihkan sesuai peran.
- [ ] Halaman hasil: ganti `notFound()` dengan blok `<Status tone="info">Nilaimu belum keluar</Status>` + "Nilaimu akan muncul setelah gurumu membagikannya." + tombol "Kembali ke beranda" (`/student`).
- [ ] Commit `feat(ui): Indonesian not-found, friendly unreleased result`.

### Task 5: Nav guru
**Files:**
- Modify: `app/(teacher)/teacher/layout.tsx`
- Create: `app/(teacher)/teacher/nav-links.tsx` (`"use client"`)

**Produces:** `export function NavLinks()`.
- Isinya `NAV` (dipindah dari layout) + ikon Hugeicons per item: Dasbor `Home01Icon`, Kelas `UserGroupIcon`, Siswa `StudentIcon`, Mapel & Bab `BookOpen01Icon`, Materi `File01Icon`, Bank Soal `NoteEditIcon`, Ulangan `TaskDone01Icon`.
- Aktif bila `pathname === href || (href !== "/teacher" && pathname.startsWith(href + "/"))` → `aria-current="page"` + garis bawah tebal (`border-b-4 border-primary`).

- [ ] Layout:
  - Desktop (`md:` ke atas): baris tautan.
  - Di bawah `md`: `<details className="md:hidden"><summary>Menu</summary>` berisi tautan yang sama secara vertikal. `<summary>` setinggi `min-h-12`, ikon `Menu01Icon`.
  - `LogoutButton` tetap di kanan.
  - Layout tetap static shell (tanpa sesi).
- [ ] Cek di Chrome: Tab menelusuri menu, halaman aktif ditandai, lebar 500 px memakai `<details>`. Commit `feat(ui): teacher nav with icons and active page`.

### Task 6: Header siswa
**Files:**
- Create: `app/(student)/student/layout.tsx`, `app/(student)/student/student-header.tsx` (`"use client"`)
- Modify: halaman siswa yang punya tautan "Kembali ke beranda" / `LogoutButton` (cari dengan `graft grep "Kembali ke beranda"` di `app/(student)`)

**Produces:** `StudentHeader()`.
- Mengembalikan `null` bila `usePathname().endsWith("/attempt")`.
- Isi: "Aksara" (→ `/student`), "Beranda" (`Home01Icon`), "Materi" (`BookOpen01Icon`), `LogoutButton`.
- Muat dalam satu baris di 360 px (label pendek; `aria-current` seperti Task 5).

- [ ] Layout = header + `<main className="mx-auto w-full max-w-3xl flex-1 p-4">`. Hapus `<main>` ganda di halaman siswa.
- [ ] Commit `feat(ui): student header`.

## B. Query dasbor

### Task 7: `lib/dashboard.ts` — `getTeacherDashboard`
**Files:**
- Create: `lib/dashboard.ts`
- Test: `lib/dashboard.test.ts` (mock storage seperti `results.test.ts`, fixture `tests/quiz-setup.ts`)

**Produces:**
```ts
export type TeacherTask =
  | { kind: "RUNNING"; quizId: string; title: string; inProgress: number }
  | { kind: "GRADE"; quizId: string; title: string; essays: number }
  | { kind: "RELEASE"; quizId: string; title: string; students: number }
  | { kind: "OTHER_DEVICE"; students: number }
  | { kind: "REVIEWED_MATERIALS"; count: number };
export async function getTeacherDashboard(now?: Date): Promise<{
  tasks: TeacherTask[]; // urutan kind: RUNNING, GRADE, RELEASE, OTHER_DEVICE, REVIEWED_MATERIALS; dalam kind: judul asc
  counts: { materialsPublished: number; questionsActive: number; activeStudents: number };
}>;
```

- [ ] Tulis test yang gagal:
```ts
it("empty database → no tasks", async () => {
  expect((await getTeacherDashboard(at(0))).tasks).toEqual([]);
});
it("running attempt → RUNNING; past deadline + grace → not running but GRADE", async () => {
  const s = await setup({}, [{ type: "ESSAY" }]);
  await started(s);
  expect((await getTeacherDashboard(at(min(5)))).tasks).toEqual([
    { kind: "RUNNING", quizId: s.quiz.id, title: s.quiz.title, inProgress: 1 },
  ]);
  expect((await getTeacherDashboard(at(min(DUR) + GRACE_MS + 1))).tasks).toEqual([
    { kind: "GRADE", quizId: s.quiz.id, title: s.quiz.title, essays: 1 },
  ]);
});
it("RELEASE appears exactly when releaseResults would succeed", async () => {
  const s = await setup({}, [{}]);
  await submitAttempt(s.student.id, s.quiz.id, await started(s), at(10));
  const d = await getTeacherDashboard(at(20));
  expect(d.tasks).toEqual([{ kind: "RELEASE", quizId: s.quiz.id, title: s.quiz.title, students: 1 }]);
  expect(await releaseResults(s.teacher.id, s.quiz.id, at(30))).toEqual({ ok: true });
  expect((await getTeacherDashboard(at(40))).tasks).toEqual([]);
});
it("no RELEASE while an essay is ungraded or a replacement is unstarted", async () => { /* essay → only GRADE; grantReplacement → no RELEASE, releaseResults refuses */ });
it("replaced attempts' essays are not counted", async () => { /* grantReplacement on an essay attempt → GRADE absent */ });
it("draft quiz and quiz without attempts produce nothing", async () => { /* setup(..., publish=false) and published-but-untouched → tasks [] */ });
it("OTHER_DEVICE: distinct active students with STUDENT_SESSION_REPLACED in 7 days", async () => {
  // 2 audit rows for student A (1 and 2 days ago), 1 row for B 8 days ago, 1 row for inactive C 1 day ago
  // → { kind: "OTHER_DEVICE", students: 1 }
});
it("REVIEWED_MATERIALS counts REVIEWED only; counts block", async () => {
  // makeMaterial ×3: DRAFT, REVIEWED, PUBLISHED → task count 1; counts.materialsPublished 1
  // one ACTIVE + one DRAFT question → questionsActive 1; one inactive student → activeStudents excludes it
});
```
- [ ] `bun run test lib/dashboard.test.ts` → FAIL (modul belum ada).
- [ ] Implementasi:
  - `finalizeExpiredAttempts({}, now)` lebih dulu.
  - Ambil kuis `PUBLISHED` dengan attempt; hitung dengan `SCORED_SELECT` + `_count answers where UNGRADED`, sama seperti `getQuizRecap`.
  - Attempt **dihitung** = `SUBMITTED` dan `replacementGrantedAt == null`.
  - GRADE = Σ uraian belum dinilai pada attempt yang dihitung (berlaku juga untuk kuis yang sudah dirilis, karena remedial).
  - RELEASE = `resultsReleasedAt == null` ∧ tidak ada `IN_PROGRESS` ∧ GRADE 0 ∧ tidak ada pengganti tanpa `replacedBy` ∧ ≥ 1 attempt dihitung; `students` = jumlah siswa unik dengan attempt yang dihitung.
  - OTHER_DEVICE = `auditLog.groupBy({ by: ["targetId"] })` dengan `action: "STUDENT_SESSION_REPLACED"`, `createdAt ≥ now − 7 hari`, difilter ke siswa aktif. Baca `lib/students.ts:240-255` untuk bentuk kolomnya.
  - REVIEWED_MATERIALS dari `countMaterialsByStatus().REVIEWED`.
  - `questionsActive` dari `countQuestionsByStatus().ACTIVE`.
- [ ] `bun run test lib/dashboard.test.ts` → PASS. Lalu `bun run test`, lint, tsc. Commit `feat(dashboard): teacher task list query`.

### Task 8: `getQuizRecap` untuk pemantauan
**Files:**
- Modify: `lib/results.ts` (`RecapRow`, `getQuizRecap`)
- Test: `lib/results.test.ts`, `lib/export.test.ts` (harus tetap hijau tanpa diubah)

**Produces** — `RecapRow` mendapat:
```ts
state: "NOT_STARTED" | "IN_PROGRESS" | "WAITING_REPLACEMENT" | "NEEDS_GRADING" | "FINAL";
running: { deadlineAt: Date; answered: number; total: number } | null;
attempts: { attemptId: string; attemptNumber: number; status: AttemptStatus; replaced: boolean;
            score: number | null; pendingEssays: number; startedAt: Date; submittedAt: Date | null }[];
```
- `status: string` tetap ada, diturunkan dari `state` lewat `export const RECAP_STATE_LABEL` (teks lama, termasuk "Belum final – N uraian belum dinilai").
- `QuizRecap.quiz` mendapat `maxAttempts: number` dan `classes: { id: string; name: string }[]` (untuk "x/y" dan filter kelas).

- [ ] Test yang gagal:
```ts
it("monitoring fields: not started, running with answered count, expired is not running", async () => {
  const s = await setup({}, [{}, {}]);
  const idle = await makeStudent(s.cls.id);
  const id = await started(s, at(0));
  await saveAnswer(s.student.id, id, { quizQuestionId: s.qqs[0].id, answer: { optionId: "a" } }, at(1));
  const by = async (t: number) => new Map(((await getQuizRecap(s.quiz.id, at(t)))?.rows ?? []).map((r) => [r.studentId, r]));
  const now = await by(min(5));
  expect(now.get(idle.id)).toMatchObject({ state: "NOT_STARTED", running: null, attempts: [] });
  expect(now.get(s.student.id)).toMatchObject({ state: "IN_PROGRESS", running: { answered: 1, total: 2 } });
  const later = await by(min(DUR) + GRACE_MS + 1);
  expect(later.get(s.student.id)).toMatchObject({ state: "FINAL", running: null });
  expect(later.get(s.student.id)?.attempts).toHaveLength(1);
});
it("NEEDS_GRADING with an ungraded essay; kkm null → passed null", async () => { /* setup({ kkm: null }, [{ type: "ESSAY" }]) */ });
it("inactive student with an attempt still listed", async () => { /* setStudentActive(false) after submit → row present */ });
```
- [ ] Jalankan → FAIL. Implementasi:
  - `answered` = `_count` jawaban dengan `answer` bukan null (`{ not: Prisma.AnyNull }`; ganti bila Prisma menolak, test jadi penentu).
  - `total` = `_count` `quiz.questions`.
  - `attempts[].score` memakai `attemptScore` seperti `listQuizAttempts`.
- [ ] PASS. `bun run test` utuh, termasuk `lib/export.test.ts` yang tidak berubah. Commit `feat(results): monitoring fields on quiz recap`.

### Task 9: `listStudentQuizzes` + `deadlineAt` [TB]
**Files:**
- Modify: `lib/attempts.ts` (`StudentQuizRow`, `listStudentQuizzes`)
- Test: `lib/attempts.test.ts`

**Produces:** `StudentQuizRow.deadlineAt: Date | null`, terisi hanya dari attempt `IN_PROGRESS` milik siswa ini.

- [ ] Test yang gagal:
```ts
it("deadlineAt only for own running attempt; payload has no other student or secrets", async () => {
  const s = await setup({}, [{ type: "ESSAY" }]);
  const other = await makeStudent(s.cls.id, { displayName: "TEMAN-RAHASIA", nis: "777777" });
  await startAttempt({ id: other.id, classId: s.cls.id }, s.quiz.id, at(0));
  expect((await listStudentQuizzes(s.stu, at(1)))[0].deadlineAt).toBeNull();
  await started(s, at(2));
  const rows = await listStudentQuizzes(s.stu, at(3));
  expect(rows[0].deadlineAt).toEqual(at(2 + min(DUR)));
  const json = JSON.stringify(rows);
  for (const secret of ["TEMAN-RAHASIA", "777777", "RUBRIK-RAHASIA", "PEMBAHASAN-RAHASIA", "answerKey", "score"])
    expect(json).not.toContain(secret);
  expect(await listStudentQuizzes({ id: s.student.id, classId: null }, at(4))).toEqual([]);
});
```
(Sesuaikan argumen `makeStudent` dengan signature di `tests/factories.ts:25`.)
- [ ] FAIL → implementasi (`deadlineAt` ditambahkan ke select attempt) → PASS. Commit `feat(attempts): deadline on student quiz rows`.

## C. Dasbor guru

### Task 10: `app/(teacher)/teacher/page.tsx`
**Consumes:** `getTeacherDashboard` (Task 7), `Status`, `Button`.

- [ ] Tulis ulang halaman. Struktur:
  - `h1` "Halo, {displayName}".
  - `h2` "Perlu tindakan", dengan daftar `<li>`: ikon/`Status` + kalimat + tombol utama.
  - Bila `tasks` kosong: `<Status tone="success">Tidak ada yang perlu dikerjakan sekarang.</Status>`.
  - Baris ringkas: "{materialsPublished} materi terbit · {questionsActive} soal aktif · {activeStudents} siswa aktif".
  - Bila `activeStudents === 0`: kotak "Mulai dari sini": 1. Buat kelas → 2. Tambah siswa → 3. Tulis materi.

  Kalimat dan tujuan tombol per tugas:

  | kind | Kalimat | Tombol | Tujuan |
  |---|---|---|---|
  | RUNNING | "{title}: {n} siswa sedang mengerjakan" | "Pantau" | `/teacher/quizzes/{id}#pemantauan` |
  | GRADE | "{title}: {n} jawaban uraian belum dinilai" | "Nilai sekarang" | `#pemantauan` |
  | RELEASE | "{title}: semua sudah dinilai, siap dibagikan ke {n} siswa" | "Rilis hasil" | `#hasil` |
  | OTHER_DEVICE | "{n} siswa masuk dari perangkat lain minggu ini" | "Lihat siswa" | `/teacher/students` |
  | REVIEWED_MATERIALS | "{n} materi sudah ditinjau, belum diterbitkan" | "Lihat materi" | `/teacher/materials?status=REVIEWED` |

- [ ] Chrome: data "Uji coba Tahap 5" menampilkan RELEASE. Commit `feat(dashboard): teacher dashboard`.

## D. Dasbor siswa

### Task 11: `app/(student)/student/page.tsx` [TB]
**Files:**
- Modify: `app/(student)/student/page.tsx`
- Modify: `app/(student)/student/quizzes/page.tsx` (isi diganti `redirect("/student")`)

**Consumes:** `listStudentQuizzes` (Task 9), `listPublishedTree`, `StartButton` dari `./quizzes/start-button`, `formatWita`.

- [ ] Urutan:
  1. `IN_PROGRESS` → kartu besar "Lanjutkan ulangan" + "Waktu habis pukul {formatWita(deadlineAt, jam)}" + tombol "Lanjutkan" ke `/student/quizzes/{id}/attempt`.
  2. `AVAILABLE`/`REPLACEMENT` → kartu + `StartButton`. Bila `REPLACEMENT`: "Gurumu membukakan kesempatan baru untukmu". Bila `AVAILABLE && hasAttempts`: "Kamu bisa mencoba lagi".
  3. `resultsReleased` → "Nilaimu sudah keluar" + "Lihat nilai".
  4. `SCHEDULED` → "Mulai {tanggal, jam}".
  5. `DONE`/`CLOSED` tanpa rilis → "Nilaimu akan muncul setelah gurumu membagikannya".
  6. "Materi": satu tombol per mapel dari `listPublishedTree` → `/student/materials#{subjectId}`.
  - Bila tidak ada ulangan sama sekali: "Belum ada ulangan. Sambil menunggu, baca materi dulu."
- [ ] Hanya field `StudentQuizRow` + nama siswa sendiri yang dirender (Task 9 sudah menguji payload).
- [ ] Commit `feat(dashboard): student dashboard`.

## E. Pemantauan + detail ulangan

### Task 12: Detail ulangan diurutkan per status
**Files:** Modify: `app/(teacher)/teacher/quizzes/[id]/page.tsx`

**Consumes:** `getQuizRecap` (Task 8).

- [ ] **Bila DRAFT:** urutan Setelan → Kelas → Soal → tombol utama `lg` "Terbitkan ulangan" (action yang ada).
- [ ] **Bila PUBLISHED:**
  - `<section>` "Langkah berikutnya", dengan pesan pertama yang cocok:
    - ada `IN_PROGRESS` → "{n} siswa sedang mengerjakan.";
    - ada `NEEDS_GRADING` → "Nilai {n} jawaban uraian." (tautan ke baris pertama);
    - siap rilis → tombol utama "Rilis hasil";
    - sudah rilis → "Hasil sudah dibagikan." + "Batalkan rilis" (outline).
  - Lalu `id="pemantauan"` (Task 13), lalu `id="hasil"` (status rilis + "Unduh Excel" outline).
  - Lalu `<details>` "Lihat setelan ulangan" berisi Setelan/Kelas/Soal + "Kembalikan ke draf" (`ConfirmAction`, varian destructive).
- [ ] Commit `feat(quiz): status-ordered quiz page`.

### Task 13: Daftar pemantauan per siswa
**Files:**
- Create: `app/(teacher)/teacher/quizzes/[id]/monitor-list.tsx` (server component)
- Delete: `app/(teacher)/teacher/quizzes/[id]/attempts-table.tsx` (setelah isinya dipindah)
- Modify: `lib/attempts.ts` (hapus `listQuizAttempts` + `AttemptRow` bila `graft callers listQuizAttempts` hanya menunjuk halaman ini), `lib/attempts.test.ts` (pindahkan assert skor/pendingEssays ke Task 8 bila belum tercakup)

**Produces:** `MonitorList({ recap, quizId, classFilter }: { recap: QuizRecap; quizId: string; classFilter?: string })`.

- [ ] Isi `MonitorList`:
  - **Ringkasan:** jumlah per `state` sebagai deretan `Status` (Belum mulai neutral, Sedang mengerjakan info, Menunggu pengganti warning, Perlu dinilai warning, Selesai success).
  - **Filter kelas:** `<form method="get">` + `<select name="kelas">` (hanya bila > 1 kelas).
  - **Satu `<li>` per siswa**, berupa kartu di ponsel dan grid 5 kolom di `md:`:
    - nama + kelas + NIS;
    - `Status`: bila running, "Sedang mengerjakan · {answered}/{total} terjawab · selesai pukul {jam deadlineAt}";
    - "Percobaan {attemptsUsed}/{maxAttempts}";
    - nilai rekap (2 desimal, label "sementara" bila `!final`) + nilai asli bila REMEDIAL dibatasi;
    - ketuntasan: "Tuntas" success, "Belum tuntas" warning, "—" bila `kkm` null.
  - **`<details>` "Lihat percobaan"** per siswa: tiap attempt → "Lihat jawaban" (+ "Nilai uraian" bila `pendingEssays`) dan form pengganti yang sudah ada (dipindah dari `attempts-table.tsx`, logika action tidak diubah).
- [ ] Halaman membaca `searchParams.kelas` di dalam Suspense. Tabel rekap lama dihapus (D8).
- [ ] `bun run test`, lint, tsc. Commit `feat(quiz): per-student monitoring list`.

### Task 14: Auto-refresh
**Files:** Create: `app/(teacher)/teacher/quizzes/[id]/auto-refresh.tsx` (`"use client"`)

**Produces:** `AutoRefresh({ active, renderedAt }: { active: boolean; renderedAt: string })`.
- `useRouter().refresh()` tiap 30.000 ms via `setInterval`, hanya bila `active && document.visibilityState === "visible"`. Langsung refresh saat `visibilitychange` → visible.
- Tombol outline "Muat ulang" + teks "Diperbarui pukul {jam renderedAt}" (`aria-live="polite"`).

- [ ] Pasang di atas `MonitorList` dengan `active = rows.some(r => r.state === "IN_PROGRESS")`.
- [ ] Chrome: dua tab (guru + siswa mengerjakan); angka terjawab bertambah dalam ≤ 30 detik. Commit `feat(quiz): auto-refresh monitoring`.

## F. Halaman lain

### Task 15: Login
**Files:**
- Modify: `app/(auth)/login/page.tsx`, `student-login-form.tsx`
- Modify: `app/(auth)/teacher/login/page.tsx`, `teacher-login-form.tsx`

- [ ] Kartu `max-w-md`, judul `text-3xl`, label besar, tombol `lg` lebar penuh.
- [ ] Pesan error siswa: "Kode kelas atau nama belum cocok. Coba periksa lagi, ya."
- [ ] Tautan "Masuk sebagai guru" kecil di bawah.
- [ ] Pesan "Akunmu baru saja masuk dari perangkat lain…" memakai `Status tone="warning"`.
- [ ] Commit `feat(ui): login pages`.

### Task 16: Kelas & Siswa
**Files:**
- Modify: `app/(teacher)/teacher/classes/page.tsx`, `class-forms.tsx`
- Modify: `app/(teacher)/teacher/students/page.tsx`, `student-forms.tsx`

- [ ] Form tambah dipindah ke atas dengan judul `h2` "Tambah kelas" / "Tambah siswa".
- [ ] "Keluarkan semua siswa", "Nonaktifkan", "Keluarkan dari semua perangkat" memakai `variant="destructive"` di dalam `ConfirmAction` yang ada.
- [ ] Peringatan perangkat lain: `<Status tone="warning">Masuk dari perangkat lain {n}× minggu ini</Status>`.
- [ ] Keadaan kosong: "Belum ada kelas. Buat kelas pertama di atas."
- [ ] Commit `feat(ui): classes and students pages`.

### Task 17: Hasil siswa [TB]
**Files:** Modify: `app/(student)/student/quizzes/[quizId]/result/page.tsx`

**Consumes:** `getStudentResult` (tidak diubah).

- [ ] Nilai rekap `text-5xl` di atas.
- [ ] Ketuntasan:
  - `passed` → `Status success` "Kamu tuntas".
  - `passed === false` dan remedial masih bisa → `Status info` "Kamu bisa mencoba lagi".
  - `passed === false` lainnya → `Status neutral` "Belum mencapai KKM {kkm}".
  - `kkm` null → tidak ditampilkan.
- [ ] Per soal: "Benar"/"Belum tepat" dengan ikon (bukan warna saja). Kunci dan pembahasan hanya bila `showKey` (perilaku lama).
- [ ] `bun run test lib/results.test.ts` tetap hijau. Commit `feat(ui): student result page`.

### Task 18: Halaman lain ikut fondasi
**Files:**
- `app/(teacher)/teacher/materials/**`, `questions/**`, `subjects/**`
- `quizzes/quiz-forms.tsx`, `quizzes/page.tsx`, `quizzes/[id]/attempts/[attemptId]/**`
- `app/(student)/student/materials/**`, `app/(student)/student/quizzes/[quizId]/attempt/attempt-client.tsx`

- [ ] Checkbox: bungkus label dengan `flex min-h-11 items-center gap-3`, checkbox `size-6`.
- [ ] Bank soal: filter dilipat di `<details>` "Saring soal" (terbuka bila ada filter aktif).
- [ ] Keadaan kosong menyebut langkah berikutnya ("Belum ada soal. Tekan Soal baru untuk menambah.").
- [ ] Halaman ulangan siswa: pastikan pilihan jawaban `min-h-12`, timer teks + ikon (sudah ada), dan tombol "Kumpulkan jawaban" `lg`.
- [ ] Commit `feat(ui): apply foundation to remaining pages`.

## G. Uji browser

### Task 19: Playwright
**Files:**
- Create: `playwright.config.ts`, `e2e/global-setup.ts`, `e2e/fixtures.ts`
- Modify: `package.json`, `vitest.config.mts` (exclude `e2e/**`), `.gitignore`

- [ ] `bun add -d @playwright/test` (versi stabil terbaru), `bunx playwright install chromium`.
- [ ] Config:
  - `webServer.command`: `bun run build && bunx next start -p 3100`, dengan `env` `DATABASE_URL`/`DIRECT_URL` ke `aksara_test` (ambil dari `tests/test-db-url.mts`).
  - `use.baseURL`: `http://localhost:3100`. `workers: 1`. Proyek `chromium` saja.
- [ ] `global-setup.ts`:
  - tolak DB tanpa akhiran `_test`;
  - `prisma migrate deploy`, lalu `TRUNCATE` semua tabel (salin dari `tests/setup.ts`);
  - seed lewat `lib/*`: guru `e2e-guru` dengan sandi acak yang ditulis ke `e2e/.auth.json` (di-gitignore), kelas `VI-E2E`, siswa "Siswa Satu" dan "Siswa Dengan Nama Yang Sangat Panjang Sekali", 1 soal PG + 1 uraian ACTIVE, ulangan terbit tanpa jadwal.
- [ ] Bila `next start` gagal karena env R2: isi `R2_*` palsu di `env` webServer (tidak ada alur gambar di E2E).
- [ ] Script `"test:e2e": "playwright test"`. Commit `test(e2e): playwright setup`.

### Task 20: Spesifikasi E2E
**Files:** Create: `e2e/student.spec.ts`, `e2e/teacher.spec.ts`, `e2e/mobile.spec.ts`

- [ ] `student`:
  - login kode kelas + "Siswa Satu" → dasbor menampilkan kartu ulangan;
  - "Mulai" → pilih jawaban → isi uraian → "Kumpulkan jawaban";
  - kembali ke dasbor → teks "Nilaimu akan muncul setelah gurumu membagikannya".
- [ ] `teacher`:
  - login → dasbor berisi "jawaban uraian belum dinilai";
  - buka → nilai uraian → dasbor berisi "siap dibagikan" → "Rilis hasil";
  - siswa (konteks baru) melihat "Nilaimu sudah keluar".
- [ ] `mobile` (viewport 360×780, guru dan siswa), untuk `/login`, `/student`, `/student/materials`, hasil, `/teacher`, `/teacher/quizzes/{id}`, `/teacher/classes`, `/teacher/students`:
  - `scrollWidth <= 360`;
  - setiap `a,button,input,select,textarea,summary` yang terlihat punya tinggi ≥ 44;
  - `keyboard.press("Tab")` sampai aksi utama mendapat fokus dan `outline-style` ≠ `none`.
- [ ] `bun run test` lalu `bun run test:e2e` (berurutan) → hijau. Commit `test(e2e): flows and 360px sweep`.

### Task 21: Pengecekan desain
- [ ] `node ~/.claude/skills/impeccable/scripts/detect.mjs --json app components`, lalu satu putaran screenshot Chrome desktop (dasbor guru/siswa, detail ulangan, hasil). Perbaiki semua temuan dalam satu batch.
- [ ] `bun run build`, `bun run test`, `bun run test:e2e`. Commit `fix(ui): polish pass`.

## H. Dokumen

### Task 22: Status
- [ ] `CLAUDE.md`: paragraf Tahap 6 (`lib/dashboard.ts`, `components/status.tsx`, perluasan `getQuizRecap`, header siswa, `bun run test:e2e` + catatan "jangan paralel dengan Vitest").
- [ ] Baris status di dokumen ini.
- [ ] Vault: callout status hub, risiko terbuka hub, F11 `status: built`. Isi tidak memuat log harian.
- [ ] Commit `docs: Tahap 6 state`.

**Review akhir:** `ponytail:ponytail-review`, lalu `code-review` atas branch (opus, satu kali).

## Model per peran

| Model | Task |
|---|---|
| sonnet | 1–3 (fondasi), 7–9, 11, 17 ([TB]/query multi-modul), 13 |
| haiku | 0, 4–6, 10, 12, 14–16, 18–20, 22. Bila gagal 2× pada test yang sama → sonnet. |
| opus | hanya review akhir |

Boleh paralel: 4/5/6 setelah 1–3; 7/8/9; 15/16/18 setelah E. Task yang menyentuh file yang sama (12/13/14) berurutan.

## Verifikasi

1. `bun run test`, `bun run lint`, `bunx tsc --noEmit`, `bun run build`.
2. `bun run test:e2e` setelah Vitest selesai.
3. Chrome desktop (guru login manual):
   - dasbor sesuai data "Uji coba Tahap 5";
   - pemantauan memperbarui diri saat siswa mengerjakan di tab lain;
   - siswa melihat "Lanjutkan", lalu nilainya setelah rilis.
4. `graft grep "answerKey"` di `app/(student)` → tidak ada pemakaian baru.
