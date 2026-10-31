# Buku Nilai Implementation Plan

**Goal:** Buku nilai guru lintas ulangan dan ekspor penilaian lengkap Excel/CSV ZIP.
**Spec:** `docs/superpowers/specs/2026-10-31-buku-nilai-design.md`.
**Architecture:** Query batch server-only; dataset bersama untuk halaman dan serializer. Reuse scoring/evaluation; endpoint guru terotorisasi. Next.js 16, Bun, Prisma, ExcelJS, JSZip.

## Tugas dan gate
- [ ] 1. Dataset (`lib/gradebook.ts`, filter murni): test-first filter, peserta, status, rata-rata, finalisasi, batas dan snapshot; commit.
- [ ] 2. Halaman `/teacher/grades`, nav, filter URL dan pagination, rincian percobaan; browser test keyboard/mobile; commit.
- [ ] 3. Dataset tabel ekspor + Excel: identitas, semua relasi, snapshot, evaluasi, konten panjang; roundtrip workbook test; commit.
- [ ] 4. CSV ZIP + `/api/gradebook-exports`: roundtrip CSV/ZIP, auth, audit, batas, escaping; commit.
- [ ] 5. Full suite, typecheck, lint, build, Playwright serial; fresh review dan perbaikan; commit.

## Keputusan eksekusi dan ledger
- Ruling: gunakan cabang terpisah pada checkout saat ini, tanpa memindahkan perubahan pengguna ke worktree; mempertahankan dependency dan perubahan konten yang belum di-commit. Stage hanya file fitur ini.
- Baseline: working tree sudah berisi perubahan pada konten, quizzes, dependency, attendance dan E2E; semuanya milik pekerjaan lain.
- FINAL gate buku nilai lebih ketat daripada ekspor lama: running remedial/pengganti tertunda tidak ikut rata-rata. Ekspor lama tetap kompatibel.
- Tidak ada riwayat kelas atau autosave lengkap di schema; jelaskan batas tersebut di UI dan petunjuk ekspor.
