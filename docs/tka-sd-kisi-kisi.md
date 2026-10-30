# Kisi-kisi TKA SD/MI: dasar Tryout TKA (Tahap 10)

> **Perlu dicek ke Pusmendik.** Riset ini dilakukan pada 2026-10-30. Halaman resmi Pusmendik
> (`pusmendik.kemendikdasmen.go.id/tka/...`) tidak bisa dibaca dari lingkungan riset: sertifikat TLS-nya gagal
> diverifikasi dan isinya kosong saat diambil langsung. Isi di bawah dihimpun dari media dan blog guru yang
> mengutip Pusmendik. Kisi-kisi yang diberi label "2027" di sumber pihak ketiga isinya sama dengan kisi-kisi
> Perkaban BSKAP 047/H/AN/2025. Jika Pusmendik menerbitkan kisi-kisi baru, cocokkan dokumen ini, bab mapel
> TKA (`prisma/tka/`), dan soal seed dengan dokumen resmi tersebut.

## Gambaran umum

| Hal | Isi | Sumber |
|---|---|---|
| Nama | Tes Kemampuan Akademik (TKA) | [S2], [S6] |
| Dasar kerangka asesmen | Peraturan Kepala BSKAP Kemendikdasmen No. 047/H/AN/2025 | [S1], [S3] |
| Mapel SD/MI | Bahasa Indonesia dan Matematika | [S3], [S7] |
| Jumlah soal & waktu | Umumnya disebut **30 soal / 75 menit per mapel**. Zenius menyebut 20 soal, jadi angka ini belum pasti | [S4], [S5] |
| Bentuk soal | PG sederhana, PG kompleks MCMA, PG kompleks model kategori | [S3], [S6] |
| Struktur soal | Soal tunggal, dan soal grup (beberapa soal mengacu pada satu stimulus, misalnya satu teks atau satu grafik) | [S3] |
| Pelaporan | Nilai **0–100 dengan dua angka di belakang koma** per mapel, ditambah 4 kategori capaian: Istimewa, Baik, Memadai, Kurang. Batas angka tiap kategori **tidak ditemukan** | [S8] |
| Rerata nasional TKA SD 2026 | Bahasa Indonesia **60,14**, Matematika **43,41** | [S9] |
| Akses sekolah | Laman Manajemen TKA: statistik per wilayah/jenjang, rerata mapel, kategori capaian murid, tabel rinci | [S9] |

## Bentuk soal

| Bentuk | Arti | Di Aksara |
|---|---|---|
| **PG** (pilihan ganda sederhana) | Satu jawaban benar | `SINGLE_CHOICE` |
| **PGK MCMA** (*multiple choice multiple answer*) | Jawaban benar bisa lebih dari satu; siswa memilih satu sampai semua pilihan | `MULTIPLE_SELECT` |
| **PGK Kategori** | Beberapa pernyataan, masing-masing direspons, misalnya Benar/Salah atau Sesuai/Tidak Sesuai | `CATEGORY` (baru di Tahap 10) |

## Matematika

Sumber: [S2], dilengkapi [S3].

### Elemen dan sub-materi (menjadi bab dan subbab mapel "TKA Matematika")

1. **Bilangan**
   - Pecahan senilai dengan gambar dan simbol matematika
   - Membandingkan dan mengurutkan pecahan
   - Hubungan bentuk pecahan biasa, desimal, dan persen
   - Operasi hitung bilangan cacah (+, −, ×, ÷)
   - Operasi hitung pecahan (+, −; × dan ÷ dengan bilangan asli)
   - Kelipatan, faktor, KPK, dan FPB
2. **Objek Geometri**
   - Bangun datar
   - Bangun ruang dan visualisasi spasial (tampak depan, atas, samping)
