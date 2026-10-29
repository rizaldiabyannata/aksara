---
name: Aksara
description: Ruang belajar dan ulangan kelas VI yang hangat, untuk satu guru dan siswanya.
colors:
  background: "#fff5ee"
  card: "#ffffff"
  foreground: "#241f21"
  muted-foreground: "#695f63"
  secondary: "#ffeadb"
  primary-soft: "#ffdbcf"
  border: "#f2e2d8"
  input: "#8d7167"
  primary: "#c2410c"
  primary-foreground: "#ffffff"
  primary-strong: "#a83900"
  accent-decor: "#ff7034"
  success: "#137a4c"
  success-soft: "#e8f8f0"
  warning: "#9a5200"
  warning-soft: "#fff4e5"
  info: "#2457a8"
  info-soft: "#eef4fd"
  destructive: "#c22f2f"
  destructive-soft: "#feecec"
typography:
  metric:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  headline-xl:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline-lg:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  headline-md:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0.05em"
rounded:
  control: "12px"
  card: "16px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: "48px"
    padding: "0 20px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.primary-strong}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: "48px"
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    height: "48px"
  button-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.control}"
    height: "48px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.card}"
    padding: "24px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    height: "48px"
    padding: "0 16px"
  status-chip:
    rounded: "{rounded.pill}"
    typography: "{typography.label}"
    padding: "4px 12px"
  nav-item-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.control}"
    height: "48px"
---

# Design System: Aksara

## Overview

**Creative North Star: "Ruang Kelas yang Hangat"**

Aksara terasa seperti ruang kelas pada pagi hari: terang, lega, dan ramah. Kanvasnya peach yang lembut, bukan putih klinis. Setiap kelompok isi duduk di kartu putih bersudut besar yang terangkat tipis dari kanvas. Oranye dipakai untuk hal yang perlu dikerjakan *sekarang*, misalnya tombol utama, item navigasi aktif, atau pilihan jawaban siswa. Selebihnya tenang.

Desain ini dirancang untuk dua pembaca sekaligus, yaitu anak kelas 6 dan guru senior. Karena itu huruf berukuran besar (isi 18 px, terkecil 16 px), target sentuh lapang (48 px), dan setiap status ditulis dengan kata-kata, tidak hanya dengan warna. Kepadatannya sedang: satu tindakan utama per kartu, dan angka penting ditampilkan besar.

Sumber visualnya adalah mockup Stitch di `docs/stitch/`. Perbedaan dengan mockup hanya untuk aksesibilitas: oranye terang mockup tidak dipakai di bawah teks, label kecil 14 px dinaikkan menjadi 16 px, dan ikon memakai Hugeicons.

**Key Characteristics:**
- Kanvas peach, kartu putih, bayangan hangat yang sangat tipis.
- Satu aksen oranye untuk tindakan. Biru, hijau, dan kuning hanya untuk makna (info, berhasil, perhatian).
- Huruf Plus Jakarta Sans yang bulat dan ramah. Angka penting tebal dan besar.
- Semua kontrol berukuran minimal 48 px dan bersudut 12 px.

## Colors

Palet ini hangat: satu oranye bata sebagai suara tindakan, di atas netral peach dan cokelat-keabuan.

### Primary
- **Oranye Bata** (`primary`): isi tombol utama, item navigasi aktif, dan focus ring. Warna ini cukup gelap untuk membawa teks putih.
- **Oranye Bata Tua** (`primary-strong`): teks berwarna aksen, link, label tombol sekunder, dan angka sorotan.
- **Oranye Senja** (`accent-decor`): khusus dekorasi. Dipakai untuk isi bar progres, garis aksen di samping judul seksi, latar ikon besar, dan tanda nomor soal aktif. Teks tidak pernah diletakkan di atas warna ini.
- **Peach Pilihan** (`primary-soft`): latar keadaan terpilih, misalnya opsi jawaban siswa.

### Tertiary
- **Tone makna**: `success` (hijau daun), `warning` (cokelat madu), `info` (biru tinta), dan `destructive` (merah bata). Masing-masing punya pasangan `-soft` untuk latar chip dan kartu pemberitahuan. Teks tone selalu memakai warna gelapnya, di atas `-soft`-nya atau di atas putih.

### Neutral
- **Kanvas Peach** (`background`): latar semua halaman.
- **Kartu** (`card`): permukaan semua isi.
- **Peach Lembut** (`secondary`): latar tombol sekunder, baris tabel selang-seling, dan panel di dalam kartu.
- **Tinta Hangat** (`foreground`) dan **Abu Hangat** (`muted-foreground`): teks utama dan teks pendukung.
- **Garis Peach** (`border`): pemisah kartu dan seksi. Garis ini hanya dekoratif.
- **Garis Kontrol** (`input`): border input, checkbox, dan radio, supaya kontrol tetap terlihat dengan kontras ≥ 3:1.

**The Senja-Hanya-Hiasan Rule.** `accent-decor` tidak pernah menjadi latar teks. Jika butuh oranye di bawah teks, pakai `primary`.

**The Kata-Bukan-Warna Rule.** Setiap status, timer, dan keadaan soal punya ikon dan teks. Warna hanya penguat.

## Typography

**Display/Body Font:** Plus Jakarta Sans (fallback `system-ui`)
**Mono Font:** JetBrains Mono, untuk kode kelas, sisa waktu, dan angka yang harus dibaca persis.

Satu keluarga huruf, dibedakan lewat ketebalan. Judul tebal (700–800) dengan tracking sedikit rapat, isi reguler 18 px.

