# Product Requirements Document (PRD)

## Web App Pembelajaran, Bank Soal, dan Ulangan Online Kelas VI SD/MI

**Versi:** 1.3 (revisi 27 Oktober 2026, lihat §22)\
**Status:** Draft siap implementasi\
**Platform:** Web responsif\
**Framework:** Next.js (full-stack)\
**Deployment aplikasi:** Vercel\
**Pengguna utama:** Guru dan siswa kelas VI SD/MI

------------------------------------------------------------------------

## 1. Ringkasan Produk

Aplikasi ini adalah platform web pembelajaran untuk kelas VI SD/MI yang
membantu satu guru mengelola materi, menyusun bank soal, membuat ulangan
online, menilai jawaban, dan memantau hasil belajar siswa. Siswa dapat
membaca materi, mengerjakan latihan, dan mengikuti ulangan dengan masuk menggunakan
kode kelas serta NIS atau nama.

Produk menggunakan dua buku sebagai sumber utama konten awal:

1.  *Matematika untuk SD/MI Kelas VI* (2022), dengan empat bab: Pecahan
    dan Desimal; Rasio; Kubus dan Balok; Peluang.
2.  *Ilmu Pengetahuan Alam dan Sosial untuk SD/MI Kelas VI (Edisi
    Revisi)* (2025), dengan enam bab: Makanan Bergizi untuk Kesehatan
    Pencernaanmu; Tarik dan Embuskan; Jejak Sang Pahlawan; Kearifan
    Lokal, Warisan Leluhur untuk Persatuan Bangsa; Energi untuk Masa
    Depan; Mengembara di Jagat Raya.

Guru bertanggung jawab memasukkan dan memverifikasi konten. Aplikasi
tidak menganggap materi yang diunggah otomatis benar atau siap
dipublikasikan. Penilaian objektif dilakukan otomatis, sedangkan jawaban
uraian diperiksa guru. Nilai menggunakan skala 0--100. Hasil siswa baru
dapat dilihat setelah guru merilisnya.

Arsitektur aplikasi menggunakan Next.js sebagai aplikasi full-stack dan
aplikasi web di-host di Vercel. Database PostgreSQL disediakan melalui
layanan database terkelola yang kompatibel dengan koneksi dari Vercel;
database tidak diasumsikan berjalan di dalam fungsi Vercel. Pengelolaan
timer mengandalkan waktu mulai dan tenggat yang diverifikasi server,
bukan proses server yang harus terus hidup.

## 2. Latar Belakang dan Masalah

Pembelajaran, materi, latihan, ulangan, dan rekap nilai sering kali
tersebar di beberapa media. Hal ini menyulitkan guru untuk menjaga
konsistensi materi, menyusun ulangan dari bank soal, memeriksa jawaban
uraian, dan merekap hasil belajar. Siswa juga membutuhkan tempat
terpusat untuk mempelajari materi dan mengerjakan penilaian.

Aplikasi ini menyatukan proses tersebut dalam satu sistem sederhana yang
berfokus pada satu guru dan siswa kelas VI yang dikelompokkan ke dalam
satu atau beberapa kelas.

## 3. Tujuan Produk

### 3.1 Tujuan utama

-   Menyediakan materi belajar yang terstruktur berdasarkan buku acuan.
-   Menyediakan bank soal yang dapat digunakan kembali untuk latihan dan
    ulangan.
-   Memungkinkan guru membuat ulangan online dengan durasi, batas
    percobaan, dan pengacakan.
-   Menghitung nilai soal objektif secara otomatis.
-   Memfasilitasi penilaian manual untuk soal uraian.
-   Menyediakan rekap nilai dan rincian jawaban yang dapat diekspor ke
    Excel.
-   Memberi guru kendali atas kapan nilai dan hasil ulangan dapat
    dilihat siswa.
-   Memberi guru pilihan kebijakan nilai untuk percobaan berulang:
    nilai tertinggi atau remedial dengan batas KKM.

### 3.2 Indikator keberhasilan

-   Guru dapat membuat, memeriksa, dan memublikasikan materi tanpa
    bantuan teknis.
-   Guru dapat membuat ulangan dari bank soal dan menetapkan durasi
    serta batas percobaan.
-   Jawaban objektif dinilai konsisten sesuai kunci jawaban.
-   Jawaban uraian yang belum diperiksa tidak dianggap sebagai nilai
    final.
-   Siswa tidak dapat melihat hasil sebelum guru merilisnya.
-   File Excel yang diunduh konsisten dengan data di aplikasi.
-   Aplikasi dapat digunakan melalui desktop, tablet, dan ponsel.

## 4. Pengguna dan Hak Akses

### 4.1 Guru

Guru merupakan pengelola utama aplikasi dan bertanggung jawab atas
akurasi materi.

Guru dapat:

-   Membuat dan mengelola kelas beserta kode kelasnya.
-   Membuat dan mengelola akun siswa (nama, NIS opsional, dan kelas).
-   Mengeluarkan siswa dari semua perangkat dan menonaktifkan akun siswa.
-   Membuat dan mengedit mata pelajaran, bab, subbab, materi, ringkasan,
    contoh, latihan, dan gambar pendukung.
-   Meninjau serta memverifikasi materi sebelum dipublikasikan.
-   Membuat, mengedit, dan mengelola bank soal, termasuk soal bergambar.
-   Membuat ulangan dan menentukan kelas tujuan, durasi, jumlah
    percobaan, pengacakan, jadwal, kebijakan nilai, serta KKM.
-   Memantau status pengerjaan.
-   Membukakan percobaan pengganti bagi siswa yang mengalami kendala
    teknis.
-   Memeriksa jawaban uraian dan memberikan nilai serta umpan balik.
-   Merilis hasil ulangan kepada siswa dan membatalkan rilis bila perlu.
-   Mengekspor rekap nilai dan rincian jawaban ke Excel.

### 4.2 Siswa

Siswa dapat:

-   Login menggunakan kode kelas dan NIS atau nama.
-   Melihat materi yang sudah dipublikasikan.
-   Mempelajari ringkasan, contoh, dan latihan.
-   Melihat ulangan untuk kelasnya yang sedang tersedia atau telah
    dijadwalkan.
-   Mengerjakan ulangan dalam durasi yang ditentukan.
-   Mengerjakan remedial atau percobaan pengganti bila tersedia.
-   Melihat status pengerjaan dan, setelah dirilis guru, hasil serta
    umpan balik yang diizinkan.

Siswa tidak dapat:

-   Mengakses materi berstatus draft, termasuk gambarnya.
-   Mengakses kunci jawaban, pembahasan, atau rubrik internal guru
    sebelum diizinkan.
-   Mengakses ulangan yang tidak ditujukan untuk kelasnya.
-   Mengubah jawaban setelah ulangan dikumpulkan atau waktu habis.
-   Melihat nilai dan rincian hasil sebelum guru merilis hasil.
-   Mengakses data siswa lain.

## 5. Ruang Lingkup

### 5.1 Termasuk dalam MVP

1.  Autentikasi guru (username dan kata sandi) dan siswa (kode kelas
    serta NIS atau nama).
2.  Pengelolaan kelas dan kode kelas.
3.  Pengelolaan akun siswa.
4.  Pengelolaan mata pelajaran, bab, subbab, dan materi.
5.  Status materi: draft, sudah ditinjau, dan dipublikasikan.
6.  Ringkasan, contoh, latihan berbentuk teks, dan gambar pendukung.
7.  Bank soal dengan kategori mata pelajaran, bab, subbab, tingkat
    kesulitan, dan tipe soal, termasuk gambar pada soal, opsi, dan
    pembahasan.
8.  Pembuatan ulangan dari bank soal untuk kelas tertentu.
9.  Timer ulangan berbasis waktu server.
10. Pengacakan urutan soal dan opsi jawaban.
11. Penyimpanan jawaban berkala dan pengumpulan otomatis saat tenggat.
12. Penilaian otomatis untuk tipe soal objektif yang didukung.
13. Penilaian manual untuk soal uraian.
14. Perhitungan nilai akhir skala 0--100.
15. Pengaturan batas percobaan ulangan oleh guru.
16. Kebijakan nilai per ulangan: nilai tertinggi atau remedial dengan
    KKM.
