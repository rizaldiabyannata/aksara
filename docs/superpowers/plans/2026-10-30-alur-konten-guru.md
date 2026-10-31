# Alur Cepat Konten Guru Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guru membuat draf materi dari halaman PDF dan melanjutkan ke soal serta ulangan dari konteks bab yang sama.

**Architecture:** PDF dibaca hanya di Client Component memakai PDF.js. Form server yang ada tetap menjadi satu-satunya jalur simpan dan validasi. Tautan bab membawa ID bab ke formulir soal, materi, dan ulangan; operasi pemilihan soal dilakukan oleh domain ulangan.

**Tech Stack:** Next.js 16, React 19, Bun, Prisma 7, PDF.js, Vitest/Playwright.

**Spec:** `docs/superpowers/specs/2026-10-30-alur-konten-guru-design.md`

## Global Constraints

- Tidak ada AI berbayar, OCR, atau penyimpanan PDF asli di server.
- Materi hasil PDF tetap `DRAFT`, berisi teks yang dapat diedit; hak penggunaan teks diperiksa guru sebelum terbit.
- Pertahankan validasi, otorisasi, snapshot soal, dan batas materi 50.000 karakter.
- UI berbahasa Indonesia dan dapat dipakai dengan keyboard serta layar ponsel.

## Review Focus

- PDF tanpa teks: pesan kegagalan jelas dan tidak ada materi kosong yang tersimpan.
- Rentang halaman di luar jumlah halaman: ditolak sebelum ekstraksi.
- Teks di atas 50.000 karakter: minta rentang lebih pendek, jangan pangkas diam-diam.
- ID bab buatan pada URL: server tetap memvalidasi bab dan mata pelajaran.
- Pemilihan soal yang sudah ada atau berasal dari mapel lain: domain menolak tanpa membuat daftar parsial.

---

### Task 1: PDF menjadi draf materi

**Files:** `app/(teacher)/teacher/materials/new/page.tsx`, `app/(teacher)/teacher/materials/material-form.tsx`, `app/(teacher)/teacher/materials/pdf-import.tsx`, `app/(teacher)/teacher/subjects/page.tsx`, `package.json`, `bun.lock`, test PDF import.

**Interfaces:** PDF import mengembalikan `{ text: string; pages: string }` ke formulir materi. Form tetap mengirim field existing ke `createMaterialAction`.

- [x] Tambah tes ekstraksi teks/rentang dan kondisi kosong/batas panjang.
- [x] Jalankan tes dan pastikan gagal sebelum implementasi.
- [x] Tambahkan PDF.js dan UI pilih file/rentang halaman; ekstraksi di browser, pratinjau dapat diedit.
- [x] Isi awal bab, sumber, halaman, dan ringkasan dari konteks bab; data yang dikirim tetap melalui action existing.
- [x] Tambah tautan **Isi materi dari PDF** pada setiap bab; pastikan PDF tidak dikirim ke server.
- [x] Jalankan tes, lint, typecheck, dan build.

### Task 2: Bab ke soal

**Files:** `app/(teacher)/teacher/subjects/page.tsx`, `app/(teacher)/teacher/questions/new/page.tsx`, `app/(teacher)/teacher/questions/question-form.tsx`, tests halaman soal.

**Interfaces:** Query `chapterId` hanya menjadi default formulir; `createQuestion` tetap memvalidasi referensi. Potongan teks PDF, jika dipakai, hanya data sementara di browser.

- [x] Uji default bab dari URL lewat Chromium; ID yang tidak dikenal diabaikan oleh halaman dan tetap divalidasi oleh domain.
- [x] Tambahkan tautan **Buat soal** pada bab dan pertahankan `chapterId` saat guru memilih tipe soal.
- [x] Preselect bab di formulir dan tetap sediakan cara manual yang sudah ada.
- [x] Jalankan tes, lint, typecheck, dan build.

### Task 3: Bab ke ulangan dan pemilihan soal lebih ringkas

**Files:** `app/(teacher)/teacher/subjects/page.tsx`, `app/(teacher)/teacher/quizzes/new/page.tsx`, `app/(teacher)/teacher/quizzes/quiz-forms.tsx`, `app/(teacher)/teacher/quizzes/[id]/page.tsx`, `app/(teacher)/teacher/quizzes/actions.ts`, `lib/quizzes.ts`, domain/action tests.

**Interfaces:** Query `chapterId` preselect mapel dan bab. Domain menerima daftar ID soal aktif dari mapel ulangan, memasukkan yang belum terpilih secara atomik, dan mempertahankan validasi publish existing.

- [x] Tambah tes batch soal: valid, tidak valid/duplikat, dan ulangan terbit; tes lama tetap mencakup mapel lain.
- [x] Jalankan tes dan pastikan gagal sebelum implementasi.
- [x] Tambahkan tautan **Buat ulangan dari bab ini**, judul/mapel awal, dan pengingat langkah kelas → soal → terbit.
- [x] Pada panel soal tampilkan bab terpilih dan checkbox untuk menambah beberapa soal dalam satu tindakan.
- [x] Jalankan tes, lint, typecheck, build, dan E2E alur guru di 360 px serta desktop.

## Hasil implementasi

Ketiga tugas telah dikerjakan pada workspace ini. Vitest: 707 lulus, 1 smoke storage eksternal terlewati. TypeScript, ESLint, `git diff --check`, dan build Webpack lulus. Playwright Chromium membuktikan impor PDF ke materi draf, isian guru bertahan setelah impor ulang, konteks bab pada soal/ulangan, tambah soal massal, dan tidak ada gulir horizontal pada 360 px. Build Turbopack bawaan tidak dapat dijalankan di lingkungan ini karena proses CSS tidak diizinkan membuka port lokal; build Webpack berhasil.

## Verifikasi integrasi ke main (2026-10-31)

- Vitest penuh: 740 tes lulus, satu smoke storage eksternal dilewati.
- Build produksi Webpack, TypeScript, ESLint dan pemeriksaan whitespace lulus. Konfigurasi PostCSS memakai ekspor bernama untuk menghilangkan peringatan lint.
- Seluruh 21 skenario Playwright lulus, termasuk PDF dengan tabel dan pecahan, impor Excel, Buku Nilai, absensi yang disimpan dua kali, autentikasi, penilaian/rilis hasil, dan sapuan keyboard serta target sentuh pada 360/1280 px.
- Pemeriksaan menemukan input berkas PDF setinggi 27 px; diganti dengan komponen Input proyek setinggi 48 px. Sapuan desktop memeriksa sebelas halaman dan banyak langkah Tab; batas waktu tes khusus itu menjadi 90 detik. Semua pemeriksaan ukuran, fokus, dan tata letak tetap dijalankan.
- Review tidak menemukan masalah penting pada otorisasi atau transaksi. Halaman sumber diisi otomatis dari impor pertama; jika menambahkan rentang lain, guru dapat memperbarui kolom tersebut sebelum menyimpan.
