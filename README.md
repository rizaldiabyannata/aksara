# Aksara

Aksara adalah aplikasi web untuk satu guru dan siswa kelas VI SD/MI. Isinya: materi belajar, bank soal, ulangan online dengan timer, penilaian, rilis hasil, dan ekspor Excel.

## Menjalankan Lokal

Prasyarat: Bun dan Docker.

```bash
bun install
cp .env.example .env   # isi nilainya
bun run db:up               # Postgres di Docker (port 5433)
bun run db:migrate
bunx prisma generate         # wajib setelah migrasi baru
bun run db:seed              # akun guru dari .env
bun run db:seed:content      # 2 mapel + 10 bab (idempoten)
bun dev                      # http://localhost:3000
```

Tes (butuh Docker menyala):

```bash
bun run test
```

## Setup Neon Object Storage

Gambar materi disimpan di bucket Neon Object Storage (S3-compatible) yang privat. Ulangi untuk setiap environment.

1. Neon Console → project → Storage → buat bucket privat (dev: `aksara-upload`).
2. Buat access key untuk bucket itu.
3. Isi `.env` (`S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`). Jangan pakai nama `AWS_*`: Vercel mencadangkannya.
4. Bukti: `env $(grep '^S3_' .env | xargs) bun run test lib/storage.s3.test.ts` lulus (tidak di-skip; Vitest tidak membaca `.env`). Isi env yang sama di Vercel saat deploy.


## QA dan production

- [Panduan rilis Vercel–Neon](docs/production.md): environment, bucket privat, migrasi terkontrol, seed awal, smoke dan rollback.
- [Laporan cakupan E2E](docs/testing/2026-10-31-production-readiness.md).
- Jalankan Vitest dan Playwright berurutan, karena keduanya mereset `aksara_test`.
- `bun run test:e2e` membangun dan menjalankan aplikasi production lokal; setiap tes mendapat seed baru dan storage tiruan lokal. Laporan: `playwright-report/`, bukti kegagalan: `test-results/`. Artifact bisa berisi credential **sintetis** tes; jangan publikasikan mentah.
- `bun run db:migrate:deploy` disediakan untuk tahap rilis; tidak dijalankan otomatis saat build.