17. Percobaan pengganti untuk siswa yang mengalami kendala teknis.
18. Publikasi hasil secara manual oleh guru, termasuk pembatalan rilis.
19. Ekspor Excel untuk rekap nilai dan rincian jawaban.
20. Dasbor sederhana untuk guru dan siswa.
21. Tampilan responsif dan aksesibilitas dasar.

### 5.2 Tidak termasuk dalam MVP

-   Banyak sekolah atau organisasi dengan pemisahan tenant.
-   Integrasi dengan LMS eksternal.
-   Integrasi sistem akademik atau rapor sekolah.
-   Kelas virtual/video conference.
-   Proktor ujian berbasis kamera atau pemantauan layar.
-   Aplikasi Android/iOS native.
-   Pembayaran, langganan, atau marketplace materi.
-   Penilaian uraian menggunakan AI sebagai penentu nilai final.
-   Analitik prediktif atau rekomendasi belajar berbasis machine
    learning.
-   Latihan interaktif yang dinilai sistem; latihan MVP berupa teks di
    dalam materi.
-   Penghapusan permanen akun siswa.
-   Impor akun siswa secara massal.
-   Jadwal atau rilis hasil yang berbeda per kelas untuk satu ulangan.

## 6. Struktur Konten Awal

Struktur berikut mengikuti judul bab pada buku acuan. Rincian subbab dan
aktivitas harus diperiksa langsung terhadap buku sebelum dipublikasikan.
Jangan membuat subbab seolah-olah berasal dari buku jika belum
diverifikasi.

### 6.1 Matematika kelas VI

Sumber: *Matematika untuk SD/MI Kelas VI* (2022).

  Bab   Judul
  ----- ---------------------
  1     Pecahan dan Desimal
  2     Rasio
  3     Kubus dan Balok
  4     Peluang

Materi dapat disusun menggunakan bagian yang relevan dari buku, seperti
tujuan pembelajaran, pengantar, kata kunci, eksplorasi, latihan,
refleksi, uji kompetensi, pengayaan, dan proyek apabila tersedia pada
bagian bab terkait.

### 6.2 IPAS kelas VI

Sumber: *Ilmu Pengetahuan Alam dan Sosial untuk SD/MI Kelas VI (Edisi
Revisi)* (2025).

  Bab   Judul
  ----- --------------------------------------------------------
  1     Makanan Bergizi untuk Kesehatan Pencernaanmu
  2     Tarik dan Embuskan
  3     Jejak Sang Pahlawan
  4     Kearifan Lokal, Warisan Leluhur untuk Persatuan Bangsa
  5     Energi untuk Masa Depan
  6     Mengembara di Jagat Raya

Materi dapat memanfaatkan struktur pembelajaran buku, seperti pertanyaan
esensial, tujuan pembelajaran, aktivitas siap belajar,
mengamati/membaca/menyelidiki/menyimpulkan, bacaan pendalaman,
tantangan, uji kompetensi, dan refleksi jika tersedia pada bab terkait.

### 6.3 Ketentuan editorial

-   Guru memasukkan dan memverifikasi konten secara manual.
-   Setiap materi menyimpan sumber buku, tahun/edisi, bab, dan jika
    tersedia nomor halaman.
-   Konten yang belum diperiksa tetap berstatus draft.
-   Teks, gambar, dan soal dari buku harus digunakan sesuai izin dan
    ketentuan hak cipta yang berlaku.
-   Sistem menyimpan pembuat dan waktu perubahan konten untuk keperluan
    audit.
-   Gambar yang diambil dari buku dicatat sumbernya dan wajib memiliki
    teks alternatif.

## 7. Persyaratan Fungsional

### 7.1 Autentikasi, akun, dan kelas

Revisi v1.3: login siswa tidak lagi memakai username dan password.

#### Login guru

-   Guru login melalui halaman khusus guru dengan username dan kata
    sandi.
-   Kata sandi guru disimpan sebagai hash (Argon2id atau bcrypt), bukan
    teks biasa.
-   Akun guru dibuat melalui proses seed yang aman; tidak ada endpoint
    publik untuk mendaftarkan guru.

#### Login siswa

-   Siswa login dengan **kode kelas** dan **NIS atau nama**. Siswa tidak
    memakai kata sandi maupun email.
-   Input yang seluruhnya angka dibaca sebagai NIS; selain itu dibaca
    sebagai nama.
-   Nama dan NIS dinormalisasi: spasi di awal/akhir dihapus, spasi
    beruntun dirapikan, dan perbedaan huruf besar/kecil diabaikan.
-   Nama login harus unik dalam satu kelas dan tidak boleh hanya berisi
    angka. NIS bersifat opsional dan, bila diisi, unik di seluruh
    aplikasi.
-   Setiap siswa hanya memiliki **satu sesi aktif**. Login baru mencabut
    sesi sebelumnya; siswa yang terputus diberi tahu, dan guru melihat
    peringatan "login dari perangkat lain".
-   Sesi siswa berlaku paling lama 8 jam karena komputer sekolah dapat
    dipakai bergantian.
-   **Risiko yang diterima:** siswa yang mengetahui kode kelas serta
    nama atau NIS temannya dapat masuk sebagai teman tersebut. Mitigasi
    MVP adalah satu sesi aktif per siswa dan peringatan kepada guru.

#### Kelas

-   Guru membuat kelas (misalnya VI A dan VI B). Setiap kelas memiliki
    kode kelas acak 6 karakter yang unik dan tidak memuat karakter yang
    mudah tertukar (O/0, I/1/L).
-   Guru dapat mengganti kode kelas; kode lama langsung tidak berlaku
    untuk login baru.
-   Guru dapat mengeluarkan semua siswa suatu kelas dari perangkatnya dan
    menonaktifkan kelas.
-   Setiap siswa termasuk tepat satu kelas. Materi berlaku untuk semua
    kelas; ulangan ditujukan ke kelas tertentu.

#### Akun siswa

-   Guru membuat siswa dengan nama, NIS (opsional), dan kelas, serta
    dapat mengubah data atau memindahkan kelas.
-   Guru dapat mengeluarkan siswa dari semua perangkat dan menonaktifkan
    akun. Akun tidak dihapus permanen; nilai dan jawaban tetap tersimpan.

#### Ketentuan umum

-   Sistem membatasi percobaan login per identitas dan per alamat IP.
    Ambang per IP dibuat longgar karena satu kelas biasanya memakai satu
    IP sekolah.
-   Pesan kesalahan tidak membocorkan apakah kode kelas, nama, NIS, atau
    username tertentu terdaftar.
-   Sesi disimpan di database dan dirujuk dengan cookie `HttpOnly`,
    `Secure` di produksi, dan `SameSite` yang sesuai, sehingga sesi
    dapat dicabut.
-   Semua operasi server memeriksa autentikasi dan otorisasi;
    menyembunyikan tombol di UI saja tidak cukup.

### 7.2 Pengelolaan materi

Setiap materi setidaknya memiliki:

-   Judul.
-   Mata pelajaran.
-   Bab dan opsional subbab.
-   Ringkasan.
-   Isi materi.
-   Contoh atau aktivitas.
-   Latihan berbentuk teks (opsional).
-   Gambar pendukung (opsional).
-   Referensi sumber dan nomor halaman bila tersedia.
-   Status publikasi.
-   Pembuat, pengubah terakhir, dan waktu perubahan.

Status materi:

-   `DRAFT`: hanya guru dapat melihat.
-   `REVIEWED`: sudah ditinjau guru, tetapi belum tersedia untuk siswa.
-   `PUBLISHED`: dapat dilihat siswa.

Materi harus melewati `REVIEWED` sebelum `PUBLISHED`; `DRAFT` tidak
dapat langsung dipublikasikan. Materi terpublikasi dapat ditarik kembali
ke `DRAFT`.

Guru dapat melihat pratinjau materi sebelum publikasi. Perubahan pada
materi yang sudah dipublikasikan harus tetap tercatat dalam metadata
audit sederhana.

Latihan pada MVP berupa teks di dalam materi dan tidak dinilai sistem.
Latihan interaktif ditunda karena dapat membocorkan kunci soal bank yang
juga dipakai ulangan.

#### Gambar pendukung

-   Gambar dapat disisipkan pada materi dan pada soal (lihat 7.3).
-   Format yang diterima: JPEG, PNG, dan WebP. SVG ditolak. Tipe berkas
    diperiksa dari isinya, bukan dari ekstensi.
