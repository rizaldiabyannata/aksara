# Impor Excel menjadi bank soal dan draf ulangan

Status: disetujui pengguna pada 2026-10-31; selesai diimplementasikan dan diverifikasi.

## Tujuan dan keputusan pengguna

Guru mengisi template Excel yang disediakan Aksara, mengunggahnya, memeriksa hasil, lalu menyimpan soal ke bank soal sekaligus ke satu draf ulangan. Guru memeriksa dan menerbitkan ulangan sendiri. Versi awal hanya mengimpor teks; gambar ditambahkan melalui editor Aksara setelah impor. Dua keputusan tersebut sudah disetujui pengguna pada 2026-10-31.

## Pilihan rancangan yang diusulkan

- Pintu masuk dari halaman Ulangan: **Impor dari Excel**. Bank soal dapat menyediakan tautan ke alur yang sama.
- Satu file menghasilkan satu draf ulangan untuk satu mata pelajaran dan satu bab. Mata pelajaran, bab, judul, kelas tujuan, dan durasi dipilih di aplikasi, bukan diketik dalam Excel. Ini menghindari ketidakcocokan nama. Impor lintas bab ditunda; penyusunan manual tetap tersedia.
- Jenis ulangan mengikuti pilihan yang tersedia: Ulangan biasa atau Tryout TKA. Durasi awal 30 atau 75 menit sesuai jenis, batas percobaan 1, kebijakan nilai tertinggi, tanpa jadwal atau pengacakan otomatis. Pengaturan lanjutan dapat diedit di halaman draf yang sudah ada.
- Batas awal: berkas `.xlsx` maksimal 5 MB dan total 100 soal. Format lama `.xls`, `.xlsm`, PDF, OCR, gambar tertanam, dan pembuatan soal dengan AI di luar lingkup.
- Semua soal hasil impor berstatus DRAFT. Impor tidak mengaktifkan soal atau menerbitkan ulangan otomatis.

## Template

Template memiliki versi format yang diperiksa saat impor, satu lembar **Petunjuk**, satu lembar **Contoh**, dan enam lembar isian. Lembar Contoh tidak pernah diimpor; lembar tipe yang tidak digunakan boleh dibiarkan kosong. Nama dan header lembar isian harus tetap sesuai template.

Kolom umum: **Urutan**, **Soal**, **Bobot**, **Kesulitan**, **Pembahasan**, **Sumber**, **Level Kognitif**. Urutan wajib bilangan bulat positif dan unik di seluruh lembar; menentukan urutan pada ulangan. Soal wajib diisi. Bobot kosong berarti 1 (valid 1–100), kesulitan kosong berarti Sedang (Mudah/Sedang/Sulit). Pembahasan, sumber, dan level kognitif opsional; pilihan level mengikuti Pemahaman/Aplikasi/Penalaran.

| Lembar | Kolom khusus dan aturan |
| --- | --- |
| Pilihan Ganda | Opsi A–F, Kunci. Isi 2–6 opsi berurutan; kunci satu huruf opsi yang terisi. |
| Benar Salah | Kunci berupa Benar atau Salah. |
| Pilihan Ganda Kompleks | Opsi A–H, Kunci seperti `A;C`. Isi 3–8 opsi; minimal satu benar dan minimal satu salah. |
| Jawaban Singkat | Jawaban Diterima, Peka Huruf. Satu alternatif per baris dalam sel (Alt+Enter), 1–10 alternatif; Peka Huruf Ya/Tidak, kosong berarti Tidak. |
| Uraian | Pedoman Penilaian opsional; nilai diberikan guru. |
| Kategori | Pernyataan A–F, Kunci A–F, Label 1, Label 2. Isi 2–6 pernyataan berurutan; tiap kunci berisi 1 atau 2 yang merujuk label. Label kosong memakai Benar/Salah; dua label harus berbeda. |

Kolom tidak relevan tidak ada pada lembar tipe tersebut. Validasi pilihan, komentar header, lebar kolom, teks terbungkus, dan contoh membantu pengisian. Isi teks diperlakukan sebagai teks; rumus Excel tidak dieksekusi dan sel formula pada data soal ditolak dengan pesan lokasi. Jangan menerima cached formula results sebagai soal/kunci. Batas panjang dan aturan jawaban mengikuti validator domain yang berlaku; duplikasi alternatif jawaban singkat setelah normalisasi ditolak.

## Alur dan kegagalan

