# Alur cepat konten dan ulangan untuk guru

Status: disetujui untuk implementasi pada 2026-10-30; keputusan yang belum dijawab memakai pilihan aman di bawah.

## Tujuan

Guru yang sudah memegang buku PDF dapat menyiapkan bab, materi, soal, dan ulangan tanpa mengetik ulang isi buku atau memahami istilah teknis sistem. Alur utama harus mudah diikuti oleh guru yang kurang nyaman dengan teknologi. Tidak ada layanan AI berbayar atau biaya pemakaian per soal.

Keputusan dari percakapan: PDF buku memiliki teks yang dapat disalin; guru lebih memilih mengunggah PDF dan memilih halaman daripada menyalin teks sendiri. Guru tetap memeriksa semua isi sebelum siswa melihatnya.

Pilihan implementasi untuk dua pertanyaan yang belum dijawab: teks hasil ekstraksi menjadi draf privat untuk diperiksa dan ditulis ulang guru sebelum terbit; jika satu bab melebihi batas isi materi, guru memilih beberapa rentang halaman dan membuat beberapa materi.

## Alur yang terlihat oleh guru

1. Di halaman **Bab**, guru memilih bab yang sudah ada atau menambah judul bab. Setelah disimpan, tombol utama **Isi materi dari PDF** tersedia di bab itu.
2. Guru memilih PDF dan halaman awal serta akhir bab. Aplikasi membaca teks halaman tersebut di browser dan menampilkan hasil per halaman. PDF asli tidak dikirim atau disimpan di server.
3. Guru memeriksa teks yang diambil, menghapus bagian yang tidak diperlukan, dan membetulkan rumus atau tabel yang berantakan. Sistem mengisi bab, nama buku, edisi, dan nomor halaman dari konteks yang sudah diketahui. Guru mengisi judul materi dan meninjau ringkasan pendek yang diambil dari awal teks. Satu tombol **Simpan draf materi** menyimpan hasilnya. Materi tidak langsung terlihat oleh siswa; alur `DRAFT → REVIEWED → PUBLISHED` tetap berlaku.
4. Dari bab yang sama guru dapat membuka **Buat soal**. Mata pelajaran dan bab sudah terisi. Untuk soal yang tertulis di PDF, guru dapat memilih potongan teks hasil ekstraksi sebagai awal teks soal; guru tetap mengisi pilihan, kunci, bobot, dan meninjau soal. Soal TKA yang sudah disediakan sebagai draf tetap dapat dipilih dan diperiksa dari bank soal. Tidak ada pembuatan kunci otomatis.
5. Tombol **Buat ulangan dari bab ini** mengisi mata pelajaran dan bab. Guru memilih kelas, mencentang soal aktif yang ingin dipakai, lalu melihat ringkasan sebelum menerbitkan. Pengaturan lanjutan tetap tersedia tetapi tidak menghalangi alur biasa. Jenis Tryout TKA memakai mekanisme ulangan yang sama dengan durasi awal 75 menit.

Setiap halaman menunjukkan satu tindakan utama dan satu langkah berikutnya yang jelas. Kata seperti “snapshot”, “level kognitif”, dan “kebijakan nilai” dijelaskan dengan bahasa sederhana di dekat kontrol yang relevan, bukan di awal alur.

## Perilaku dan batasan

- Ekstraksi PDF adalah pengambilan teks, bukan penulisan atau peringkasan dengan AI. Tata letak, tabel, rumus, dan gambar mungkin tidak ikut dengan benar; hasil selalu dapat diedit dan guru wajib melihat pratinjau. Gambar tetap ditambahkan melalui mekanisme gambar yang sudah ada.
- PDF yang tidak memiliki lapisan teks menampilkan pesan jelas bahwa teks tidak dapat diambil. Guru dapat memakai isian materi biasa. Tidak ada OCR dalam lingkup ini. Jika teks melebihi batas 50.000 karakter, guru memilih rentang halaman yang lebih pendek.
- Membaca PDF dilakukan di browser agar file buku tidak tersimpan di server. Hanya teks yang guru pilih dan simpan menjadi materi/soal. Rentang halaman divalidasi; proses dapat dibatalkan tanpa mengubah data.
- Nama buku, edisi, halaman, dan bab membantu pelacakan sumber. Hak penggunaan isi buku harus dipastikan sebelum materi diterbitkan ke siswa.
- Penyimpanan tetap memakai validasi dan otorisasi server yang sekarang. Materi dan soal hasil impor selalu draf; tidak ada kunci jawaban yang dikirim ke klien siswa. Publikasi ulangan tetap membekukan snapshot soal dan kunci.
- Guru dapat melanjutkan cara lama: mengetik materi/soal satu per satu dan menyusun ulangan dari bank soal. Perubahan ini tidak mengubah data yang sudah ada.

## Lingkup implementasi

Gunakan model dan operasi bab, materi, soal, serta ulangan yang sudah ada. Tambahkan pembacaan PDF di sisi browser, pengisian awal dari konteks bab, navigasi antarlangkah, dan pemilihan beberapa soal sekaligus bila operasi yang ada belum mendukungnya. Tidak ada model baru untuk menyimpan PDF atau integrasi AI.

Urutan pengerjaan: (1) PDF ke draf materi dalam konteks bab, (2) konteks bab ke formulir soal dan potongan teks PDF, (3) pemilihan soal dan kelas yang lebih ringkas saat membuat ulangan. Setiap tahap dapat diuji oleh guru sebelum tahap berikutnya dikerjakan.

## Selesai bila

- Guru dapat membuat satu materi draf dari rentang halaman PDF yang bisa disalin teksnya tanpa mengetik ulang isi halaman.
- Guru dapat membetulkan teks hasil ekstraksi sebelum menyimpan dan melihat sumber serta halaman yang dipakai.
- Dari bab, guru dapat membuat soal dan ulangan tanpa memilih ulang mata pelajaran/bab.
- Kunci soal, status publikasi, dan izin akses tetap mengikuti aturan yang ada.
- Alur diuji pada layar ponsel dan desktop, dengan keyboard, memakai PDF teks nyata yang memiliki tabel atau rumus untuk memastikan keterbatasannya terlihat jelas.