-   Gambar diproses ulang di server untuk menghapus metadata (termasuk
    lokasi GPS) dan membatasi ukuran.
-   Setiap gambar wajib memiliki teks alternatif dan dapat mencatat
    sumbernya.
-   Gambar disimpan di object storage privat (Cloudflare R2) dan tidak
    pernah diberikan lewat URL publik permanen. Akses dilakukan melalui
    rute terotorisasi yang mengalihkan ke URL bertanda tangan dengan masa
    berlaku 5 menit.
-   Siswa hanya dapat membuka gambar dari materi yang sudah `PUBLISHED`.

### 7.3 Bank soal

Setiap soal memiliki:

-   Mata pelajaran, bab, dan opsional subbab.
-   Tipe soal.
-   Teks soal.
-   Opsi jawaban jika relevan.
-   Kunci jawaban.
-   Bobot poin (bilangan bulat).
-   Tingkat kesulitan (misalnya mudah, sedang, sulit).
-   Penjelasan jawaban atau pembahasan (opsional).
-   Gambar pada teks soal, opsi, atau pembahasan (opsional).
-   Status draft/aktif.
-   Sumber soal dan catatan verifikasi (opsional).

Tipe soal MVP:

1.  Pilihan ganda satu jawaban.
2.  Benar/salah.
3.  Pilihan ganda kompleks / multiple select.
4.  Jawaban singkat dengan pencocokan jawaban yang telah ditentukan.
5.  Uraian yang dinilai guru.

Pencocokan jawaban singkat: spasi di awal/akhir dihapus, spasi beruntun
dirapikan menjadi satu, lalu jawaban dibandingkan persis dengan salah
satu jawaban yang diterima. Aturan kapitalisasi ditentukan per soal.
Jangan menggunakan pencocokan fuzzy yang dapat menimbulkan nilai keliru
tanpa keputusan eksplisit guru.

Aturan multiple select:

-   Nilai penuh hanya diberikan jika semua opsi benar dipilih dan tidak
    ada opsi salah yang dipilih.
-   Selain kondisi tersebut, nilai adalah nol.
-   Tidak ada nilai parsial pada MVP.

Gambar pada soal: opsi boleh berupa gambar, tetapi teks alternatifnya
tidak boleh membocorkan jawaban. Gambar pada pembahasan diperlakukan
seperti kunci jawaban dan tidak dikirim ke siswa sebelum diizinkan.

### 7.4 Pembuatan ulangan

Guru dapat menentukan:

-   Judul dan petunjuk.
-   Mata pelajaran serta cakupan bab.
-   Kelas tujuan (minimal satu).
-   Soal yang dipilih dari bank soal.
-   Bobot setiap soal.
-   Durasi ulangan.
-   Jadwal mulai dan akhir, bila menggunakan penjadwalan.
-   Batas percobaan per siswa.
-   Kebijakan nilai: **Nilai tertinggi** atau **Remedial** (lihat 7.7).
-   KKM (0--100), wajib bila kebijakan Remedial.
-   Pengacakan urutan soal.
-   Pengacakan opsi untuk tipe soal yang sesuai.
-   Apakah pembahasan/umpan balik ditampilkan setelah hasil dirilis.
-   Kebijakan publikasi hasil (manual).

Setelah ulangan dipublikasikan, konfigurasi dan konten soal yang
digunakan harus disimpan sebagai snapshot atau versi tetap, termasuk
gambar yang dipakai soal. Perubahan bank soal sesudahnya, termasuk
mengganti atau menghapus gambar, tidak boleh mengubah ulangan yang
sedang atau telah dikerjakan siswa.

Setelah dipublikasikan, soal, bobot, durasi, dan pengacakan terkunci.
Yang masih boleh diubah: judul, petunjuk, memperpanjang jadwal akhir,
menambah kelas tujuan, menaikkan batas percobaan, serta kebijakan nilai
dan KKM. Ulangan yang belum memiliki percobaan dapat dikembalikan ke
draft.

Kebijakan Remedial mensyaratkan KKM terisi dan batas percobaan minimal 2.

### 7.5 Timer, autosave, dan pengumpulan

-   Timer menggunakan timestamp server sebagai sumber kebenaran.
-   Saat percobaan dimulai, server menyimpan `started_at` dan
    `deadline_at`.
-   Tenggat adalah waktu mulai ditambah durasi, atau jadwal akhir ulangan
    bila jadwal akhir lebih awal.
-   UI menampilkan hitung mundur berdasarkan deadline yang diberikan
    server, tetapi klien tidak menjadi sumber kebenaran untuk menentukan
    apakah waktu masih tersisa.
-   Jawaban disimpan berkala dan ketika siswa berpindah soal, bila
    memungkinkan.
-   Server memberi **toleransi jaringan 60 detik** setelah tenggat untuk
    menerima simpanan jawaban dan pengumpulan yang terlambat tiba. Hitung
    mundur di layar tetap berakhir pada tenggat, dan saat itu aplikasi
    langsung mengirim simpanan terakhir lalu mengumpulkan jawaban.
-   Server menolak perubahan jawaban yang tiba setelah tenggat ditambah
    toleransi.
-   Setelah tenggat dan toleransi lewat, percobaan dikunci dan jawaban
    objektif yang sudah tersimpan dinilai. Penguncian dilakukan oleh
    request berikutnya yang menyentuh percobaan tersebut, termasuk saat
    guru membuka pemantauan, rekap, rilis, atau ekspor.
-   Jika siswa menutup browser atau koneksi terputus, jawaban terakhir
    yang berhasil tersimpan tetap dipertahankan.
-   Sistem harus mengantisipasi pengiriman jawaban berulang dengan
    operasi idempoten agar autosave dan submit tidak membuat duplikasi.
-   Timer tidak bergantung pada fungsi server yang terus berjalan.
    Vercel Functions bersifat request-driven; tenggat dihitung dari
    timestamp dan diverifikasi pada setiap request.

### 7.6 Percobaan ulangan

-   Guru menentukan batas percobaan untuk setiap ulangan.
-   Sistem menghitung percobaan yang telah dimulai, termasuk percobaan
    yang terkumpul otomatis saat waktu habis, kecuali percobaan yang
    diganti guru.
-   Sistem tidak mengizinkan percobaan baru setelah batas tercapai.
-   Percobaan pertama adalah **percobaan utama**.
-   Pada kebijakan **Nilai tertinggi**, siswa dapat mengulang selama batas
    belum tercapai.
-   Pada kebijakan **Remedial**, percobaan berikutnya hanya dapat dimulai
    bila hasil sudah dirilis, semua percobaan sebelumnya sudah dinilai
    final, nilai utama di bawah KKM, dan belum ada remedial yang mencapai
    KKM.
-   **Percobaan pengganti**: bila percobaan siswa bermasalah (misalnya
    karena error), guru dapat membukakan percobaan pengganti dengan
    catatan alasan.
    -   Percobaan yang diganti dikunci dan tidak dihitung dalam batas
        percobaan maupun nilai, tetapi datanya tetap tersimpan.
    -   Percobaan pengganti dimulai dari awal dengan durasi penuh, tetap
        dibatasi jadwal akhir, dan menempati posisi percobaan yang
        diganti. Pengganti percobaan utama tetap dihitung sebagai
        percobaan utama.
    -   Pemberian percobaan pengganti dicatat di audit log.
-   Guru dapat melihat status setiap percobaan: belum mulai, sedang
    dikerjakan, terkumpul, dinilai sebagian, dinilai final, atau diganti.

### 7.7 Penilaian dan nilai akhir

-   Soal objektif dinilai otomatis berdasarkan kunci jawaban yang
    tersimpan pada snapshot ulangan.
-   Jawaban uraian menunggu pemeriksaan guru, termasuk jawaban uraian
    yang kosong (tidak otomatis bernilai nol).
-   Guru dapat memberi skor dan umpan balik untuk setiap jawaban uraian.
    Skor boleh pecahan hingga dua desimal (misalnya 2,5).
-   Sistem membedakan nilai sementara dan nilai final.
-   Jika masih ada uraian yang belum dinilai, status hasil adalah
    `PENDING_MANUAL_GRADING`.
-   Nilai akhir ditampilkan pada skala 0--100.

