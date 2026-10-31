# Buku Nilai dan Ekspor Penilaian Lengkap

Disetujui pemilik produk pada 2026-10-31 melalui percakapan.

## Tujuan
Guru melihat seluruh nilai lintas ulangan, membuka rincian, dan mengambil Excel atau CSV ZIP ringkas/lengkap. Kelompok buku nilai: kelas saat ini, mapel, jenis REGULAR/TRYOUT_TKA. Semua data penilaian tersimpan tersedia, tanpa kredensial, sesi, atau token ujian.

## Perilaku yang disepakati
- `/teacher/grades`: filter kelas, mapel, jenis, rentang tanggal WITA, pilihan ulangan, riwayat, pencarian nama/NISN/nomor induk. Filter beririsan dan tersimpan di URL. Pagination 50 siswa; ekspor seluruh hasil filter.
- Tanggal acuan `startsAt ?? publishedAt`, akhir hari inklusif. Default seluruh ulangan terbit, siswa aktif, tanpa batas tanggal.
- Status membedakan belum mulai, sedang mengerjakan, menunggu pengganti, perlu dinilai, final, tidak ditugaskan. Angka hanya saat proses FINAL. Rata-rata bobot sama dari nilai final, tanpa mengubah computeRecap; pembulatan tampilan dua desimal. Tanpa KKM tidak masuk hitungan ketuntasan.
- Default roster aktif kelas saat ini. Riwayat menambahkan peserta dengan attempt terkait; kelas tujuan ulangan bukan bukti kelas historis siswa.
- Klik sel membuka percobaan dan tautan penilaian. UI Indonesia, keyboard, target 44 px, mobile 360 px, status bukan warna saja.
- Ringkas: petunjuk dan buku nilai. Lengkap: tambah rekap siswa-ulangan, metadata ulangan dan soal snapshot, semua percobaan, semua jawaban terakhir, poin, feedback, waktu, penilai, evaluasi elemen/butir. ID stabil menghubungkan tabel; struktur disediakan terbaca dan JSON.
- Gambar menjadi teks alternatif. Tidak mengarang riwayat autosave atau perpindahan kelas. Konten panjang disimpan sebagai fragmen berurutan yang dapat direkonstruksi utuh.
- Excel multi-sheet; CSV UTF-8 BOM dalam ZIP. Guru saja, no-store, audit, proteksi formula, file tidak disimpan publik. Endpoint lama tetap kompatibel.
- Ekspor satu snapshot konsisten setelah finalisasi attempt kedaluwarsa. Maksimal 100 ulangan dan 100.000 baris keluaran termasuk fragmen; gagal dengan petunjuk filter, tidak terpotong.
- Tanpa PDF, semester permanen, bobot khusus, antrean ekspor, atau migrasi skema.
