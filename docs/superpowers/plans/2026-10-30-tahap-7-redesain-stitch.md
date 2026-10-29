# Tahap 7 — Redesain dari Stitch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> Status: direncanakan di branch `tahap-7-redesain` (2026-10-30).

**Goal:** Seluruh UI Aksara memakai dunia visual Stitch "Ruang Kelas yang Hangat", tanpa mengubah perilaku domain atau invarian apa pun.

**Architecture:** Tidak ada model DB, query, atau action baru.
- Token warna di `app/globals.css` ditulis ulang dalam hex. Nama role tetap sama, sehingga semua halaman langsung ikut berubah tanpa disunting satu per satu.
- Primitif `components/ui/*` di-restyle, ditambah dua komponen bersama baru: `PageHeader` dan `StatCard`.
- Shell guru menjadi sidebar.
- Halaman di-restyle satu per satu berdasarkan PNG Stitch.
- Ada dua tambahan khusus klien: dialog kode kelas besar, dan tanda "ragu-ragu" di `localStorage`.

**Tech Stack:** Next.js 16.4.3 (cacheComponents), React 19.3, Tailwind v4, shadcn `base-maia` (Base UI), Hugeicons, `next/font/google` (Plus Jakarta Sans, JetBrains Mono), Vitest, Playwright.

**Spec:**
- `DESIGN.md` (token dan aturan visual, normatif);
- `PRODUCT.md`;
- mockup di `docs/stitch/*.png|html`;
- keputusan R1–R4 di bawah;
- Tahap 6: D1, D10, D11, D15, D17–D20 tetap berlaku.

## Context

Tahap 1–6 sudah ada di `main`. Fondasi Tahap 6 memakai aksen biru (D14), font Figtree, dan bar nav atas.

User membuat 26 layar Stitch (15 desktop + 11 mobile) yang memakai satu sistem: kanvas peach, oranye, kartu putih, dan sidebar guru. Mockup itu berisi data fiktif dan fitur yang tidak ada di PRD.

Mode ponytail full. Komponen yang dipakai ulang: `Status`, `ConfirmAction`, `FormField`, `components/ui/dialog`, `NavLinks`/`NavItems`, `StartButton`, `formatWita`, dan semua `lib/*` tanpa perubahan.

## Keputusan (user, 2026-10-30)

| # | Keputusan |
|---|---|
| R1 | Tampilan dan tata letak saja, ditambah dua tambahan murah di klien: (a) dialog "Tampilkan kode" di `/teacher/classes`, dengan kode kelas yang sudah ada di data halaman ditampilkan dalam huruf mono besar; (b) tanda "ragu-ragu" per soal di `localStorage`, yang tidak pernah dikirim ke server. Elemen fiktif dibuang (lihat Backlog). Data contoh mockup tidak boleh disalin. |
| R2 | Aksesibilitas menang atas mockup. Kontras teks ≥ 4.5:1, kontras border kontrol dan ring ≥ 3:1, teks terkecil 16 px. `#ff7034` (`accent-decor`) hanya untuk dekorasi. Tombol berisi memakai `primary` `#c2410c`. Menggantikan D14. |
| R3 | Halaman yang tidak punya layar Stitch diturunkan dari sistem lalu direview user: login siswa, beranda siswa, materi siswa, hasil siswa, penilaian uraian, pratinjau, dan `not-found`. |
| R4 | Ikon tetap Hugeicons. Nama Material Symbols di HTML Stitch dipetakan ke ikon Hugeicons terdekat. |
| R5 | Wordmark teks "Aksara" (belum ada logo), tanpa gambar placeholder. |
| R6 | Teks tombol dan link yang menjadi selektor e2e tidak diubah, kecuali e2e-nya diperbarui lebih dulu di task yang sama. |

## Global Constraints