Rumus nilai per percobaan:

`nilai_akhir = (total_poin_diperoleh / total_poin_maksimum) × 100`

-   Pembulatan tampilan menggunakan dua angka desimal secara default.
-   Jika total poin maksimum nol atau konfigurasi soal tidak valid,
    ulangan tidak dapat dipublikasikan.
-   Nilai final harus dihitung ulang secara konsisten setelah guru
    menyelesaikan penilaian uraian.
-   Perubahan nilai manual dicatat bersama pengguna dan waktu perubahan.

#### Nilai rekap untuk beberapa percobaan

Nilai rekap dihitung dari percobaan yang tidak diganti, sesuai kebijakan
nilai ulangan:

-   **Nilai tertinggi**: nilai rekap adalah nilai tertinggi dari semua
    percobaan.
-   **Remedial**: bila nilai utama ≥ KKM, nilai rekap adalah nilai utama.
    Bila nilai utama < KKM, nilai remedial dibatasi maksimal KKM:

`nilai_rekap = max(nilai_utama, min(nilai_remedial_tertinggi, KKM))`

| Contoh (KKM 75) | Nilai utama | Nilai remedial | Nilai rekap |
|---|---|---|---|
| Tuntas di percobaan utama | 82 | --- | 82 |
| Remedial melampaui KKM | 60 | 90 | 75 |
| Remedial naik tetapi belum tuntas | 60 | 70 | 70 |
| Remedial lebih rendah | 60 | 55 | 60 |

-   Nilai asli setiap percobaan tetap disimpan dan ditampilkan;
    pembatasan KKM hanya berlaku pada nilai rekap.
-   Ketuntasan: "Tuntas" bila nilai rekap ≥ KKM, selain itu "Belum
    tuntas".
-   Kebijakan nilai dan KKM dapat diubah kapan pun. Nilai rekap dihitung
    ulang otomatis, dan perubahan dicatat di audit log.
-   Nilai rekap baru final bila semua percobaan yang dihitung sudah
    dinilai final.

### 7.8 Publikasi hasil

-   Hasil siswa disembunyikan secara default.
-   Guru melakukan aksi eksplisit "Rilis Hasil" per ulangan; rilis
    berlaku untuk semua kelas tujuan.
-   Rilis ditolak selama masih ada percobaan yang sedang dikerjakan atau
    jawaban uraian yang belum dinilai.
-   Sebelum dirilis, siswa tidak dapat melihat nilai, kunci jawaban,
    pembahasan, ataupun rincian jawaban yang ditandai internal.
-   Setelah dirilis, siswa dapat melihat nilai, nilai rekap, KKM,
    ketuntasan, dan informasi yang dipilih guru untuk ditampilkan.
-   Waktu rilis dan pengguna yang melakukan rilis disimpan.
-   Guru dapat **membatalkan rilis**. Hasil kembali tersembunyi dari
    siswa dan remedial baru tidak dapat dimulai. Pembatalan dicatat di
    audit log, dan rilis ulang memeriksa syarat yang sama.

### 7.9 Ekspor Excel

Sistem menyediakan file `.xlsx` dengan dua sheet utama.

#### Sheet 1: `Rekap Nilai`

Kolom minimum:

-   Nomor.
-   Kelas.
-   NIS.
-   Nama siswa.
-   Mata pelajaran.
-   Judul ulangan.
-   Jumlah percobaan yang digunakan.
-   Kebijakan nilai dan KKM.
-   Nilai utama.
-   Nilai tertinggi asli (tanpa batas KKM).
-   Total poin diperoleh.
-   Total poin maksimum.
-   Nilai rekap skala 0--100.
-   Ketuntasan.
-   Status penilaian.
-   Waktu pengumpulan.
-   Status publikasi hasil.

#### Sheet 2: `Rincian Jawaban`

Kolom minimum:

-   Kelas.
-   NIS.
-   Nama siswa.
-   Judul ulangan.
-   Percobaan ke- (utama, remedial, diganti, atau pengganti).
-   Nomor soal.
-   ID soal atau referensi internal.
-   Tipe soal.
-   Jawaban siswa.
-   Kunci jawaban (khusus ekspor guru).
-   Poin maksimum.
-   Poin diperoleh.
-   Status penilaian.
-   Catatan/umpan balik guru.

Ketentuan ekspor:

-   Ekspor hanya dapat dilakukan guru.
-   File mengikuti filter yang dipilih, seperti ulangan, mata pelajaran,
    dan kelas.
-   Nilai belum final ditandai secara eksplisit, bukan disajikan
    seolah-olah final.
-   Sheet rincian jawaban dapat memuat kunci jawaban karena file hanya
    ditujukan untuk guru.
-   Waktu ditulis dalam zona waktu WITA.
-   Gambar dalam teks soal atau opsi ditulis sebagai teks
    `[gambar: teks alternatif]`.
-   Gunakan pustaka `ExcelJS` atau pustaka `.xlsx` yang kompatibel dengan
    runtime Node.js pada Vercel.
-   Terapkan proteksi terhadap formula injection: teks dari pengguna yang
    diawali `=`, `+`, `-`, atau `@` harus ditangani sebagai teks, bukan
    formula.
-   Ekspor dibangkitkan melalui request yang terotorisasi; jangan membuat
    file publik yang dapat diakses tanpa autentikasi.

## 8. Alur Pengguna

### 8.1 Alur guru

1.  Login.
2.  Membuat kelas, membuat akun siswa, lalu membagikan kode kelas.
3.  Membuat atau memeriksa mata pelajaran dan struktur bab.
4.  Menambahkan materi, gambar, dan referensi sumber.
5.  Meninjau lalu memublikasikan materi.
6.  Menambahkan soal ke bank soal dan memeriksa kunci.
7.  Membuat ulangan: memilih kelas tujuan dan soal, lalu menetapkan
    durasi, batas percobaan, pengacakan, kebijakan nilai, dan KKM.
8.  Memublikasikan ulangan.
9.  Memantau pengerjaan dan membukakan percobaan pengganti bila ada
    kendala teknis.
10. Memeriksa jawaban uraian.
11. Memastikan nilai final.
12. Merilis hasil.
13. Memantau remedial bila kebijakan ulangan adalah Remedial.
14. Mengekspor rekap dan rincian jawaban ke Excel.

### 8.2 Alur siswa

1.  Login dengan kode kelas serta NIS atau nama.
2.  Melihat dasbor dan ulangan yang tersedia untuk kelasnya.
3.  Membaca materi yang telah dipublikasikan.
4.  Membuka ulangan dan membaca petunjuk.
5.  Memulai percobaan; server membuat timestamp dan deadline.
6.  Menjawab soal; jawaban tersimpan berkala.
7.  Mengumpulkan jawaban atau membiarkan sistem mengunci saat waktu
    habis.
8.  Melihat status penilaian.
9.  Melihat hasil setelah guru merilisnya.
10. Mengerjakan remedial atau percobaan pengganti bila tersedia.

## 9. User Stories dan Kriteria Penerimaan

### 9.1 Materi

-   Sebagai guru, saya ingin menyimpan materi sebagai draft agar konten
    dapat diperiksa sebelum siswa melihatnya.
-   Sebagai siswa, saya ingin melihat materi terpublikasi berdasarkan
    mata pelajaran dan bab agar saya dapat belajar secara terstruktur.

Kriteria penerimaan: - Materi draft tidak muncul pada daftar siswa. -
Siswa yang mencoba mengakses URL materi draft tetap ditolak oleh
server. - Materi terpublikasi menampilkan judul, isi, ringkasan, dan
referensi yang disediakan guru.

### 9.2 Bank soal dan ulangan

-   Sebagai guru, saya ingin memilih soal dari bank soal agar dapat
    menyusun ulangan tanpa menulis ulang pertanyaan.
-   Sebagai guru, saya ingin menetapkan durasi dan batas percobaan agar
    ulangan mengikuti ketentuan yang saya buat.
-   Sebagai siswa, saya ingin jawaban tersimpan berkala agar risiko
    kehilangan jawaban berkurang.

Kriteria penerimaan: - Ulangan yang tidak valid tidak dapat
dipublikasikan. - Soal pada ulangan terpublikasi tidak berubah jika bank
soal diedit kemudian. - Percobaan baru ditolak setelah batas percobaan
tercapai. - Deadline diperiksa server, bukan hanya timer di browser. -
Jawaban yang tersimpan sebelum deadline tetap tersedia ketika siswa
kembali ke halaman ulangan.