### Hierarchy
- **Metric** (800, 3rem): angka besar di kartu statistik dan nilai siswa.
- **Headline XL** (800, 2.25rem; di HP 1.75rem): sapaan atau judul halaman utama.
- **Headline LG** (700, 1.75rem): judul halaman.
- **Headline MD** (700, 1.375rem): judul kartu dan seksi.
- **Body** (400, 1.125rem): isi, termasuk teks soal. Panjang baris dibatasi sekitar 70ch.
- **Body SM** (400, 1rem): keterangan pendukung. Ini ukuran terkecil.
- **Label** (600, 1rem): tombol, chip, label form, dan eyebrow (dengan huruf kapital dan tracking lebar).
- **Mono** (500, 1rem, tracking 0.05em): kode dan timer. Boleh dibesarkan, misalnya untuk tampilan kode kelas di proyektor.

**The Enam-Belas Rule.** Tidak ada teks di bawah 16 px, termasuk caption, chip, dan footer.

## Layout

- **Guru, desktop (md+):** sidebar tetap di kiri (sekitar 280 px) dengan wordmark, navigasi, lalu Ganti Sandi dan Keluar di bawah. Isi halaman di kanan, lebar maksimal sekitar 1200 px. Dasbor memakai dua kolom (isi utama dan panel samping).
- **Guru, HP:** bar atas berisi wordmark dan tombol Menu. Semua kartu ditumpuk satu kolom.
- **Siswa:** header sederhana (Aksara, Beranda, Materi, Keluar) dengan isi satu kolom yang lega. Halaman mengerjakan ulangan tidak memakai header. Bar navigasi soal menempel di bawah layar HP.
- Gutter 16 px di HP dan 24–32 px di desktop. Jarak antar kartu 16–24 px, padding kartu 24 px (16 px di HP).
- Tidak boleh ada scroll ke samping pada lebar 360 px.

## Elevation & Depth

Kedalamannya berlapis tapi tipis. Kartu terangkat dari kanvas dengan bayangan hangat bernuansa oranye (`0 4px 20px -2px rgba(230,115,60,0.07), 0 2px 6px -1px rgba(0,0,0,0.03)`). Elemen yang sedang aktif atau terpilih memakai bayangan sedikit lebih kuat (`0 12px 32px -4px rgba(230,115,60,0.12)`). Dialog memakai bayangan paling kuat di atas overlay gelap.

**The Satu-Lapis Rule.** Kartu di dalam kartu tidak memakai bayangan. Pakai latar `secondary` sebagai panel.

## Shapes

Lengkungannya lembut dan konsisten:
- 12 px untuk kontrol (tombol, input, item navigasi, opsi jawaban);
- 16 px untuk kartu dan dialog;
- bulat penuh untuk chip status, nomor soal, dan avatar ikon.

## Components

### Buttons
- **Utama:** isi oranye bata dengan teks putih tebal, tinggi 48 px, sudut 12 px. Ikon boleh ditaruh di kiri atau kanan teks.
- **Sekunder:** isi peach lembut dengan teks oranye bata tua.
- **Outline:** putih dengan garis kontrol, untuk aksi netral.
- **Berhasil:** isi hijau daun dengan teks putih, khusus aksi final yang positif seperti "Rilis Hasil".
- Saat fokus, tombol mendapat ring oranye bata 3 px. Saat ditekan, tombol turun 1 px.

### Chips
Chip status berbentuk pil, memakai latar `-soft`, teks tone gelap, dan ikon di depan, misalnya "Sedang berlangsung", "Menunggu penilaian", atau "Siap dirilis". Teks boleh membungkus ke baris berikutnya di HP.

### Cards / Containers
Kartu putih bersudut 16 px dengan padding 24 px, bayangan hangat tipis, dan garis peach opsional. Judul kartu memakai Headline MD. Kartu statistik berisi eyebrow, angka Metric, keterangan, dan ikon di dalam kotak bulat ber-latar `-soft`.

### Inputs / Fields
Input putih setinggi 48 px dengan garis kontrol dan sudut 12 px. Label ditaruh di atas input (Label 600). Saat fokus, garis berubah menjadi oranye bata dan ring muncul. Pesan galat ditulis dengan teks merah bata dan ikon.

### Navigation
Item sidebar setinggi 48 px dengan ikon dan teks. Item aktif berisi oranye bata dengan teks putih. Item lain berwarna tinta hangat dan mendapat latar peach lembut saat hover.

### Kartu Soal (Signature Component)
Kartu soal punya chip nomor ("Nomor 5 dari 15") dan chip tipe di atasnya. Teks soal ditulis dengan Body yang lega. Opsi jawaban ditampilkan sebagai baris besar (huruf A–D di kotak 12 px). Opsi yang terpilih memakai latar `primary-soft`, garis oranye bata, tanda centang, dan teks "Jawaban kamu saat ini". Grid nomor soal memakai lingkaran: terjawab berwarna hijau dengan centang, aktif berwarna oranye senja dengan garis tebal, dan ragu-ragu memakai ikon bendera.

## Do's and Don'ts

### Do:
- **Do** pakai satu tombol utama oranye per kartu atau seksi.
- **Do** tulis status dengan ikon dan kata-kata dalam Bahasa Indonesia yang dimengerti anak kelas 6.
- **Do** tampilkan angka penting (nilai, jumlah siswa, sisa waktu) besar dan tebal.

### Don't:
- **Don't** letakkan teks di atas `accent-decor` (#ff7034). Kontrasnya hanya 2.76:1.
- **Don't** pakai ukuran teks di bawah 16 px.
- **Don't** salin data contoh mockup (nama guru, jumlah siswa, judul bab) ke produk.
- **Don't** pakai ikon Material Symbols. Gunakan Hugeicons.
- **Don't** pakai bayangan pada kartu yang ada di dalam kartu lain.