3. **Pengukuran**
   - Panjang, volume, massa, waktu, dan kecepatan dengan satuan baku
   - Konversi satuan baku panjang, volume, massa, dan waktu
   - Keliling dan luas bangun datar (segitiga, segi empat, segi banyak)
   - Volume bangun ruang (kubus, balok, dan gabungannya)
   - Besar sudut dan penaksiran ukuran
4. **Data**
   - Penyajian data (gambar, piktogram, diagram batang, tabel frekuensi)
   - Membaca informasi dan menggunakan data

### Level kognitif (menjadi field `cognitiveLevel` pada soal)

| Level | Kemampuan yang diuji |
|---|---|
| **Pemahaman** | Melakukan perhitungan; memahami informasi dari tabel, diagram, atau infografis; mengidentifikasi dan mengelompokkan objek |
| **Aplikasi** | Memodelkan masalah matematika; menerapkan strategi matematika; menjelaskan makna representasi atau hasil hitung |
| **Penalaran** | Menganalisis hubungan beberapa fakta atau konsep; memecahkan masalah dengan mengaitkan beberapa konsep; mengevaluasi solusi |

## Bahasa Indonesia

TKA Bahasa Indonesia SD berfokus pada **keterampilan membaca** [S1]. Sumber kompetensi: [S7]. Bahan bacaannya
adalah **teks fiksi** dan **teks informasi**, dan yang diuji meliputi karakteristik kosakata, kalimat, dan
wacana [S3].

### Kompetensi (menjadi bab mapel "TKA Bahasa Indonesia")

1. **Pemahaman Tekstual**: memahami informasi tersurat, lalu mengelompokkan dan menyusun ulang informasi itu.
   - Mengidentifikasi ketepatan kosakata umum dan kosakata bidang tertentu
   - Mengidentifikasi kosakata bermakna denotatif dan konotatif untuk mengenali objek, fenomena, dan tokoh
     dalam teks nonfiksi dan fiksi
   - Menyusun ulang informasi dari teks menjadi ikhtisar atau bagan
2. **Pemahaman Inferensial**: menarik kesimpulan dari informasi tersirat dan menyajikannya kembali.
   - Mengidentifikasi informasi tersurat dalam teks
   - Menyimpulkan ide pokok, ide pendukung, amanat, tokoh, dan/atau nilai dalam teks
   - Menjelaskan isi informasi dan karakteristik objek dalam teks
   - Menjelaskan makna ungkapan dalam teks
3. **Evaluasi dan Apresiasi**: menilai ide serta menanggapi teks secara emosional dan estetis.
   - Menilai relevansi peristiwa dalam teks dengan kehidupan sehari-hari berdasarkan pengalaman atau pengetahuan
   - Menilai kesesuaian unsur dan/atau informasi dalam teks
   - Menyimpulkan respons emosional terhadap unsur teks fiksi

Kisi-kisi Bahasa Indonesia tidak memakai level Pemahaman/Aplikasi/Penalaran. Karena itu, soal Bahasa Indonesia
di Aksara tidak diberi `cognitiveLevel`, dan rincian per bab sudah sama dengan rincian per kompetensi.

## Cara penilaian di Tryout TKA Aksara

Aturan resmi penskoran per bentuk soal **tidak ditemukan**. Kemungkinan besar TKA resmi memakai skala
terstandar yang tidak bisa ditiru oleh satu sekolah. Tryout di Aksara memakai aturan berikut (keputusan D4 dan
D7 di `docs/superpowers/plans/2026-10-30-tahap-10-tryout-tka.md`):

- **Nilai** = poin diperoleh / poin maksimum × 100, ditulis dengan 2 desimal, sama seperti ulangan biasa.
  Setiap soal tryout bernilai 1 poin.
- **PG**: benar = 1, salah atau kosong = 0.
- **MCMA**: semua-atau-nol. Himpunan pilihan siswa harus sama persis dengan kunci (aturan yang sudah berlaku di
  Aksara).
