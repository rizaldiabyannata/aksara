# Rilis Aksara ke Vercel + Neon

Dokumen ini adalah prosedur rilis, bukan bukti aplikasi sudah live.

**Temuan preflight 31 Oktober 2026:** URL yang diberikan berhasil dihubungi (pooled dan direct), tetapi database sudah memiliki 20 tabel, 15 akun, 1 kelas, 0 kuis, dan 10 migrasi tercatat. Bucket `aksara-prod` belum ada. Jangan menganggap database kosong; konfirmasi branch target di Console dan pertahankan data. Tidak ada migrasi/seed/penulisan production yang dilakukan. Jangan menjalankan Vitest atau Playwright terhadap production: setup tes melakukan TRUNCATE.

## Konfigurasi

Gunakan Bun 1.4.0 sesuai `packageManager`, Node.js 24.x untuk runtime Vercel, framework Next.js, install `bun install --frozen-lockfile`, build `bun run build`, output bawaan Next.js. Pertahankan `regions: ["sin1"]`. `postinstall` menjalankan Prisma generate; build tidak boleh menjalankan migrasi atau seed. Argon2 dan Sharp harus dibuktikan kembali pada deployment Vercel, bukan dianggap kompatibel hanya dari build lokal.

Environment berikut hanya server-side. Isi secara terpisah untuk Production; Preview memakai branch database dan credential/storage tersendiri. Jangan menyalin credential production ke Development/Preview.

| Variable | Isi |
|---|---|
| `DATABASE_URL` | Neon pooled connection string, SSL aktif |
| `DIRECT_URL` | Neon direct connection string dari Console untuk branch/database yang sama, SSL aktif |
| `S3_ENDPOINT` | Endpoint storage branch production yang diberikan Neon |
| `S3_REGION` | `ap-southeast-1` |
| `S3_ACCESS_KEY_ID` | Nilai access key ID credential storage |
| `S3_SECRET_ACCESS_KEY` | Nilai secret credential storage |
| `S3_BUCKET` | `aksara-prod` |

Pemetaan dari format Neon: `AWS_ENDPOINT_URL_S3` → `S3_ENDPOINT`, `AWS_ACCESS_KEY_ID` → `S3_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` → `S3_SECRET_ACCESS_KEY`, `AWS_REGION` → `S3_REGION`. Aplikasi menggunakan credential eksplisit; tidak perlu mengganti kode ke nama AWS. Jangan memakai awalan `NEXT_PUBLIC_` untuk rahasia.

Simpan nilai lokal hanya di file yang diabaikan Git dengan mode 600. Sebelum rilis, rotasi password database dan credential storage yang pernah dibagikan di chat; gunakan nilai penggantinya untuk konfigurasi final. Jangan tempel credential pada argumen shell, log CI, screenshot, atau dokumen.

`TEACHER_USERNAME` dan `TEACHER_PASSWORD` hanya dibutuhkan saat seed satu kali, bukan environment runtime Vercel. Username: 3–32 karakter kecil/angka/titik/underscore, password minimal 12 karakter. Guru wajib mengganti password awal saat login; seed menolak menimpa guru yang sudah ada.

## Sebelum deploy

1. Di Neon Console, pastikan database production benar; bila ternyata berisi data, pertahankan data dan inventarisasi sebelum migrasi, serta endpoint database dan storage milik branch production yang sama. Ambil `DIRECT_URL` langsung dari Console; nama host hasil penghapusan `-pooler` harus diverifikasi, jangan langsung dianggap benar.
2. Buat bucket **privat** `aksara-prod` pada branch tersebut. Credential memiliki scope baca/tulis storage. Verifikasi status privat melalui Console dan unsigned GET setelah upload smoke.
3. Periksa masa retensi restore/backup pada paket Neon yang dipakai. Simpan titik pemulihan sebelum migrasi, lalu coba restore ke branch terpisah dan verifikasi data/schema. Jangan menguji restore dengan menimpa production.
4. Jalankan pemeriksaan lokal berikut **berurutan**, dengan Docker `aksara_test` aktif:

   ```bash
   bun run lint
   bunx next typegen
   bunx tsc --noEmit
   bun run test
   bun run build
   bun run test:e2e
   ```