### 9.3 Penilaian dan rilis hasil

-   Sebagai guru, saya ingin soal objektif dinilai otomatis dan uraian
    dinilai manual.
-   Sebagai guru, saya ingin merilis hasil secara terpisah agar siswa
    tidak melihat nilai sebelum waktunya.
-   Sebagai siswa, saya ingin melihat hasil ketika guru sudah
    mengizinkan.

Kriteria penerimaan: - Jawaban objektif dinilai sesuai kunci pada
snapshot ulangan. - Multiple select hanya mendapat nilai penuh jika
semua pilihan benar dipilih tanpa pilihan salah. - Ulangan dengan uraian
yang belum dinilai berstatus belum final. - Sebelum rilis, endpoint
hasil menolak permintaan siswa dan UI tidak menampilkan nilai. - Setelah
rilis, siswa hanya dapat mengakses hasil miliknya sendiri.

### 9.4 Ekspor

Kriteria penerimaan: - Hanya guru terautentikasi yang dapat mengunduh
ekspor. - Workbook memuat sheet `Rekap Nilai` dan `Rincian Jawaban`. -
Nilai, status, dan rincian sesuai data aplikasi. - Data teks pengguna
tidak dieksekusi sebagai formula spreadsheet.

### 9.5 Contoh pengujian nilai

-   Jika total poin diperoleh 36 dari maksimum 40, nilai skala 100
    adalah 90.
-   Jika satu jawaban uraian belum diperiksa, hasil tidak ditandai
    final.
-   Jika siswa mencapai batas percobaan, server menolak percobaan
    berikutnya.
-   Jika ulangan berakhir, pengumpulan otomatis tidak dapat menghasilkan
    percobaan ganda.
-   Jika hasil belum dirilis guru, siswa tidak dapat melihat nilai.
-   Jika jawaban multiple select memuat pilihan salah atau melewatkan
    pilihan benar, poinnya nol.
-   Pada kebijakan Remedial dengan KKM 75, nilai utama 60 dan nilai
    remedial 90 menghasilkan nilai rekap 75.
-   Skor uraian 2,5 dari 5 tersimpan dan dihitung tanpa pembulatan.

### 9.6 Akun, kelas, dan sesi

-   Sebagai guru, saya ingin siswa masuk cukup dengan kode kelas dan
    NIS atau nama agar anak tidak perlu mengingat kata sandi.
-   Sebagai guru, saya ingin tahu bila akun siswa dipakai di perangkat
    lain.

Kriteria penerimaan:

-   Siswa dapat login dengan kode kelas + NIS dan dengan kode kelas +
    nama; perbedaan huruf besar/kecil dan spasi ganda tidak berpengaruh.
-   NIS yang benar dengan kode kelas lain ditolak.
-   Login kedua untuk siswa yang sama mencabut sesi pertama, dan guru
    melihat peringatannya.
-   Setelah kode kelas diganti, kode lama ditolak untuk login baru.
-   Siswa dari kelas yang bukan tujuan ulangan tidak dapat melihat atau
    memulai ulangan tersebut.

### 9.7 Remedial, percobaan pengganti, dan toleransi

Kriteria penerimaan:

-   Pada kebijakan Remedial, siswa dengan nilai utama ≥ KKM atau yang
    hasilnya belum dirilis tidak dapat memulai percobaan berikutnya.
-   Setelah guru membukakan percobaan pengganti, siswa dapat memulai
    lagi walau batas percobaan sudah tercapai, dan percobaan yang
    diganti tidak masuk rekap.
-   Simpanan jawaban yang tiba 30 detik setelah tenggat diterima; yang
    tiba lebih dari 60 detik setelah tenggat ditolak.
-   Setelah rilis dibatalkan, siswa kembali tidak dapat melihat hasil.

### 9.8 Gambar

Kriteria penerimaan:

-   Siswa tidak dapat membuka gambar materi draft walau mengetahui URL
    gambarnya.
-   Gambar soal hanya dapat dibuka siswa saat mengerjakan ulangan itu
    atau setelah hasil dirilis; gambar pembahasan hanya setelah rilis
    bila pembahasan ditampilkan.
-   Mengganti gambar soal di bank soal tidak mengubah gambar pada ulangan
    yang sudah dipublikasikan.
-   File SVG atau file yang isinya tidak sesuai ekstensinya ditolak.

## 10. Rekomendasi Teknologi

### 10.1 Aplikasi

-   Next.js App Router.
-   TypeScript.
-   React Server Components untuk halaman yang sesuai.
-   Server Actions dan/atau Route Handlers untuk mutasi dan endpoint
    yang memerlukan kontrol request/response.
-   Validasi input menggunakan Zod.
-   ORM: Prisma.
-   Database: PostgreSQL terkelola yang dapat diakses dari Vercel.
-   Pembuatan file Excel: ExcelJS.
-   Penyimpanan gambar: Cloudflare R2 (API kompatibel S3).
-   Autentikasi: dibuat sendiri dengan sesi di database; kata sandi guru
    di-hash dengan Argon2id. Library auth umum tidak dipakai karena login
    siswa memakai kode kelas tanpa kata sandi.
-   Pengujian unit/integrasi: Vitest atau Jest, sesuai kompatibilitas
    proyek.
-   Pengujian browser end-to-end: Playwright.

### 10.2 Hosting dan infrastruktur

-   Aplikasi Next.js di-deploy ke Vercel.
-   Source code disimpan di GitHub dan deployment dihubungkan ke
    repository.
-   Database PostgreSQL berada pada layanan terkelola terpisah yang
    kompatibel dengan Vercel. Vercel bukan pengganti database persisten.
-   Gunakan koneksi database pooling/serverless yang direkomendasikan
    penyedia database.
-   Gunakan environment variables Vercel untuk secret dan kredensial.
-   Pisahkan environment development, preview, dan production.
-   Jangan menyimpan unggahan pengguna atau data persisten hanya di
    filesystem lokal fungsi Vercel.
-   Gambar materi dan soal disimpan di Cloudflare R2 dengan bucket privat
    terpisah untuk development, preview, dan production. Kredensial R2
    hanya disimpan di environment variables.

### 10.3 Pola arsitektur

Aplikasi full-stack Next.js dapat menggunakan struktur berikut:

``` text
Browser (Guru/Siswa)
        |
        v
Next.js App Router di Vercel
  ├── Pages / Server Components
  ├── Server Actions
  ├── Route Handlers (/api/...)
  ├── Auth & Authorization
  ├── Domain Services
  └── Prisma Client
        |
        v
PostgreSQL terkelola
```

Tidak diperlukan aplikasi frontend React/Vite terpisah atau backend
Express terpisah untuk MVP. Route Handlers dan Server Actions berjalan
sebagai bagian aplikasi Next.js.

### 10.4 Catatan runtime Vercel

-   Jangan menjalankan timer ulangan dengan `setTimeout` atau proses
    Node.js yang harus hidup selama durasi ulangan.
-   Simpan `started_at` dan `deadline_at` di database; setiap request
    memeriksa tenggat terhadap waktu server.
-   Autosave jawaban dilakukan melalui request pendek yang idempoten.
-   Hindari request ekspor Excel yang terlalu besar. Batasi cakupan
    ekspor atau pertimbangkan ekspor bertahap jika jumlah data membesar.
-   Fungsi serverless dapat mengalami cold start dan memiliki batas
    durasi serta ukuran respons sesuai paket/konfigurasi Vercel. Uji
    kebutuhan nyata dan periksa batas paket yang sedang digunakan.
-   Jika nanti dibutuhkan pekerjaan latar belakang, antrean, atau
    pengiriman terjadwal yang panjang, evaluasi layanan khusus; jangan
    mengasumsikan fungsi Next.js selalu berjalan setelah request
    selesai.
-   Pilih versi runtime Node.js dan konfigurasi Prisma yang kompatibel
    dengan Vercel, lalu uji build dan query database pada deployment
    preview sebelum produksi.

## 11. Struktur Route dan Modul

Rancangan awal App Router:

