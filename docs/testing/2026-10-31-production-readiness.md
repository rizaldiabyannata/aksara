# E2E dan kesiapan production — 31 Oktober 2026

Target: siap deploy; tanpa migrasi, seed, atau deployment production.

## Pelaksanaan

- Baseline repo bersih. Pengerjaan pada `codex/e2e-production-readiness`.
- Keputusan: branch lokal dalam checkout aktif agar dependency, browser, dan Docker tetap sama; tidak membuat worktree baru.
- Fixture direset sebelum setiap tes, termasuk rerun/retry. Vitest dan Playwright wajib serial.
- Storage E2E memakai server S3 tiruan lokal, menimpa semua variabel S3 yang diwariskan. Ini menguji jalur browser/route/Sharp/SDK, bukan validitas kredensial atau keamanan Neon.
- Tidak mengubah `.claude/` atau catatan vault yang bukan bagian pekerjaan ini.

## Hasil verifikasi akhir

| Pemeriksaan | Hasil |
|---|---|
| `bun run lint` | Lulus |
| `bunx next typegen` + `bunx tsc --noEmit` | Lulus |
| `bun run test` | **740 lulus**, 1 dilewati, 0 gagal; 59 file lulus, 1 file dilewati |
| `bun run build` | Lulus, 38 halaman dihasilkan; koneksi DB diarahkan ke Docker test |
| `bun run test:e2e` | **30 lulus, 0 gagal**, Chromium, 3,9 menit, satu worker |
| Guard database tes | Menerima `*_test`, menolak `neondb` dan `aksara_dev` |
| `git diff --check` dan scan pola credential pada perubahan | Lulus; file secret diabaikan Git dan mode 600 |
| Neon pooled/direct dan migration status (baca-saja) | Koneksi berhasil; schema up to date |
| Smoke storage Neon nyata | **Belum terverifikasi**; tes dilewati, bucket production belum ada |

Vitest dan E2E final dijalankan berurutan, tanpa reset database yang bersamaan. Perintah final berhenti dengan exit code 0. Build juga dijalankan oleh webServer Playwright sebelum tes. Pada tahap pengembangan tes sempat gagal karena locator, hidrasi/redirect, ekspektasi kontrol per viewport, dan isolasi fixture; semuanya sudah diperbaiki dan seluruh suite akhir hijau.

Artifact lokal: `playwright-report/index.html`, `test-results/question-import-preview.png`. Trace/screenshot otomatis disimpan bila ada kegagalan; run akhir tidak memiliki tes gagal. Artifact tidak masuk Git dan hanya memakai identitas/kredensial sintetis tes.

## Matriks fitur → skenario → bukti

`Integration` di bawah berarti suite Vitest terhadap PostgreSQL lokal, bukan browser. Nama berkas relatif terhadap root repo. Seluruh tes pada run akhir lulus. Status menyatakan lapisan bukti yang dijalankan, bukan klaim semua kombinasi input telah diuji.

| Fitur | Skenario utama | Bukti browser | Bukti domain/HTTP | Status |
|---|---|---|---|---|
| Login dan sesi | Guru/siswa, password salah, throttle, logout, sesi perangkat kedua | `e2e/login.spec.ts`, `e2e/student.spec.ts` | `lib/auth/*.test.ts`, action auth | Lulus lokal |
| Password guru | Password awal wajib diganti, guard halaman | `e2e/login.spec.ts` | password actions/session tests | Lulus lokal |
| Kelas dan siswa | Buat, kode proyektor, tambah siswa, nonaktifkan dan cabut sesi | `e2e/lifecycle.spec.ts`, `e2e/teacher.spec.ts` | `lib/classes.test.ts`, `lib/students.test.ts` | Lulus lokal |
| Struktur mapel | Buat mapel, bab, subbab | `e2e/lifecycle.spec.ts` | `lib/subjects.test.ts` | Lulus lokal |
| Materi | Draf ditolak → tinjau → terbit → baca → tarik | `e2e/lifecycle.spec.ts` | `lib/materials.test.ts` | Lulus lokal |
| PDF | Ekstraksi browser, pertahankan suntingan, simpan draf | `e2e/content-import.spec.ts` | `lib/pdf-text.test.ts` | Lulus lokal |
| Gambar materi | Upload → render → akses siswa menurut publikasi | `e2e/lifecycle.spec.ts` (S3 tiruan) | image domain dan route tests | Lulus lokal |
| Foto profil | Upload, render, siswa ditolak, hapus | `e2e/lifecycle.spec.ts` (S3 tiruan) | `lib/images.test.ts`, profile-photo route tests | Lulus lokal |
| Bank soal | Editor, aktivasi, enam tipe | `e2e/question-import.spec.ts`, `e2e/teacher.spec.ts` | question/input/grading tests | Lulus lokal |
| Excel soal | Template, validasi, retry respons hilang, draft atomik | `e2e/question-import.spec.ts` | question-import/workbook/route tests | Lulus lokal |
| Susun ulangan | Buat manual/tambah soal, publikasi menolak draf lalu berhasil | content-import + question-import specs | `lib/quizzes.test.ts` | Lulus lokal |
| Snapshot | Perubahan bank tidak mengubah penilaian kuis terbit | Tidak khusus diuji ulang lewat UI | `lib/quizzes.test.ts`: bank edit after publish | Lulus integration |
| Pengerjaan | Enam tipe jawaban, ragu-ragu, reload, submit | question-import + student specs | `lib/attempts.test.ts`, grading tests | Lulus lokal |
| Autosave jaringan | Kegagalan terlihat, simpan berikutnya berhasil, reload pulih | `e2e/student.spec.ts` | save-queue dan attempt tests | Lulus lokal |
| Timer dan jatah | Percobaan kedaluwarsa tidak bisa dilanjutkan/diulang | `e2e/student.spec.ts` | attempt tests untuk deadline/grace 60 detik dan start paralel | Lulus lokal |
| Token dan bantuan | Tolak token salah, mulai, minta/selesaikan bantuan | `e2e/tahap8.spec.ts` | `lib/token-help.test.ts` | Lulus lokal |
| Penilaian/rilis | Uraian, nilai 75, rilis/batal rilis, hasil siswa | teacher + retakes specs | scoring/results tests | Lulus lokal |
| Remedial/pengganti | Kunci ditahan, cap KKM 75, pengganti dengan alasan, jatah tetap | `e2e/retakes.spec.ts` | results/attempt tests | Lulus lokal |
| Privasi | Draft, kunci/rubrik, foto, API guru ditolak siswa | lifecycle/login/question-import specs | no-secrets, images, guarded route tests, kelas lain | Lulus lokal |
| TKA | PGK Kategori, rilis, evaluasi, rincian hasil | `e2e/tahap10.spec.ts` | evaluation/results tests | Lulus lokal |
| Impor siswa | Workbook browser, pratinjau, simpan roster | `e2e/tahap9.spec.ts` | student-import/students tests | Lulus lokal |
| Absensi/libur | Simpan, reload, ekspor bulanan, tutup/buka hari libur | `e2e/tahap9.spec.ts` | attendance dan attendance-export tests | Lulus lokal |
| Buku nilai/ekspor | Filter, rincian, download, keyboard 360/1280 | `e2e/gradebook.spec.ts` | gradebook/export dan authorization/formula injection tests | Lulus lokal |
| Dashboard/pencarian | Tugas guru, monitoring, pencarian topbar | teacher/tahap8 specs | dashboard/search/school-term/tips tests | Lulus lokal |
| Mobile/a11y | Overflow, target 44 px, indikator fokus, ujian 360/1280, fokus dialog kembali | `e2e/mobile.spec.ts`, gradebook/teacher specs | design-token tests | Lulus lokal |

