# Impor soal Excel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Template Excel enam tipe soal menjadi bank soal dan satu draf ulangan, tanpa publikasi otomatis.
**Architecture:** ExcelJS membaca workbook di browser; parser dan validator soal dibagi dengan server. Route guru menerima JSON maksimal 900 KB; transaksi tunggal menyimpan soal, ulangan dan kelas, dengan identitas impor unik untuk retry.
**Tech Stack:** Bun, Next.js, ExcelJS, Zod, Prisma/PostgreSQL, Vitest, Playwright.
**Spec:** docs/superpowers/specs/2026-10-31-impor-soal-excel-design.md

## Global Constraints

- `.xlsx` maksimal 5 MB, total 100 soal, satu mapel/bab per impor.
- Hasil selalu DRAFT; semua enam tipe, bobot dan urutan dipertahankan.
- Gambar melalui editor setelah impor; kunci hanya guru; validasi ulang server.
- Transaksi atomik, retry tidak menggandakan data; Vitest dan Playwright serial.
- Pertahankan perubahan pengguna yang sudah ada; tanpa dependency baru.

## Review Focus

- File rusak atau formula cached tidak boleh menghasilkan soal diam-diam.
- Pergantian file selama pembacaan tidak boleh menyimpan pratinjau lama.
- Retry dengan identitas sama tetapi isi berbeda harus ditolak.
- Kegagalan setelah sebagian insert harus rollback keseluruhan.
- Draf dari impor harus dapat diperiksa/diaktifkan melalui editor sebelum publikasi.

### Task 1: Template dan parser bersama
**Files:** create lib/question-input.ts (validator dipindah tanpa perubahan perilaku), lib/question-import-format.ts, lib/question-import-workbook.ts, lib/question-import-workbook.test.ts; modify lib/questions.ts.
**Interfaces:** buildQuestionTemplate(): Promise<Workbook>; parseQuestionWorkbook(workbook): ImportPreview; validateImportRows(rows, chapterId): validated rows or located issues.
- [x] Tulis dan jalankan tes gagal untuk enam tipe, contoh terpisah, urutan, formula, header/versi salah, batas jumlah, kunci, normalisasi jawaban.
- [x] Implementasi template terformat, parser dan validasi bersama; opsi berurutan dan lokasi kesalahan jelas.
- [x] Jalankan tes parser dan regresi questions/grading; harus lulus.

### Task 2: Transaksi dan route guru
**Files:** create lib/question-import.ts, lib/question-import.test.ts, app/api/question-import/route.ts, app/api/question-import/template/route.ts, app/api/question-import/route.test.ts, prisma/migrations/<timestamp>_quiz_import_identity/migration.sql; modify prisma/schema.prisma, lib/questions.ts, lib/quizzes.ts.
**Interfaces:** importQuestionQuiz(actorId, input: unknown) returns {ok:true,id} or Invalid; route POST accepts bounded JSON and returns no-store result; GET serves authenticated template.
- [x] Tes gagal: siswa/anonim ditolak, urutan/bobot/status, rollback, bab/mapel/kelas salah, input palsu, retry konkuren dan konflik isi.
- [x] Tambah importKey/importFingerprint nullable pada Quiz, unique actor/key; gunakan kembali validator dan helper transaksi domain.
- [x] Jalankan prisma generate dan test database migrate deploy melalui Vitest. Tidak mengubah DB pengembangan/produksi.
- [x] Route memeriksa sesi guru, same-origin, ukuran aktual dan validasi; tes semua batas.

### Task 3: Alur guru dan verifikasi
**Files:** create app/(teacher)/teacher/quizzes/import/page.tsx, import-form.tsx, e2e/question-import.spec.ts; modify quizzes/page.tsx dan quizzes/[id]/page.tsx seperlunya.
**Interfaces:** form menerima subject tree dan active classes; memuat ExcelJS on-demand; download template dan POST data ke route Task 2.
- [x] Tulis tes browser untuk unggahan salah/benar, pemeriksaan draf, aktivasi/publikasi, siswa tanpa bocoran kunci, keyboard dan 360 px.
- [x] Implementasi konteks, pratinjau semua kolom/kunci, pembatalan dan pencegahan race, retry memakai identitas sama; link periksa soal dari draf.
- [x] Jalankan typecheck, lint, Vitest kemudian Playwright serial; perbaiki kegagalan yang disebabkan fitur ini.
- [x] Review akhir independen sesuai executing-plans; perbaiki temuan penting dan catat bukti.

Commits ditunda agar perubahan pengguna pada file bersama tidak ikut ter-stage. Implementasi langsung dilanjutkan atas otorisasi pengguna; tidak meminta persetujuan ulang.

## Hasil verifikasi

- Vitest penuh: 60 file, 741 tes lulus; setelah perbaikan label kolom, 6 tes parser dijalankan ulang dan lulus.
- Typecheck bersih. Lint penuh: nol error, satu peringatan lama di `postcss.config.mjs`; lint khusus fitur bersih.
- Build produksi berhasil dengan Node.js bawaan runtime. Playwright pada build tersebut: satu alur lengkap enam tipe lulus, termasuk upload salah, retry setelah respons hilang, review/aktivasi/publikasi, akses siswa, keyboard dan 360/1280 px.
- Review independen: tidak ada P1/P2; masukan kecil label kolom diperbaiki dan diuji red/green.
- Template diperiksa ulang dengan ExcelJS dan openpyxl. Migrasi `20261031180000_quiz_import_identity` diterapkan ke database uji dan database pengembangan yang dikonfigurasi.
- Pengujian awal menemukan dua kesalahan fixture/assertion browser: pengisian harus memakai row 2, dan penantian navigasi/status harus menargetkan id/status terbit yang tepat. Keduanya diperbaiki; tidak memerlukan pelonggaran perilaku aplikasi.
- Perubahan pengguna di luar fitur dipertahankan secara terpisah. Commit dan merge lokal dilakukan setelah persetujuan pengguna; tidak mencakup push atau deployment.