``` text
app/
  (auth)/
    login/
      page.tsx
  (teacher)/
    teacher/
      page.tsx
      classes/
        page.tsx
      students/
        page.tsx
      subjects/
        page.tsx
      materials/
        page.tsx
      question-bank/
        page.tsx
      quizzes/
        page.tsx
      results/
        page.tsx
      exports/
        page.tsx
  (student)/
    student/
      page.tsx
      materials/
        page.tsx
      quizzes/
        page.tsx
      results/
        page.tsx
  api/
    quiz-attempts/
      route.ts
    quiz-attempts/[attemptId]/
      route.ts
    quiz-attempts/[attemptId]/answers/
      route.ts
    quizzes/[quizId]/start/
      route.ts
    quizzes/[quizId]/submit/
      route.ts
    exports/[quizId]/
      route.ts
    images/
      route.ts
    images/[imageId]/
      route.ts
```

Nama route merupakan rancangan awal dan dapat disesuaikan selama
implementasi. Semua endpoint mutasi wajib melakukan autentikasi,
pemeriksaan role, validasi payload, dan pemeriksaan kepemilikan data.

## 12. Model Data Awal

Model berikut merupakan baseline, bukan skema final yang tidak boleh
berubah. Rincian field dan constraint ada di catatan spesifikasi fitur
(vault Obsidian, `Projects/Aksara/Feature Specs`, F00--F14).

### `User`

-   `id`
-   `role` (`TEACHER` atau `STUDENT`)
-   `username`, `passwordHash`, `mustChangePassword` (hanya guru)
-   `displayName` (untuk siswa sekaligus nama login)
-   `loginName` (hanya siswa; nama ternormalisasi, unik per kelas)
-   `nis` (hanya siswa; opsional, unik bila diisi)
-   `classId` (wajib untuk siswa)
-   `isActive`
-   `createdAt`
-   `updatedAt`

Email tidak diwajibkan. Akun guru dibuat melalui proses seed atau
bootstrap yang aman; jangan menyediakan endpoint publik untuk
mendaftarkan akun guru.

### `Class`

-   `id`
-   `name`
-   `code` (unik, 6 karakter)
-   `codeRotatedAt`
-   `isActive`

### `Session`

-   `id`
-   `tokenHash`
-   `userId`
-   `expiresAt`
-   `createdAt`

### `LoginThrottle`

-   `key` (per identitas atau per IP)
-   `failCount`
-   `windowStartedAt`
-   `lockedUntil`

### `Subject`

-   `id`
-   `name`
-   `slug`
-   `description` (opsional)

### `Chapter`

-   `id`
-   `subjectId`
-   `title`
-   `order`
-   `sourceBook`
-   `sourceYearOrEdition`

### `Subchapter`

-   `id`
-   `chapterId`
-   `title`
-   `order`
-   `sourcePages` (opsional)

### `Material`

-   `id`
-   `chapterId`
-   `subchapterId` (opsional)
-   `title`
-   `summary`
-   `content`
-   `examples` (opsional)
-   `exercises` (opsional, teks)
-   `sourceReference`
-   `sourcePages` (opsional)
-   `status`
-   `createdById`
-   `updatedById`
-   `publishedAt`
-   `createdAt`
-   `updatedAt`

### `Image`

-   `id`
-   `materialId` atau `questionId` (tepat satu)
-   `storageKey` (tidak pernah dikirim ke klien)
-   `mimeType`, `sizeBytes`, `width`, `height`
-   `altText`
-   `caption`, `sourceReference` (opsional)
-   `createdById`
-   `createdAt`
-   `deletedAt` (untuk gambar soal yang masih dipakai snapshot)

### `Question`

-   `id`
-   `chapterId`
-   `subchapterId` (opsional)
-   `type`
-   `prompt`
-   `options` (JSON bila sesuai)
-   `answerKey` (format terstruktur)
-   `explanation` (opsional)
-   `defaultPoints`
-   `difficulty`
-   `status`
-   `sourceReference`
-   `verificationNote` (opsional, internal)
-   `createdAt`
-   `updatedAt`

Kunci jawaban tidak boleh dikirim ke klien siswa sebelum waktu yang
diizinkan.

### `Quiz`

-   `id`
-   `subjectId`
-   `title`
-   `instructions`
-   `durationMinutes`
-   `startsAt`, `endsAt` (opsional)
-   `maxAttempts`
-   `shuffleQuestions`
-   `shuffleOptions`
-   `showFeedbackAfterRelease`
-   `scoringPolicy` (`HIGHEST` atau `REMEDIAL`)
-   `kkm` (wajib bila `REMEDIAL`)
-   `status`
-   `resultsReleasePolicy`
-   `resultsReleasedAt`
-   `resultsReleasedById`
-   `createdById`
-   `publishedAt`
-   `createdAt`
-   `updatedAt`

### `QuizClass`

-   `quizId`
-   `classId`

### `QuizQuestion`

-   `id`
-   `quizId`
-   `questionId`
-   `position`
-   `points`
-   `questionSnapshot` (data yang aman untuk siswa: tipe, teks, opsi)
-   `answerKeySnapshot` (kunci, pembahasan, rubrik)

Snapshot memastikan ulangan tetap konsisten walaupun bank soal berubah
setelah publikasi. Data kunci jawaban snapshot harus dilindungi dan
hanya dibaca oleh proses penilaian serta guru.

### `QuizQuestionImage`

-   `quizQuestionId`
-   `imageId`
-   `visibility` (`QUESTION` atau `EXPLANATION`)

### `QuizAttempt`

-   `id`
-   `quizId`
-   `studentId`
-   `attemptNumber`
-   `slot` (1 = percobaan utama; pengganti mewarisi slot yang diganti)
-   `status`
-   `submitReason` (`MANUAL`, `TIMEOUT`, atau `REPLACED`)
-   `startedAt`
-   `deadlineAt`
-   `submittedAt`
-   `questionOrder`, `optionOrder` (hasil pengacakan)
-   `replacementGrantedAt`, `replacementGrantedById`,
    `replacementReason` (pada percobaan yang diganti)
-   `replacesAttemptId` (pada percobaan pengganti)
-   `maxPoints`
-   `objectiveScore`
-   `manualScore`
-   `finalScore`
-   `gradingStatus`
-   `createdAt`
-   `updatedAt`

Tambahkan constraint unik untuk kombinasi ulangan, siswa, dan nomor
percobaan, serta untuk `replacesAttemptId`.

### `AttemptAnswer`

-   `id`
-   `attemptId`
-   `quizQuestionId`
-   `answer` (JSON atau teks terstruktur)
-   `objectivePoints`
-   `manualPoints` (desimal, maksimal dua angka di belakang koma)
-   `teacherFeedback`
-   `gradedById`
-   `gradedAt`
-   `savedAt`

### `AuditLog` (minimum untuk aksi penting)

-   `id`
-   `actorUserId`
-   `action`
-   `entityType`
-   `entityId`
-   `metadata` (hindari menyimpan password, kode kelas, token, atau data
    sensitif yang tidak diperlukan)
-   `createdAt`

## 13. Keamanan dan Privasi

Karena aplikasi digunakan oleh siswa sekolah dasar, keamanan harus
menjadi persyaratan inti.

-   Kata sandi guru di-hash menggunakan algoritma yang sesuai, misalnya
    Argon2id atau bcrypt dengan parameter yang direkomendasikan.
-   Gunakan cookie sesi aman dan rotasi sesi ketika login atau perubahan
    kredensial. Sesi disimpan di database agar dapat dicabut saat siswa
    dinonaktifkan, dikeluarkan dari perangkat, atau login di perangkat
    lain.
-   Login siswa tanpa kata sandi adalah keputusan produk dengan risiko
    yang diterima (lihat 7.1). Kode kelas tidak boleh dicatat di log.
-   Terapkan pemeriksaan role, kelas, dan kepemilikan pada sisi server
    untuk setiap operasi.
-   Jangan pernah mengirim kunci jawaban, data siswa lain, atau nilai
    tersembunyi ke browser.
-   Validasi semua input di server dengan skema eksplisit.
-   Gunakan proteksi terhadap brute force, CSRF sesuai mekanisme
    autentikasi, XSS, injection, dan akses objek tanpa otorisasi.
-   Berkas unggahan diperiksa dari isinya, SVG ditolak, metadata gambar
    dihapus, dan gambar hanya disajikan lewat rute terotorisasi.
