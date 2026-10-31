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

## Membuat soal ulangan atau TKA dengan ChatGPT

Buka **Ulangan → Impor dari Excel**. Pilih jenis ulangan, mapel, dan bab; atur komposisi tipe soal, kesulitan, level berpikir, jumlah, dan bobot. Unduh template Excel serta prompt `.txt` (atau salin prompt), lalu unggah keduanya ke ChatGPT dan minta hasil `.xlsx`. Unggah hasilnya kembali ke Aksara, periksa pratinjau dan kunci, lalu simpan sebagai draf. Pengisian Excel manual tetap tersedia tanpa mengatur prompt.

Ulangan biasa mendukung enam tipe soal. Prompt Tryout TKA mendukung mapel **TKA Matematika** dan **TKA Bahasa Indonesia**, dengan tipe PG, PG kompleks, dan Kategori. Pada Bahasa Indonesia TKA, kompetensi mengikuti bab dan kolom Level Kognitif dibiarkan kosong. Jika mapel TKA belum tersedia, pengisian seed TKA dilakukan terpisah sesuai prosedur database; fitur prompt tidak menjalankan seed.

Kesulitan berbeda dari HOTS. Prompt meminta komposisi yang tepat dan pemeriksaan mandiri, tetapi hasil AI tetap harus lolos validator impor serta ditinjau guru. Semua hasil impor masih draf; tidak otomatis aktif atau terbit. Tidak ada koneksi API ChatGPT atau pengiriman materi otomatis dari Aksara.

## Bulk status Bank Soal

Di **Bank Soal**, centang soal tertentu atau pilih semua soal pada halaman. **Pilih semua N hasil filter** mencakup halaman lain; hilangkan centang soal yang ingin dikecualikan. Pilihan bertahan saat berganti halaman dan dihapus ketika filter berubah. Pilih **Aktifkan** atau **Jadikan draf**, lalu periksa konfirmasi sebelum menjalankan.

Perubahan status dan audit disimpan dalam satu transaksi. Soal yang sudah berstatus sama tidak diubah ulang. Ulangan terbit mempertahankan salinan soalnya; ulangan draf tetap membutuhkan soal aktif sebelum diterbitkan. Maksimal 1.000 pilihan manual atau pengecualian; gunakan filter untuk mempersempit cakupan bila diperlukan.

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