- Authz, guard, action, route handler, dan `lib/*` tidak disentuh. Restyle hanya mengubah JSX dan className. Props data ke komponen klien siswa tidak bertambah (`toPublicQuestion` tetap menjadi satu-satunya bentuk soal untuk siswa).
- Warna diambil hanya dari token di `DESIGN.md` lewat kelas Tailwind (`bg-primary`, `text-primary-strong`, `bg-accent-decor`, `bg-success-soft`, …). Tidak boleh ada hex di JSX.
- Teks ≥ 16 px. Target ≥ 44 px (kontrol standar 48 px). Fokus terlihat. Tidak ada scroll samping di 360 px. Status ditampilkan sebagai ikon + teks (`Status`).
- Copy dalam Bahasa Indonesia, aturan copy siswa Tahap 6 tetap berlaku (≤ 10 kata, "kamu", tanpa "gagal" atau "merilis").
- `cn` tidak menggabungkan kelas yang bentrok, jadi taruh default yang bentrok di variant atau pakai `!`.
- Bun saja. `bunx tsc --noEmit`, `bun run lint`, `bun run test` hijau di setiap commit. `bun run build` dijalankan di akhir tiap area. Vitest dan E2E tidak boleh berjalan paralel.
- Sebelum mengubah simbol bersama, jalankan `graft callers <simbol> --depth all`.
- Muat `~/.claude/skills/impeccable/reference/craft-floor.md` sebelum task UI pertama. Pakai skill `shadcn` saat menyentuh `components/ui/*`.
- Untuk setiap halaman, baca PNG desktop dan `-mobile` dari Stitch beserta halaman yang sekarang, lalu tulis di pesan commit elemen mana yang dipakai dan mana yang dibuang.

## Review Focus

1. `localStorage` tidak tersedia atau melempar error (mode privat, data situs diblokir): halaman ulangan tetap jalan, dan tanda ragu hanya berlaku di memori (test di Task 13).
2. Nama siswa atau judul ulangan sangat panjang di sidebar, kartu, dan dialog pada 360 px: teks membungkus dan tidak meluber (seed nama panjang yang sudah ada; assert di Task 16).
3. Kode kelas dalam huruf mono besar di dialog pada 360 px tidak memicu scroll samping (assert di Task 7).
4. Fokus pada tombol oranye dan latar peach tetap terlihat (ring `primary` di atas `background` ≥ 3:1 di Task 1; cek fokus e2e di Task 16).
5. Header siswa tetap tersembunyi di halaman ulangan setelah shell berubah (alur `e2e/student.spec.ts` + assert di Task 14).

---

## A. Fondasi

### Task 0: Dokumen
- [ ] Commit `PRODUCT.md`, `DESIGN.md`, dan dokumen ini: `docs: Tahap 7 product, design system, plan`.

### Task 1: Token + font [TDD]
**Files:**
- Create: `app/design-tokens.test.ts`
- Modify: `app/globals.css`, `app/layout.tsx`

**Produces:**
- Kelas Tailwind baru: `primary-strong`, `primary-soft`, `accent-decor`.
- Nilai baru untuk role yang sudah ada sesuai frontmatter `DESIGN.md`.
- `font-sans` = Plus Jakarta Sans, `font-mono` = JetBrains Mono.
- Bayangan `shadow-card` dan `shadow-raised` (`--shadow-*` di `@theme`), nilainya dari `DESIGN.md` § Elevation.

- [ ] **Step 1: Tulis tes yang gagal.** `app/design-tokens.test.ts` membaca `app/globals.css` (`readFileSync`), mengambil `--name: #rrggbb` dari blok `:root`, lalu menghitung rasio WCAG (fungsi lokal ±10 baris).
  - `it("text pairs reach 4.5:1")` untuk pasangan: `foreground`/`background`, `foreground`/`card`, `muted-foreground`/`background`, `muted-foreground`/`card`, `muted-foreground`/`secondary`, `primary-foreground`/`primary`, `primary-strong`/`background`, `primary-strong`/`secondary`, `primary-strong`/`primary-soft`, `secondary-foreground`/`secondary`, serta `success|warning|info|destructive` masing-masing di atas `-soft`-nya dan di atas `card`, dan `primary-foreground`/`success` (tombol Rilis).
  - `it("control borders and ring reach 3:1")` untuk `input`/`card`, `input`/`background`, `ring`/`background`, `ring`/`card`.
  - `it("no text token below 1rem")`: setiap `--text-<name>:` (kecuali `--line-height`) bernilai ≥ 1rem.
  - `it("accent-decor is never a text color")`: mencari `text-accent-decor` di file `.tsx` di bawah `app/` dan `components/` (`readdirSync(dir, { recursive: true })`) harus kosong.