1. Guru memilih konteks ulangan, mengunduh template, lalu mengisi file.
2. Browser membaca file dengan ExcelJS yang dimuat saat dibutuhkan, seperti pola impor siswa. File asli tidak dikirim atau disimpan; server hanya menerima data terstruktur dengan batas ukuran request yang eksplisit dan di bawah batas deployment. Beri pesan jelas bila isi teks melebihi batas tersebut.
3. Pratinjau menampilkan jumlah soal, urutan, tipe, teks, opsi, kunci, bobot, dan kesalahan dengan nama lembar, nomor baris Excel, serta kolom. Kunci hanya ditampilkan kepada guru. Baris yang sepenuhnya kosong diabaikan; baris terisi sebagian divalidasi. Lembar tidak dikenal yang berisi data ditolak agar soal tidak diam-diam hilang.
4. Jika satu baris salah, simpan dinonaktifkan. Guru memperbaiki Excel dan memilih ulang berkas. Versi awal tidak memiliki editor sel di pratinjau.
5. Tombol **Simpan soal dan draf ulangan** menyimpan seluruh soal, ulangan, kelas tujuan, dan hubungan soal dalam satu transaksi. Gagal satu bagian berarti tidak ada data parsial. Server memvalidasi ulang identitas guru, konteks, pengaturan, jumlah, urutan, dan seluruh isi; tidak mempercayai hasil browser.
6. Setelah berhasil, buka halaman draf ulangan dengan urutan dan bobot dari Excel. Tampilkan bahwa soal masih draf dan tautan untuk memeriksa setiap soal. Guru dapat menambahkan gambar dan memakai operasi aktivasi soal yang sudah ada. Publikasi tetap menolak soal belum aktif dan kelas/pengaturan yang tidak sah.

Simpan dinonaktifkan selama request. Pengiriman ulang request yang sama harus mengembalikan hasil yang sama tanpa membuat ulangan/soal ganda, termasuk sesudah respons jaringan hilang; gunakan identitas impor yang terikat pada guru dan dijamin unik di database. Unggah sengaja sebagai impor baru menghasilkan soal baru, tidak menimpa atau menggabungkan bank soal berdasarkan teks. Keberadaan teks yang sama bukan bukti duplikasi yang aman.

## Integrasi dan batas kepercayaan

`lib/questions.ts` memiliki validator keenam tipe, pemeriksaan referensi, dan pemetaan data. `lib/quizzes.ts` memiliki validasi pengaturan, kelas, snapshot, dan publikasi. Gunakan kembali aturan tersebut melalui helper internal yang dapat menerima transaksi; hindari menyalin validator atau memanggil beberapa transaksi terpisah untuk satu impor.

Saat ini `addQuizQuestions` hanya menerima soal ACTIVE. Alur impor memerlukan operasi khusus yang menautkan soal DRAFT yang baru dibuatnya ke ulangan DRAFT dalam transaksi yang sama. Jangan melonggarkan penambahan soal biasa atau syarat publikasi. Snapshot soal/kunci tetap dibuat hanya saat publikasi; proyeksi siswa dan perhitungan nilai tidak berubah. Pemeriksaan guru harus dilakukan pada akses template, pratinjau data server bila ada, serta penyimpanan.

Tidak mencatat teks jawaban, kunci, atau seluruh payload ke log. Tidak mengambil URL atau gambar dari workbook. Semua teks buatan aplikasi dalam template tetap berupa sel string, bukan formula.

## Bukti penerimaan

- File unduhan dibaca ulang untuk memeriksa versi, nama/header lembar, petunjuk, dan pemisahan contoh dari isian.
- Parser diuji dengan keenam tipe, urutan lintas lembar, baris kosong, sel multiline, kunci salah, opsi bolong, formula, format salah, batas jumlah/ukuran, dan kesalahan berlokasi tepat.
- Integrasi database membuktikan validasi ulang server, penolakan siswa, rollback menyeluruh, bobot/urutan, status draf, request ulang tanpa duplikasi, serta penolakan publikasi sebelum aktivasi soal.
- Alur browser: unduh, unggah salah, unggah benar, konfirmasi, periksa draf, aktifkan soal, terbitkan, dan siswa mengerjakan. Pastikan kunci tidak muncul pada data siswa sebelum aturan rilis mengizinkannya.
- Verifikasi keyboard, target interaksi 44 px, dan tata letak 360 px. Jalankan Vitest dan Playwright bergantian pada database uji sesuai CLAUDE.md.

## Diserahkan kepada pelaksana

Nama modul/komponen, detail penyimpanan identitas impor, batas byte payload yang sesuai deployment, dan strategi pemakaian ulang helper diputuskan saat perencanaan implementasi. Perubahan user yang sudah ada di working tree harus dipertahankan; dokumen alur PDF sebelumnya bukan bagian dari perubahan fitur ini.