-   Hindari penggunaan tanggal lahir, alamat rumah, nomor telepon, atau
    informasi pribadi lain yang tidak diperlukan. Data siswa cukup nama,
    NIS (opsional), dan kelas.
-   Jangan menampilkan nama, NIS, atau hasil siswa lain pada halaman
    siswa.
-   Batasi akses ekspor dan jangan menaruh file hasil di URL publik
    permanen.
-   Terapkan backup database dan uji prosedur pemulihan.
-   Jangan mencatat password, kode kelas, cookie sesi, token, kunci
    jawaban, atau jawaban lengkap ke log aplikasi yang dapat diakses
    umum.
-   Akun siswa tidak dihapus permanen pada MVP. Kebijakan retensi data
    ditetapkan sesuai kebutuhan sekolah dan peraturan yang berlaku.
-   Gunakan HTTPS pada deployment.
-   Rahasia aplikasi hanya disimpan di environment variables, tidak di
    repository.

## 14. Persyaratan Nonfungsional

### Performa

-   Halaman materi dan dasbor harus terasa responsif pada koneksi
    internet sekolah yang wajar.
-   Query daftar menggunakan pagination bila data bertambah.
-   Autosave mengirim payload minimal dan tidak mengirim seluruh
    percobaan setiap perubahan.
-   Gunakan indeks database untuk username, kode kelas, NIS, relasi
    ulangan/percobaan, status, dan waktu.

### Reliabilitas

-   Deadline ulangan diperiksa di server.
-   Autosave harus idempoten dan menampilkan status penyimpanan.
-   Pengumpulan tidak boleh menggandakan hasil jika request diulang.
-   Error database atau jaringan harus ditampilkan dengan pesan yang
    jelas tanpa membocorkan detail internal.

### Aksesibilitas dan kegunaan

-   Navigasi dapat digunakan dengan keyboard.
-   Kontras teks memadai.
-   Timer tidak hanya mengandalkan warna.
-   Form memiliki label dan pesan validasi.
-   Antarmuka responsif untuk ponsel, tablet, dan desktop.
-   Bahasa antarmuka menggunakan Bahasa Indonesia yang sesuai untuk guru
    dan siswa kelas VI.

### Waktu

-   Seluruh aplikasi memakai zona waktu WITA (`Asia/Makassar`).
    Database menyimpan waktu dalam UTC.

### Kompatibilitas

-   Browser modern yang umum digunakan pada komputer dan ponsel.
-   Uji pada browser desktop dan mobile yang ditetapkan dalam rencana
    QA.

## 15. Pengujian

### Unit test

-   Perhitungan nilai skala 0--100.
-   Penilaian setiap tipe soal.
-   Multiple select all-or-nothing.
-   Pencocokan jawaban singkat, termasuk perapian spasi.
-   Nilai rekap untuk kebijakan Nilai tertinggi dan Remedial (batas KKM).
-   Penghitungan batas percobaan, termasuk percobaan pengganti.
-   Batas tenggat dan toleransi 60 detik.
-   Normalisasi nama login dan NIS.
-   Validasi status publikasi dan rilis hasil.

### Integration test

-   Login guru, login siswa dengan kode kelas, dan otorisasi guru/siswa.
-   Satu sesi aktif per siswa.
-   Siswa tidak dapat membaca materi draft maupun gambarnya.
-   Siswa tidak dapat mengambil kunci jawaban melalui API.
-   Siswa tidak dapat mengakses ulangan untuk kelas lain.
-   Autosave jawaban dan pemulihan jawaban.
-   Submit sebelum dan sesudah tenggat ditambah toleransi.
-   Pengumpulan otomatis yang idempoten.
-   Percobaan pengganti dan aturan remedial.
-   Penilaian uraian dan finalisasi nilai.
-   Rilis dan pembatalan rilis hasil.
-   Hak akses gambar materi dan soal.
-   Pembuatan file Excel dan validitas data.

### End-to-end test

-   Alur guru membuat kelas, siswa, dan materi sampai publikasi.
-   Alur guru membuat ulangan sampai hasil dirilis.
-   Alur siswa login, belajar, mengerjakan, submit, dan melihat hasil.
-   Alur remedial dan percobaan pengganti.
-   Pengujian percobaan ulang sesuai batas yang ditetapkan.
-   Pengujian pada ukuran layar ponsel.

### Uji penerimaan minimum

1.  Total poin 36 dari maksimum 40 menghasilkan nilai 90.
2.  Jawaban uraian yang belum diperiksa membuat hasil belum final.
3.  Siswa tidak dapat memulai percobaan melebihi batas.
4.  Percobaan yang waktunya habis dikunci berdasarkan deadline server.
5.  Hasil tidak dapat dilihat siswa sebelum dirilis guru.
6.  Multiple select mendapat nilai penuh hanya bila semua pilihan benar
    dan tidak ada pilihan salah.
7.  Siswa dapat login dengan kode kelas serta NIS atau nama, tanpa kata
    sandi dan email.
8.  Materi draft tidak dapat diakses dengan menebak URL.
9.  Perubahan bank soal setelah publikasi tidak mengubah snapshot
    ulangan.
10. Workbook Excel berisi rekap nilai dan rincian jawaban yang sesuai
    dengan aplikasi.
11. Pada kebijakan Remedial dengan KKM 75, remedial bernilai 90 dicatat
    75.
12. Login kedua untuk siswa yang sama mencabut sesi pertama.
13. Percobaan pengganti tidak memakan jatah percobaan, dan percobaan yang
    diganti tidak masuk nilai.
14. Gambar materi draft dan gambar soal ulangan yang belum dikerjakan
    tidak dapat dibuka siswa.

## 16. Deployment, Konfigurasi, dan Backup

### Deployment

-   Repository Git dihubungkan ke Vercel.
-   Setiap pull request dapat menggunakan Preview Deployment.
-   Production deployment dilakukan dari branch utama setelah build dan
    pengujian berhasil.
-   Konfigurasi environment variable dipisahkan untuk development,
    preview, dan production.
-   Jalankan migrasi database melalui proses deployment yang terkontrol;
    hindari menjalankan migrasi destruktif tanpa backup.
-   Uji koneksi PostgreSQL, login, autosave, timer, ekspor, dan unggah
    gambar pada Preview Deployment sebelum rilis.
-   Gunakan bucket R2 terpisah untuk development, preview, dan
    production.

### Database

-   Gunakan PostgreSQL terkelola yang mendukung pola koneksi dari
    Vercel.
-   Konfigurasikan connection pooling sesuai panduan penyedia database
    dan Prisma.
-   Jangan mengasumsikan database termasuk dalam hosting Vercel.
-   Jadwalkan backup sesuai kemampuan layanan database dan uji restore
    secara berkala.
-   Simpan data produksi terpisah dari data pengujian.

### Observability

-   Catat error aplikasi, kegagalan autosave, kegagalan submit, dan
    kegagalan ekspor tanpa merekam data sensitif.
-   Sediakan indikator status penyimpanan pada halaman ulangan.
-   Pantau penggunaan database dan batas runtime Vercel.
-   Periksa batas paket Vercel dan database yang berlaku saat
    implementasi karena batas layanan dapat berubah.

## 17. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Koneksi internet siswa terputus | Jawaban belum tersimpan | Autosave, indikator status, pemulihan jawaban tersimpan, toleransi 60 detik |
| Jam browser dimanipulasi | Ulangan melewati batas | Deadline dan validasi dilakukan server |
| Kunci jawaban bocor | Integritas penilaian terganggu | Pisahkan payload siswa dan data kunci, otorisasi ketat |
| Materi salah atau tidak sesuai buku | Kesalahan belajar | Guru memverifikasi materi dan mencatat referensi |
| Uraian belum dinilai | Nilai belum final | Status penilaian eksplisit dan rilis hanya setelah final |
| Siswa masuk sebagai temannya (login tanpa kata sandi) | Ulangan dikerjakan atau nilai dilihat orang lain | Risiko diterima; satu sesi aktif per siswa, pemberitahuan ke siswa, peringatan ke guru, kode kelas dapat diganti |
| Gambar bocor ke siswa yang belum berhak | Soal atau kunci terlihat lebih awal | Bucket privat, rute terotorisasi, URL bertanda tangan 5 menit |
| Percobaan gagal karena error | Siswa kehilangan kesempatan | Percobaan pengganti oleh guru dengan catatan alasan |
| Fungsi Vercel melewati batas runtime | Request gagal | Request pendek, pagination, ekspor dibatasi, hindari proses panjang |
| Database kehabisan koneksi | Error aplikasi | Pooling dan pengujian beban yang realistis |
| Data siswa terekspos | Risiko privasi | Minimisasi data, akses berbasis role, audit, dan pengujian otorisasi |

