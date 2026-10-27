# Aksara

Aksara adalah aplikasi web untuk satu guru dan siswa kelas VI SD/MI. Isinya: materi belajar, bank soal, ulangan online dengan timer, penilaian, rilis hasil, dan ekspor Excel.

## Menjalankan Lokal

Prasyarat: Bun dan Docker.

```bash
bun install
cp .env.example .env.local   # isi nilainya
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

## Setup Cloudflare R2

Gambar materi disimpan di bucket R2 yang privat. Ulangi langkah ini untuk setiap environment.

1. Cloudflare Dashboard → R2 Object Storage → Create bucket `aksara-dev`, lokasi Automatic.
2. Bucket → Settings → Public access: pastikan **R2.dev subdomain Disabled** dan tidak ada Custom Domain.
3. R2 → Manage API tokens → Create API token: permission **Object Read & Write**, "Apply to specific buckets only" → `aksara-dev`.
4. Salin Account ID, Access Key ID, dan Secret ke `.env.local` (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET=aksara-dev`).
5. Bukti: `bun run test lib/storage.r2.test.ts` lulus (tidak di-skip). Ulangi untuk `aksara-preview` dan `aksara-prod` saat deploy, lalu isi env di Vercel.