- [ ] **Step 2:** `bun run test app/design-tokens.test.ts` → FAIL, karena token masih oklch dan `primary-strong` belum ada.
- [ ] **Step 3: Implementasi.** Tulis ulang `:root` memakai hex dari frontmatter `DESIGN.md`:
  - `--secondary-foreground: #241f21`;
  - `--muted: var(--secondary)`;
  - `--accent: var(--secondary)`;
  - `--accent-foreground: var(--foreground)`;
  - `--popover: #ffffff`;
  - `--ring: var(--primary)`;
  - `--radius: 0.75rem`.

  Daftarkan `--color-primary-strong`, `--color-primary-soft`, `--color-accent-decor`, `--shadow-card`, `--shadow-raised` di `@theme inline`. Tambah `--text-4xl: 2.25rem` (line-height 1.2) dan `--text-metric: 3rem` (line-height 1.1). Hapus token `sidebar-*`/`chart-*` jika `graft grep "sidebar-"` dan `graft grep "chart-"` tidak menemukan pemakai. Di `app/layout.tsx`: `Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" })` dan `JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" })`. Di `@theme`: `--font-mono: var(--font-jetbrains-mono)`. Hapus import `Geist_Mono` dan `Figtree`.
- [ ] **Step 4:** test → PASS. `bun run lint && bunx tsc --noEmit`.
- [ ] **Step 5:** Commit `feat(ui): Stitch tokens, fonts, contrast test`.

### Task 2: Primitif
**Files:** Modify: `components/ui/button.tsx`, `badge.tsx`, `card.tsx`, `input.tsx`, `alert.tsx`, `dialog.tsx`, `alert-dialog.tsx`

**Produces** (nilai dari `DESIGN.md` § Components):
- `Button`:
  - base: `rounded-xl` (12 px), `font-semibold`;
  - variant `default` = `bg-primary text-primary-foreground shadow-card`, `secondary` = `bg-secondary text-primary-strong`, `outline` = `bg-card border-2 border-input`;
  - variant baru `success` = `bg-success text-primary-foreground`;
  - ukuran tidak berubah (`default` h-12).
- `Card`: `rounded-2xl bg-card shadow-card border border-border`, padding 24 px (16 px di bawah `sm`).
- `Input` (serta `<select>`/`<textarea>` inline yang menyalin kelasnya): `rounded-xl bg-card border-2 border-input`, fokus `border-primary ring-[3px] ring-ring/30`.
- `Badge`: bentuk pil, `-soft` + teks tone, `font-semibold`.
- `Dialog`/`AlertDialog`: `rounded-2xl shadow-raised`.

- [ ] Jalankan `graft callers buttonVariants --depth all`, lalu `graft grep "<select"` dan `graft grep "<textarea"`.
- [ ] Ubah varian, lalu jalankan `bun run test` (termasuk `question-view.test.ts` dan `material-view.test.ts`), lint, dan tsc.
- [ ] Screenshot `/teacher/login` dan `/teacher/classes` (desktop + 360 px). Commit `feat(ui): restyle primitives to Stitch`.

### Task 3: `PageHeader` + `StatCard` [TDD]
**Files:**
- Create: `components/page-header.tsx`, `components/stat-card.tsx`, `components/layout-parts.test.ts`

**Produces:**
- `export function PageHeader({ title, description, eyebrow, actions }: { title: string; description?: React.ReactNode; eyebrow?: string; actions?: React.ReactNode })`
  - merender satu `<h1>` (`text-2xl md:text-3xl font-bold`), eyebrow sebagai `<p>` berhuruf kapital, dan `actions` di kanan pada md+ (bertumpuk di HP).
- `export function StatCard({ label, value, hint, icon, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon: IconSvgElement; tone: "primary" | "info" | "success" | "warning" })`
  - `Card` berisi label (eyebrow `<p>`), `value` (`text-metric font-extrabold`, warna tone tua), `hint`, dan ikon di kotak `rounded-full bg-<tone>-soft` dengan `aria-hidden="true"`.
  - Tidak memakai heading.