Tidak menyamakan suite ini dengan pengujian semua kombinasi input atau semua perangkat. Detail gambar soal/frozen image, isolasi lintas kelas, konkurensi dan batas waktu presisi dibuktikan integration test, bukan seluruhnya lewat UI.

## Production: pemeriksaan baca-saja

- Pooled dan direct berhasil terkoneksi; host direct diturunkan dari hostname pooled dan konektivitas terbukti, tetapi identitas branch tetap harus dicocokkan dengan Console.
- Database: **20 tabel publik, 15 akun, 1 kelas, 0 kuis, 10 migrasi tercatat; `prisma migrate status` menyatakan up to date**. Asumsi awal database kosong tidak sesuai fakta; jangan reset, jangan menimpa akun, jangan seed ulang guru.
- ListBuckets berhasil; bucket `aksara-prod` **belum ada**. Tidak dibuat dalam tahap persiapan.
- `.env.production.local` disiapkan dari konfigurasi yang diberikan, diabaikan Git, mode 600. Nilainya tidak dicantumkan pada laporan. Credential wajib diganti sebelum pemakaian production sesuai panduan rilis.
- Belum dilakukan: migrasi/seed production, upload/copy/delete ke Neon asli, validasi bucket privat nyata, backup/restore nyata, pengisian environment Vercel, deployment Preview/Production, smoke HTTPS/serverless dan ekspor ukuran kelas nyata.

## Perbaikan dalam pekerjaan ini

- Isolasi data setiap tes melalui auto fixture Playwright; seed tidak lagi satu kali untuk seluruh suite. Viewport desktop tidak bergantung pada attempt dari tes mobile.
- Semua koneksi storage E2E diarahkan ke server tiruan localhost, menghindari efek samping ke environment asli.
- Penambahan cakupan alur yang belum diuji browser; locator, sinkronisasi redirect/hidrasi, dan pemeriksaan viewport disesuaikan dengan UI sebenarnya.
- ESLint mengecualikan bundle laporan HTML/trace Playwright. Sebelum pengecualian, lint setelah E2E memeriksa kode vendor hasil generate dan gagal; sesudah perbaikan, pemeriksaan hanya mencakup source.
- Tidak ada perubahan logika bisnis atau schema database. Tambahan command `db:migrate:deploy`, laporan HTML/screenshot kegagalan, dan panduan rilis production.


## Review dan keputusan

- Review independen membaca diff tanpa mengakses secret atau menjalankan tes paralel. Dua temuan tes diperbaiki: timeout mengecek tombol Mulai maupun Ulangi; pencabutan sesi menunggu server action selesai pada UI guru.
- Keputusan pada tahap QA: tidak membuat bucket, tidak menyentuh data production, tidak membuat remote/project Vercel, dan tidak merotasi credential secara otomatis. Semua langkah ini berada pada tahap rilis yang terpisah sesuai batas rencana.
- Temuan database berisi data menggantikan asumsi awal database baru. Biaya jika branch keliru: rilis ke target salah; karena itu pencocokan branch Console tetap menjadi prasyarat sebelum migrasi/seed nanti.
- Batas bukti: E2E tidak membuktikan bucket Neon privat asli atau runtime Vercel. Restore backup, ukuran ekspor maksimal, dan perangkat siswa nyata belum diuji. Ini bukan hasil gagal tes lokal.

## Publikasi source — 31 Oktober 2026

Atas permintaan pengguna setelah QA, repository GitHub **privat** dibuat di [rizaldiabyannata/aksara](https://github.com/rizaldiabyannata/aksara), dengan `main` sebagai branch utama. Riwayat Git dan perubahan diperiksa untuk pola credential; `.env.production.local` dan data autentikasi E2E tetap di luar Git. Publikasi source tidak menjalankan deployment atau migrasi production.