5. Repository GitHub privat tersedia di [rizaldiabyannata/aksara](https://github.com/rizaldiabyannata/aksara), branch utama `main`. Hubungkan repository tersebut ke project Vercel milik akun/team yang benar; deployment belum dilakukan.
6. Masukkan environment Production di Vercel Dashboard. Gunakan Preview terpisah untuk smoke deployment lebih dahulu. Tidak ada secret yang dikomit.

## Smoke Neon storage asli

E2E browser menggunakan storage tiruan lokal. Bukti Neon nyata harus diperoleh terpisah. Muat `S3_*` secara privat ke environment shell, lalu jalankan:

```bash
bun run test lib/storage.s3.test.ts
```

Database Vitest tetap Docker `aksara_test`; jangan override `TEST_DATABASE_URL` ke database lain. Tes membuat dua objek acak di prefix `smoke/`, menguji upload, presigned GET, unsigned GET ditolak, copy, dan delete dengan cleanup `finally`. Tes yang **skipped** bukan bukti storage berfungsi. Jika proses dihentikan paksa, periksa dan bersihkan hanya objek smoke milik run tersebut.

## Migrasi dan inisialisasi production — saat rilis nanti

Jika database sudah berisi guru, lewati seed guru; jangan mengganti akun atau password lewat seed. Jika branch target berbeda, ulangi preflight baca-saja.

Jalankan dengan environment production yang dimuat secara eksplisit melalui secret runner/shell privat, dari checkout yang telah lolos QA. Gunakan `--env-file` secara eksplisit agar pemilihan environment tidak bergantung pada `NODE_ENV`. Prisma config membaca `DIRECT_URL` dari environment; jangan `source` file dotenv sebagai script shell.

```bash
bun --env-file=.env.production.local x prisma migrate status
bun --env-file=.env.production.local run db:migrate:deploy
bunx prisma generate
# Hanya jika belum ada guru, dengan credential seed di environment privat:
bun --env-file=.env.production.local run db:seed
bun --env-file=.env.production.local run db:seed:content
```

Jangan memakai `migrate dev`, `migrate reset`, `db push`, `e2e/seed.ts`, atau seed TKA di production. Seed content idempoten: dua mapel, sepuluh bab, tanpa siswa atau soal demo. Cek hasil migrasi dan jumlah data sebelum deploy; pastikan akun guru hanya satu. Lepaskan credential seed dari environment setelah selesai.

## Verifikasi deployment dan rollback

- Pada Preview terisolasi: login guru, ganti password awal, login siswa sintetis, buat/publish materi, upload dan baca gambar, mulai kuis, autosave + reload, submit, nilai/rilis, download Excel, dan logout. Periksa cookie Secure pada HTTPS dan akses tanpa sesi/lintas role ditolak.
- Setelah production dirilis: periksa login guru, koneksi DB, gambar privat dan ekspor dengan data yang memang diizinkan. Gunakan kelas/siswa uji yang jelas jika perlu alur tulis; jangan jalankan suite yang mereset DB.
- Pantau log Vercel dan metrik Neon selama minimal 15 menit. Catat error login, upload, autosave, submit, dan ekspor tanpa password, cookie, kunci jawaban, maupun jawaban lengkap.
- Hentikan rilis bila alur kritis gagal, terjadi kebocoran akses, atau ada error 5xx berulang. Rollback ke deployment aplikasi sebelumnya bila kompatibel dengan schema. Rollback Vercel **tidak** mengembalikan database; pemulihan data/schema harus memakai prosedur backup terverifikasi.

## Batas platform

Upload gambar dibatasi 4 MiB sebelum multipart overhead, hasil pemrosesan maksimal 2 MiB. PDF dan workbook impor dibaca di browser; yang dikirim ke server adalah teks/JSON dengan batas aplikasi. Uji ekspor pada ukuran kelas nyata; file kecil yang lulus belum membuktikan ekspor besar aman. Jangan menaikkan batas upload/server action untuk melewati batas Vercel.

Referensi: [Vercel Function limits](https://vercel.com/docs/functions/limitations) (payload 4.5 MB), [environment Vercel](https://vercel.com/docs/environment-variables), [Neon Object Storage](https://neon.com/docs/storage/overview), [credential storage](https://neon.com/docs/storage/authentication), [Bun environment files](https://bun.com/docs/runtime/environment-variables).