- **Kategori**: semua-atau-nol. Setiap pernyataan harus dijawab dan semuanya harus cocok dengan kunci. Satu
  pernyataan salah atau kosong berarti 0.
  Alasannya: aturan ini konsisten dengan MCMA dan tidak menggelembungkan nilai.
- **Label kategori (perkiraan, bukan skala resmi)**:

  | Label | Nilai |
  |---|---|
  | Istimewa | ≥ 80 |
  | Baik | 60 – 79,99 |
  | Memadai | 40 – 59,99 |
  | Kurang | < 40 |

  Label ini hanya membantu membaca hasil tryout. Batas resmi untuk SD tidak dipublikasikan. Sebagai pembanding,
  rerata nasional 2026 berada di "Memadai" untuk Bahasa Indonesia (60,14 hampir "Baik") dan untuk Matematika
  (43,41).
- **Evaluasi untuk guru**:
  - % benar per elemen dan per level kognitif, untuk setiap siswa dan rerata kelas.
  - Analisis butir: % siswa yang benar per nomor soal.

## Sumber

- [S1] detik Sulsel, "Kisi-kisi TKA SD Lengkap: Muatan, Kompetensi, dan Contoh Soalnya":
  https://www.detik.com/sulsel/berita/d-8116870/kisi-kisi-tka-sd-lengkap-muatan-kompetensi-dan-contoh-soalnya
- [S2] Diary Guru, "Kisi-Kisi Soal TKA Matematika SD 2027" (2026-09, mengutip Pusmendik):
  https://www.diaryguru.com/2026/09/kisi-kisi-soal-tka-matematika-sd-2027.html
- [S3] detikEdu, "3 Bentuk Soal TKA SD-SMP 2026" (2026-01-06, mengutip Pusmendik):
  https://www.detik.com/edu/sekolah/d-8293492/3-bentuk-soal-tka-sd-smp-2026-ketahui-perbedaannya
- [S4] Kompas, "Ini Cara Kerjakan Soal TKA SD 2026 Matematika-Bahasa Indonesia Cuma 75 Menit" (2026-04-20):
  https://www.kompas.com/edu/read/2026/04/20/171000671/ini-cara-kerjakan-soal-tka-sd-2026-matematika-bahasa-indonesia-cuma-75-menit
- [S5] Medcom, "Siswa Review Soal TKA Matematika SD 2026":
  https://www.medcom.id/pendidikan/news-pendidikan/JKR2GryK-siswa-review-soal-tka-matematika-sd-2026-ini-soal-paling-mudah-dan-susah
- [S6] Metro TV, "TKA SD 2026 Digelar, Simak Jenis, Bentuk, dan Cara Latihan Soalnya":
  https://www.metrotvnews.com/read/b7WCmw5W-tka-sd-2026-digelar-simak-jenis-bentuk-dan-cara-latihan-soalnya
- [S7] Diary Guru, "Kisi-Kisi Soal TKA Bahasa Indonesia SD 2027" (2026-09, mengutip Pusmendik):
  https://www.diaryguru.com/2026/09/kisi-kisi-soal-tka-bahasa-indonesia-sd.html
- [S8] Kompas TV, "Cara Menghitung Skor TKA untuk SD, SMP, SMA, dan SMK" (2025-10-07):
  https://www.kompas.tv/info-publik/621729/cara-menghitung-skor-tka-untuk-sd-smp-sma-dan-smk
- [S9] Medcom, "Sekolah Sudah Bisa Cek Detail Hasil TKA SD-SMP 2026" (2026-06-08):
  https://www.medcom.id/pendidikan/news-pendidikan/aNr10LzK-sekolah-sudah-bisa-cek-detail-hasil-tka-sd-smp-2026-ini-link-dan-data-yang-bisa-diakses
- Halaman resmi (belum terbaca, sertifikat TLS gagal):
  https://pusmendik.kemendikdasmen.go.id/tka/tka/view/mata-pelajaran-wajib/sd
