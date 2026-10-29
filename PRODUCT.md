# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Satu guru kelas VI SD/MI.** Guru ini mengelola kelas dan siswa, menulis serta memverifikasi materi, menyusun bank soal dan ulangan, memantau ulangan yang sedang berjalan, menilai uraian, merilis hasil, dan mengekspor rekap. Pengguna yang dibayangkan adalah guru yang lebih senior dan tidak terbiasa dengan aplikasi rumit. Akunnya dibuat lewat seed, tidak ada pendaftaran publik.
- **Siswa kelas VI (sekitar 11–12 tahun).** Siswa membaca materi yang sudah terbit, mengerjakan ulangan berwaktu, dan melihat hasil setelah dirilis. Mereka masuk dengan kode kelas ditambah NIS atau nama, tanpa kata sandi.

## Product Purpose

Aksara menyatukan materi, bank soal, ulangan online, penilaian, dan rekap nilai dalam satu tempat untuk satu guru dan kelas-kelasnya. Produk ini dianggap berhasil bila guru dapat membuat, memeriksa, dan menerbitkan materi serta ulangan tanpa bantuan teknis, dan siswa dapat mengerjakan ulangan tanpa kehilangan jawaban.

## Positioning

Aksara dibuat khusus untuk satu guru kelas VI. Isinya mengacu pada dua buku: *Matematika Kelas VI* (2022, 4 bab) dan *IPAS Kelas VI* edisi revisi (2025, 6 bab). Guru memegang kendali penuh: konten tetap berstatus draf sampai guru memverifikasinya, dan hasil siswa tersembunyi sampai guru menekan "Rilis Hasil".

## Operating Context

- Siswa memakai perangkat campuran, kadang Chromebook atau laptop di lab dan kelas, kadang HP masing-masing. Desain harus sama kuat di desktop maupun HP.
- Ulangan berjalan dengan timer yang dihitung server, autosave, dan masa tenggang jaringan 60 detik. Guru memantau ulangan langsung dari halaman detail.
- Rekap diekspor ke Excel dengan dua sheet: `Rekap Nilai` dan `Rincian Jawaban`.

## Capabilities and Constraints

- Lihat `docs/PRD_Web_App_Belajar_Kelas_VI.md` dan bagian invarian di `CLAUDE.md`. Ringkasannya:
  - authz di server untuk setiap operasi;
  - kunci jawaban tidak pernah sampai ke klien siswa;
  - materi draf ditolak untuk siswa;
  - snapshot soal saat ulangan diterbitkan;
  - skor dihitung saat dibaca.
- Tipe soal: pilihan ganda, benar/salah, pilihan ganda kompleks, jawaban singkat, uraian.
- Semua copy memakai Bahasa Indonesia, ditulis untuk anak kelas 6. Tidak ada fitur di luar PRD (misalnya notifikasi, kehadiran, atau token sesi ujian) tanpa PRD baru.

## Brand Commitments

- Nama: **Aksara**. Belum ada logo, jadi dipakai wordmark teks dan tidak boleh ada gambar logo rekaan.
- Arah visual sudah dikunci oleh desain Stitch di `docs/stitch/` (keputusan user, 30-10-2026). Rinciannya di DESIGN.md.

## Evidence on Hand

- `docs/stitch/`: 26 mockup (desktop + mobile, PNG + HTML). Data contoh di mockup bersifat fiktif (nama guru, jumlah siswa, bab, dan subbab) dan tidak boleh disalin ke produk.
- Tidak ada testimoni, statistik penggunaan, atau foto asli.

## Product Principles

1. Guru tetap memegang kendali: tidak ada yang terbit, dinilai final, atau terlihat siswa tanpa tindakan guru.
2. Jangan sampai jawaban siswa hilang. Sisa waktu dan status simpan selalu terlihat dan jelas.
3. Satu tindakan utama per layar, ditulis dengan kata-kata yang dimengerti anak kelas 6 dan guru senior.
4. Isi buku tidak dikarang. Konten tetap draf sampai diverifikasi.

## Accessibility & Inclusion

- WCAG 2.1 AA: kontras teks ≥ 4.5:1, kontras border kontrol dan focus ring ≥ 3:1.
- Teks terkecil 16 px, teks isi 18 px.
- Target sentuh ≥ 44 px. Semua bisa dioperasikan dengan keyboard dan fokus selalu terlihat.
- Status dan timer tidak boleh hanya mengandalkan warna (selalu ikon + teks).