- [ ] **Step 1: Tes** (gaya `renderToStaticMarkup` dari `components/material-view.test.ts`):
  - `PageHeader` → `(html.match(/<h1/g) ?? []).length === 1`; `title` dan `description` ada di html; tanpa `actions` tidak ada wrapper kosong (`not.toContain('data-slot="page-actions"')`).
  - `StatCard` → mengandung `label` dan `value` sebagai teks; `<svg` memiliki `aria-hidden="true"`; tidak ada `<h`.
- [ ] **Step 2:** FAIL (modul belum ada). **Step 3:** implementasi. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(ui): PageHeader and StatCard`.

### Task 4: Shell
**Files:** Modify: `app/(teacher)/teacher/layout.tsx`, `app/(teacher)/teacher/nav-links.tsx`, `app/(student)/student/layout.tsx`, `app/(student)/student/student-header.tsx`, `components/logout-button.tsx` (bila perlu)

**Mengikuti:** `dasbor-guru.png` (sidebar) dan `dasbor-guru-mobile.png` (bar atas).

- Guru, md+:
  - `<aside>` sticky dengan lebar `w-72`, berisi wordmark "Aksara" + "SD/MI Kelas VI";
  - `<nav aria-label="Menu guru">` dengan urutan Dasbor, Kelas, Siswa, Mapel & Bab, Materi, Bank Soal, Ulangan, lalu Ganti Sandi + `LogoutButton` di bagian bawah;
  - item aktif (`aria-current="page"`, sudah ditangani `NavLinks`) memakai `bg-primary text-primary-foreground`;
  - `<main>` di kanan dengan `max-w-6xl`.
- Guru, HP: bar atas berisi wordmark dan `<details>` Menu yang sudah ada.
- Semua `Suspense` + fallback `NavItems` dipertahankan.
- Siswa: header di atas kanvas peach dengan wordmark dan link Beranda/Materi/Keluar. Logika `body:has([data-attempt-page])` di `app/globals.css` tidak diubah.

- [ ] Restyle. Pastikan label nav yang menjadi selektor e2e tidak berubah (`graft grep "getByRole" e2e`). Jika ada label yang diganti (misalnya "Mapel" → "Mapel & Bab"), perbarui e2e di commit yang sama.
- [ ] `bun run test`, lint, tsc, dan `bun run build`. Screenshot `/teacher` dan `/student` (1280 + 360). Commit `feat(ui): teacher sidebar shell, student header`.

## B. Halaman guru

Pola per task (dipakai oleh Task 5–12):
1. Buka PNG desktop + mobile dan file halaman.
2. Susun JSX dengan `PageHeader`, `Card`, `Status`, dan `StatCard`.
3. Action, guard, `searchParams`, dan `Suspense` tetap.
4. Jalankan test file terkait, lint, dan tsc.
5. Screenshot 1280 + 360, lalu commit `feat(ui): <halaman> Stitch layout`.

Satu commit per task.

### Task 5: Login guru + Ganti sandi
- `app/(auth)/teacher/login/*` mengikuti `masuk-guru*.png`: kartu terpusat di atas kanvas, wordmark, input username/sandi dengan tombol lihat sandi (yang sudah ada saja; jika belum ada, jangan ditambah), dan tombol "Masuk".
- `app/(teacher)/teacher/password/*` mengikuti `ganti-sandi*.png`. Panel "Pedoman keamanan" boleh dipakai hanya bila isinya sesuai aturan sandi yang benar-benar divalidasi di `actions.ts` (baca Zod-nya dulu). Jika tidak sesuai, panel dibuang.
- Test terkait: `app/(auth)/actions.test.ts`, `password/actions.test.ts`.

### Task 6: Dasbor guru
- `app/(teacher)/teacher/page.tsx` mengikuti `dasbor-guru*.png`:
  - banner sapaan (memakai nama guru dari sesi, tanpa foto);
  - `StatCard` × 3 dari hitungan yang sudah dimuat halaman (materi terbit, soal aktif, kelas/siswa aktif). Kartu yang datanya tidak ada dibuang;
  - "Perlu tindakan" sebagai kartu per `TeacherTask` dengan `Status` + tombol aksi (label yang sudah ada, sesuai R6);
  - panel samping "Akses cepat" (Buat ulangan, Tulis materi, Tambah soal) yang menaut ke rute `new`.
- Dibuang: pencarian, notifikasi, semester, kode sesi, kehadiran, dan tips.

### Task 7: Kelas (+ dialog kode) + Siswa [TDD e2e]
- `classes/*` mengikuti `kelola-kelas.png` / `kelola-kelas-siswa-mobile.png`. `students/*` mengikuti `kelola-siswa*.png`.
- Ganti kode, Keluarkan semua siswa (`revokeClassSessions`), dan Nonaktifkan tetap memakai action dan `ConfirmAction` yang ada.
- **Step 1: e2e merah.** Tambahkan ke `e2e/teacher.spec.ts`: `test("class code dialog")`
  - login, buka `/teacher/classes`, klik `getByRole("button", { name: "Tampilkan kode" }).first()`;
  - `expect(getByRole("dialog")).toContainText(<kode kelas seed>)`;
  - pada viewport 360, `scrollWidth <= 360` saat dialog terbuka;
  - `Escape` menutup dialog.
- **Step 2:** `bun run test:e2e -- -g "class code"` → FAIL.
- **Step 3:** `classes/class-code-dialog.tsx` (`"use client"`), `export function ClassCodeDialog({ name, code }: { name: string; code: string })`. Isinya `Dialog` dengan judul "Kode kelas {name}", kode dalam `font-mono font-extrabold` sebesar `clamp(3rem, 15vw, 8rem)` dengan `break-all`, dan satu tombol "Selesai". Data yang dipakai hanya dari baris kelas yang sudah dirender.
- **Step 4:** PASS. Jalankan juga `classes/actions.test.ts` dan `students/actions.test.ts`.

### Task 8: Mapel, Bab, Subbab
- `subjects/*` mengikuti `mapel-bab-subbab*.png`: kartu per mapel dengan daftar bab dan subbab bertingkat. Tombol naik/turun/ubah/hapus memakai action yang ada, berupa tombol ikon `size="icon"` dengan `aria-label`. Panel panduan dibuang.
- Test: `subjects/actions.test.ts`.

### Task 9: Materi (daftar, editor, panel gambar, pratinjau)
- `materials/page.tsx` mengikuti `daftar-materi*.png`: kelompok per bab, baris materi dengan `Status` (DRAFT/REVIEWED/PUBLISHED), dan filter yang memang sudah ada. Pagination tidak ditambah.
- `materials/new`, `materials/[id]`, dan `image-panel.tsx` mengikuti `editor-materi*.png`: dua kolom di md+ (form di kiri, panel status + gambar di kanan). Toolbar Markdown, "Kotak fakta", dan panel kuota dibuang.
- `materials/[id]/preview` diturunkan (R3): memakai `MaterialView` di dalam `Card`.
- Test: `materials/actions.test.ts`, `image-actions.test.ts`, `components/material-view.test.ts`.

### Task 10: Bank soal (daftar, editor, pratinjau)
- `questions/page.tsx` mengikuti `bank-soal*.png`: kartu soal dengan chip tipe, `Status`, dan filter yang sudah ada.
- Editor `questions/new|[id]` mengikuti `editor-soal*.png`: pemilih tipe sebagai kartu radio untuk 5 tipe dari `QuestionType`, opsi dan kunci jawaban, serta panel parameter.
- Dibuang: "Struktur capaian/kurikulum" jika field-nya tidak ada di model, dan toolbar.
- Test: `questions/actions.test.ts`, `components/question-view.test.ts`.

### Task 11: Ulangan (daftar + baru)
- `quizzes/page.tsx` dan `quizzes/new` mengikuti `daftar-penyusunan-ulangan*.png`: kartu per ulangan dengan `Status`, jadwal (`formatWita`), dan aksi yang sudah ada (Pantau, Hasil, Unduh Excel ke `/api/exports/[quizId]`).
- Dibuang: mode proyektor, analisis butir, dan "Parameter standar".
- Test: `quizzes/actions.test.ts`.

### Task 12: Detail ulangan, pemantauan, hasil, penilaian uraian [TB]
- `quizzes/[id]/*` mengikuti `detail-pemantauan-ulangan.png` dan `pemantauan-ulangan-mobile.png`:
  - tab atau seksi Pemantauan & Nilai, Soal & Kunci, Setelan;
  - ringkasan berupa `StatCard` × 4 dari `getQuizRecap` (belum mulai, mengerjakan, perlu dinilai, selesai) dengan hitungan dari baris `state` yang sudah ada;
  - `monitor-list.tsx` dan `auto-refresh.tsx` di-restyle tanpa mengubah logika;
  - "Rilis hasil" memakai `variant="success"`.
- Dibuang: "Tutup ulangan sekarang" dan "token ujian".
- `quizzes/[id]/attempts/[attemptId]` diturunkan (R3): kartu jawaban per soal dan form nilai uraian.
- Test: `quizzes/actions.test.ts`, `app/api/exports/route.test.ts`, `e2e/teacher.spec.ts`.

## C. Halaman siswa

### Task 13: `flag-store` [TDD]
**Files:** Create: `app/(student)/student/quizzes/[quizId]/attempt/flag-store.ts`, `flag-store.test.ts`

**Produces:**
- `export type FlagStorage = Pick<Storage, "getItem" | "setItem">`
- `export function readFlags(storage: FlagStorage | null, attemptId: string): Set<string>`
- `export function toggleFlag(storage: FlagStorage | null, attemptId: string, questionId: string): Set<string>`
- Kunci: `aksara:flags:${attemptId}`, isinya array JSON berisi questionId. Setiap akses storage dibungkus try/catch.

- [ ] **Step 1: Tes:**
  - `toggleFlag` dua kali → flag hilang lagi;
  - flag attempt A tidak terbaca di attempt B;
  - `storage = null` → `toggleFlag` tetap mengembalikan set yang benar;
  - storage yang `getItem`/`setItem`-nya melempar error → tidak melempar, `readFlags` mengembalikan set kosong;
  - JSON rusak di storage → `readFlags` mengembalikan set kosong.
- [ ] **Step 2:** FAIL. **Step 3:** implementasi. **Step 4:** PASS. **Step 5:** Commit `feat(attempt): local doubt flags`.

### Task 14: Halaman ulangan siswa [TB]
**Files:** Modify: `attempt/attempt-client.tsx`, `attempt/page.tsx` (hanya kelas CSS)

**Consumes:** `readFlags`, `toggleFlag`, `FlagStorage` dari Task 13.

- Restyle mengikuti `mengerjakan-ulangan.jpg` dan `mengerjakan-ulangan-mobile.png`:
  - bar atas berisi judul, timer dalam `font-mono` dengan ikon jam + teks sisa waktu (warna `warning-soft` saat ≤ 5 menit, mengikuti ambang yang sudah ada bila ada), dan status simpan (`SaveStatus` yang ada) + "Terjawab n/m";
  - grid nomor soal (`attempt-client.tsx:308`) berupa lingkaran 48 px. Terjawab: `bg-success` + centang + `aria-label` "Soal n, sudah dijawab". Aktif: `ring-accent-decor`. Ragu: ikon bendera + "ragu" dalam `aria-label`;
  - kartu soal dengan chip "Nomor n dari m" dan chip tipe;
  - opsi berupa baris besar dengan huruf A–D. Opsi terpilih: `bg-primary-soft border-primary` + teks "Jawaban kamu saat ini";
  - checkbox "Ragu-ragu dengan nomor ini?" memanggil `toggleFlag(safeLocalStorage(), attemptId, q.id)`. `safeLocalStorage` adalah fungsi lokal yang mengembalikan `null` bila akses melempar error;
  - bar bawah sticky di HP berisi Sebelumnya, Berikutnya, dan Kumpulkan.
- Dibuang: "Bantuan Gambar Pecahan" dan "Bantuan Guru / Kendala".
- Tidak menyentuh: `save-queue`, `remainingMs`, panggilan fetch, props dari `page.tsx`, dan `HideStudentHeader`.
- [ ] Tambahkan ke `e2e/student.spec.ts`: setelah menandai ragu dan `page.reload()`, checkbox ragu tetap tercentang. Juga `expect(page.locator("header")).toBeHidden()` di halaman attempt.
- [ ] Jalankan `save-queue.test.ts`, `app/api/quiz-attempts/routes.test.ts`, dan `bun run test:e2e -- -g student`. Commit `feat(ui): attempt page Stitch layout with doubt flags`.

### Task 15: Halaman siswa turunan (R3) [TB]
- `app/(auth)/login/*`: padanan `masuk-guru.png` dengan isian kode kelas + NIS/nama, copy anak.
- `student/page.tsx`: urutan D10 tetap. Kartu ulangan memakai `Status`, jadwal, dan `StartButton`. Materi per mapel ditampilkan sebagai kartu.
- `student/materials/**`: daftar per bab dalam kartu. Detail memakai `MaterialView` dengan lebar baca ±70ch.
- `student/quizzes/[quizId]/result`: `StatCard` untuk nilai, plus rincian dari `getStudentResult` (bentuk yang sudah ada saja; kunci hanya muncul bila `studentMaySeeKey`).
- `app/not-found.tsx` di-restyle.
- Test: `app/(auth)/actions.test.ts`, `e2e/student.spec.ts`.

## D. Uji, pengecekan, dokumen

### Task 16: Sapuan E2E 360 + 1280
**Files:** Modify: `e2e/mobile.spec.ts`

- [ ] Ekstrak `check()` agar menerima lebar viewport. Tambahkan `test.describe` untuk 1280×800 dengan daftar rute yang sama.
- [ ] Rute baru di kedua lebar: `/teacher/subjects`, `/teacher/materials`, `/teacher/materials/new`, `/teacher/questions`, `/teacher/questions/new`, `/teacher/quizzes`, `/teacher/password`, dan halaman attempt siswa (mulai dulu `s.studentQuiz`).
- [ ] Untuk setiap rute: `scrollWidth <= viewport`, target ≥ 44 px, dan fokus terlihat sampai aksi utama.
- [ ] Nama siswa panjang dari seed tampil tanpa meluber di `/teacher/students` (assert `scrollWidth`).
- [ ] `bun run test`, lalu `bun run test:e2e` → hijau. Commit `test(e2e): 360 and 1280 sweep for redesigned pages`.

### Task 17: Pengecekan desain
- [ ] `node ~/.claude/skills/impeccable/scripts/detect.mjs --json app components`, dijalankan sekali.
- [ ] Satu putaran screenshot (1280 + 360) untuk setiap rute, berdampingan dengan PNG Stitch-nya. Simpan di scratchpad untuk direview user (terutama halaman R3).
- [ ] Perbaiki semua temuan dalam satu batch, lalu jalankan maksimal satu putaran konfirmasi.
- [ ] `bun run build`, `bun run test`, `bun run test:e2e`. Commit `fix(ui): redesign polish pass`.

### Task 18: Dokumen
- [ ] `CLAUDE.md`: tambahkan paragraf Tahap 7 (token Stitch dalam hex dan tes kontras `app/design-tokens.test.ts`, `PageHeader`/`StatCard`, sidebar guru, `ClassCodeDialog`, `flag-store`, `DESIGN.md`/`PRODUCT.md` sebagai sumber visual). Ganti kalimat "blue `--primary`".
- [ ] Baris status di dokumen ini.
- [ ] Vault: catatan keputusan Tahap 7 di subfolder `Projects/Aksara/`, didaftarkan di `## Peta catatan` hub. Isinya tanpa log harian.
- [ ] Commit `docs: Tahap 7 state`.

**Review akhir:** `code-review` atas branch (opus, satu kali). Fokus: tidak ada data baru di payload siswa, guard tidak berubah, dan R2 dipatuhi.

## Model per peran

| Model | Task |
|---|---|
| haiku | 2, 5, 8, 9, 10, 11, 15 (bagian non-hasil), 16, 18 |
| sonnet | 1, 3, 4, 6, 7, 12, 13, 14, 15 (hasil siswa) |
| opus | review akhir |

## Backlog (tidak dikerjakan)

Pencarian global, notifikasi, tahun ajaran/semester, token sesi ujian, kehadiran, Bantuan Guru, analisis butir, toolbar Markdown, foto profil, tips mengajar, rilis ke orang tua, tutup ulangan lebih awal, dan pagination. Masing-masing perlu PRD atau model baru.