## 18. Roadmap Implementasi

### Tahap 1 --- Fondasi

-   Setup Next.js, TypeScript, linting, dan test.
-   Setup database PostgreSQL, Prisma, dan migrasi.
-   Kelas dan kode kelas.
-   Autentikasi guru (username + kata sandi) dan siswa (kode kelas +
    NIS/nama), satu sesi per siswa.
-   Role-based access control.
-   Seed akun guru dengan prosedur aman.

### Tahap 2 --- Konten

-   Struktur mata pelajaran, bab, dan subbab.
-   Penyimpanan gambar di Cloudflare R2.
-   CRUD materi dan gambar materi.
-   Status draft/review/published.
-   Dasbor dan halaman materi siswa.

### Tahap 3 --- Bank soal

-   CRUD soal, kunci jawaban, dan gambar soal.
-   Validasi tipe soal.
-   Pengelompokan berdasarkan bab.
-   Unit test penilaian.

### Tahap 4 --- Ulangan

-   Pembuatan ulangan untuk kelas tertentu dan snapshot soal.
-   Timer berbasis deadline server dengan toleransi 60 detik.
-   Randomisasi.
-   Autosave.
-   Submit manual dan otomatis.
-   Pembatasan percobaan dan percobaan pengganti.

### Tahap 5 --- Penilaian dan laporan

-   Penilaian otomatis.
-   Penilaian uraian manual.
-   Finalisasi nilai skala 0--100.
-   Kebijakan nilai: Nilai tertinggi dan Remedial dengan KKM.
-   Rilis dan pembatalan rilis hasil.
-   Ekspor Excel.

### Tahap 6 --- QA dan rilis

-   Unit, integration, dan end-to-end testing.
-   Uji aksesibilitas dan responsif.
-   Uji Preview Deployment di Vercel.
-   Uji backup dan pemulihan database.
-   Rilis MVP dan kumpulkan umpan balik guru/siswa.

## 19. Metrik Produk

-   Jumlah materi yang telah diverifikasi dan dipublikasikan.
-   Jumlah soal aktif per mata pelajaran dan bab.
-   Jumlah ulangan yang berhasil dipublikasikan.
-   Persentase percobaan ulangan yang tersimpan dan terkumpul tanpa
    error.
-   Jumlah kegagalan autosave/submit.
-   Waktu yang dibutuhkan guru untuk menyiapkan ulangan.
-   Persentase jawaban uraian yang telah dinilai sebelum hasil dirilis.
-   Jumlah ekspor Excel yang berhasil.
-   Laporan masalah dari guru dan siswa.
-   Jumlah percobaan pengganti yang dibuka guru.
-   Jumlah peringatan login dari perangkat lain.

Metrik digunakan untuk memperbaiki produk, bukan untuk membuat klaim
otomatis tentang kemampuan atau karakter siswa.

## 20. Keputusan Produk yang Telah Ditetapkan

| Area | Keputusan |
|---|---|
| Pengguna | Satu guru dan siswa yang dikelompokkan per kelas |
| Login guru | Username dan kata sandi |
| Login siswa | Kode kelas + NIS atau nama, tanpa kata sandi dan email; kode berbeda per kelas |
| Sesi siswa | Satu sesi aktif per siswa; login baru mencabut sesi lama |
| Akun siswa keluar | Dinonaktifkan, tidak dihapus permanen |
| Pengelolaan konten | Guru memasukkan dan memverifikasi materi |
| Latihan | Teks statis di materi |
| Gambar | Masuk MVP untuk materi dan soal; Cloudflare R2 privat |
| Penilaian objektif | Otomatis |
| Penilaian uraian | Manual oleh guru; skor boleh pecahan hingga dua desimal; jawaban kosong tetap dinilai guru |
| Jawaban singkat | Exact match setelah trim dan perapian spasi; kapitalisasi diatur per soal |
| Skala nilai | 0--100 |
| Ulangan | Online, bertimer, dengan pengacakan, ditujukan ke kelas tertentu |
| Tenggat | Waktu mulai + durasi, dibatasi jadwal akhir; toleransi jaringan 60 detik |
| Batas percobaan | Dapat dikonfigurasi guru per ulangan |
| Kebijakan nilai | Dipilih guru per ulangan: Nilai tertinggi atau Remedial dengan KKM yang dapat diubah |
| Percobaan bermasalah | Guru membukakan percobaan pengganti dengan catatan alasan |
| Publikasi nilai | Hasil disembunyikan sampai dirilis guru; rilis ditolak bila masih ada yang mengerjakan atau uraian belum dinilai; rilis dapat dibatalkan |
| Multiple select | All-or-nothing |
| Ekspor | Excel: rekap nilai dan rincian jawaban |
| Zona waktu | WITA (`Asia/Makassar`) |
| Framework | Next.js full-stack |
| Hosting aplikasi | Vercel |
| Database | PostgreSQL terkelola di luar filesystem Vercel |
| ORM | Prisma |
| Bahasa aplikasi | TypeScript |
| Sumber konten awal | Buku Matematika kelas VI (2022) dan IPAS kelas VI edisi revisi (2025) |

Asumsi turunan yang belum dikonfirmasi eksplisit dan dapat dikoreksi:

-   KKM ditetapkan per ulangan, bukan per mata pelajaran.
-   Remedial hanya terbuka setelah hasil dirilis, dan hanya untuk siswa
    dengan nilai utama di bawah KKM.
-   Nilai rekap tidak pernah lebih rendah dari nilai utama.
-   Percobaan pengganti dimulai dari awal; jawaban lama tidak disalin.
-   Mengganti kode kelas tidak mencabut sesi yang sedang aktif.

## 21. Catatan Implementasi Final

1.  Next.js merupakan aplikasi full-stack; tidak perlu membuat frontend
    Vite dan backend Express terpisah untuk MVP.
2.  Vercel meng-host aplikasi, tetapi database persisten tetap
    menggunakan layanan PostgreSQL terkelola, dan gambar disimpan di
    Cloudflare R2.
3.  Timer harus berbasis `deadlineAt` di database dengan toleransi
    jaringan 60 detik. Browser hanya menampilkan hitung mundur.
4.  Autosave dan submit harus memeriksa sesi, kepemilikan percobaan,
    kelas, status percobaan, dan deadline di server.
5.  Kunci jawaban harus disimpan dan diproses di sisi server. Jangan
    memasukkannya ke props atau respons yang diterima siswa.
6.  Gunakan snapshot soal, kunci jawaban, dan gambar ketika ulangan
    dipublikasikan agar perubahan bank soal tidak mengubah ulangan yang
    sedang berjalan.
7.  Nilai rekap dihitung saat dibaca dari nilai setiap percobaan, agar
    perubahan kebijakan nilai dan KKM langsung berlaku.
8.  Untuk MVP, fokus pada alur utama yang reliabel daripada fitur
    proktor, analitik kompleks, atau otomatisasi yang tidak diperlukan.
9.  Rincian subbab dan materi dari buku harus diverifikasi oleh guru
    terhadap sumber aslinya sebelum diterbitkan.
10. Sebelum implementasi produksi, verifikasi batas runtime, ukuran
    respons, koneksi database, ketersediaan pustaka pemrosesan gambar,
    serta ketentuan paket Vercel, penyedia database, dan Cloudflare R2.

## 22. Riwayat Revisi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.2 | --- | Draft siap implementasi. |
| 1.3 | 27 Oktober 2026 | Login siswa diganti menjadi kode kelas + NIS atau nama (tanpa kata sandi) dengan satu sesi per siswa; fitur kelas; gambar pada materi dan soal di Cloudflare R2; kebijakan nilai Nilai tertinggi/Remedial dengan KKM; percobaan pengganti; toleransi tenggat 60 detik; pembatalan rilis hasil; skor uraian pecahan; perapian spasi jawaban singkat; zona waktu WITA; latihan berupa teks. |

