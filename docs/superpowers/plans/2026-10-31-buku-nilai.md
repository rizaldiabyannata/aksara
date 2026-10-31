# Buku Nilai Implementation Plan

**Goal:** Buku nilai guru lintas ulangan dan ekspor penilaian lengkap Excel/CSV ZIP.
**Spec:** `docs/superpowers/specs/2026-10-31-buku-nilai-design.md`.
**Architecture:** Query batch server-only; dataset bersama untuk halaman dan serializer. Reuse scoring/evaluation; endpoint guru terotorisasi. Next.js 16, Bun, Prisma, ExcelJS, JSZip.

## Tugas dan gate
- [x] 1. Dataset (`lib/gradebook.ts`, filter murni): test-first filter, peserta, status, rata-rata, finalisasi, batas dan snapshot; commit.
- [x] 2. Halaman `/teacher/grades`, nav, filter URL dan pagination, rincian percobaan; browser test keyboard/mobile; commit.
- [x] 3. Dataset tabel ekspor + Excel: identitas, semua relasi, snapshot, evaluasi, konten panjang; roundtrip workbook test; commit.
- [x] 4. CSV ZIP + `/api/gradebook-exports`: roundtrip CSV/ZIP, auth, audit, batas, escaping; commit.
- [x] 5. Full suite, typecheck, lint, build, Playwright serial; fresh review dan perbaikan; commit. Dua kegagalan E2E di pekerjaan PDF yang sudah ada dicatat di bawah.

## Keputusan eksekusi dan ledger
- Ruling: gunakan cabang terpisah pada checkout saat ini, tanpa memindahkan perubahan pengguna ke worktree; mempertahankan dependency dan perubahan konten yang belum di-commit. Stage hanya file fitur ini.
- Baseline: working tree sudah berisi perubahan pada konten, quizzes, dependency, attendance dan E2E; semuanya milik pekerjaan lain.
- FINAL gate buku nilai lebih ketat daripada ekspor lama: running remedial/pengganti tertunda tidak ikut rata-rata. Ekspor lama tetap kompatibel.
- Tidak ada riwayat kelas atau autosave lengkap di schema; jelaskan batas tersebut di UI dan petunjuk ekspor.
- Baseline ekspor lama: 5 tes lulus. Tes fitur terarah: 20 lulus, mencakup enam tipe soal, nilai nol, remedial, tanpa KKM, perpindahan, WITA, expiry, pagination ekspor, otorisasi, CSV/Excel, Unicode dan konten panjang.
- Review independen: perbaiki gate FINAL evaluasi, presisi waktu ISO, hitungan preflight seluruh tabel dan fragment per sel. Regresi 100 soal × 100 siswa dengan prompt/pembahasan 5000 karakter lulus; tidak ada temuan Important tersisa pada pemeriksaan perbaikan.
- Ruling: FINAL evaluasi buku nilai mengikuti proses seluruh siswa-ulangan (termasuk menunggu pengganti); ekspor lama tidak diubah. Nilai per-attempt tersimpan tetap tersedia di rincian.
- Ruling: JSON terstruktur dan teks terbaca sama-sama diekspor; metadata gambar pembahasan ikut tanpa storage key. Waktu menampilkan WITA dan ISO agar milidetik tidak hilang.
- Browser awal: desktop lolos unduh/rincian; 360 px menemukan overflow caption sr-only. Terbukti 622→360 px setelah kontainer gulir diberi position relative; tes browser akhir wajib hijau.
- Dependency: JSZip 3.10.2 dijadikan dependency langsung (versi yang sebelumnya sudah dipakai transitif ExcelJS). Stage hanya penambahan JSZip pada package/lock; perubahan PDF/PostCSS milik pekerjaan lain tetap tidak diikutkan.

## Hasil akhir verifikasi
- `bun run test`: 57 file, **728 tes lulus** setelah seluruh perbaikan produksi.
- `bunx tsc --noEmit`: lulus. `bun run lint`: 0 error, 1 warning pada `postcss.config.mjs` milik pekerjaan yang sudah ada.
- `bun run build`: exit 0; `/teacher/grades` dan `/api/gradebook-exports` masuk keluaran. Diagnostik `CLIENT_HOOK_DYNAMIC` pada route dinamis lama masih muncul seperti baseline, tidak pada halaman baru.
- Browser memakai Node 24 yang sudah terpasang dan Chromium. Konfigurasi sementara di `/tmp/aksara-gradebook-playwright.config.mts` mengikuti konfigurasi repo tetapi menjalankan `next start` langsung terhadap build terverifikasi. Vitest dan E2E dijalankan bergantian.
- Seluruh E2E: **18 lulus, 2 gagal**. Keduanya `e2e/mobile.spec.ts` → teacher pages pada 360/1280 px, di `/teacher/materials/new`: input PDF `components/pdf-import.tsx:71` hanya 27 px. Komponen PDF dan perubahan halaman tersebut sudah ada sebelum pekerjaan ini dan tidak diikutkan commit fitur.
- E2E khusus Buku Nilai diulang dengan pemeriksaan target ≥44 px: **3/3 lulus**, mencakup 360/1280 px, keyboard, filter/pencarian, rincian, unduh Excel/CSV, pemulihan filter tidak valid, tanpa overflow.
- Review ulang preflight: hanya sel >30.000 unit UTF-16 dikenakan fragmen. Regresi 100 soal ×100 siswa dengan prompt/pembahasan 5000 karakter lulus. Metadata evaluasi hanya menghitung peserta final; expiry menggunakan satu pencarian batch sebelum helper domain.
- Ekspor lama tetap kompatibel; tidak ada migrasi atau deployment. Excel/CSV diperiksa dengan roundtrip parser dan browser download, bukan aplikasi desktop Excel/LibreOffice.
