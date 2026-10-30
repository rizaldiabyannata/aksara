# Aksara: Daftar Fitur dan Mekanismenya

> Inventaris lengkap fitur yang **sudah dibangun** (Tahap 1–5, plus dasbor Tahap 6), disusun dari kode per 30 Oktober 2026. Dokumen ini jadi bahan redesain UI.
> Sumber kebenaran: kode di repo. Spesifikasi asal ada di `docs/PRD_Web_App_Belajar_Kelas_VI.md`.

---

## Daftar isi

1. [Gambaran umum](#1-gambaran-umum)
2. [Peta halaman (sitemap)](#2-peta-halaman-sitemap)
3. [Autentikasi dan sesi](#3-autentikasi-dan-sesi)
4. [Dasbor guru](#4-dasbor-guru)
5. [Kelola kelas](#5-kelola-kelas)
6. [Kelola siswa](#6-kelola-siswa)
7. [Mapel, bab, dan subbab](#7-mapel-bab-dan-subbab)
8. [Materi pelajaran](#8-materi-pelajaran)
9. [Gambar (materi dan soal)](#9-gambar-materi-dan-soal)
10. [Bank soal](#10-bank-soal)
11. [Ulangan: penyusunan oleh guru](#11-ulangan-penyusunan-oleh-guru)
12. [Ulangan: terbit dan snapshot](#12-ulangan-terbit-dan-snapshot)
13. [Ulangan: siswa mengerjakan](#13-ulangan-siswa-mengerjakan)
14. [Pemantauan dan percobaan pengganti](#14-pemantauan-dan-percobaan-pengganti)
15. [Penilaian (otomatis dan uraian)](#15-penilaian-otomatis-dan-uraian)
16. [Perhitungan nilai dan rekap](#16-perhitungan-nilai-dan-rekap)
17. [Rilis hasil dan halaman hasil siswa](#17-rilis-hasil-dan-halaman-hasil-siswa)
18. [Ekspor Excel](#18-ekspor-excel)
19. [Log audit](#19-log-audit)
20. [Halaman beranda siswa](#20-halaman-beranda-siswa)
21. [Komponen dan pola UI bersama](#21-komponen-dan-pola-ui-bersama)
22. [Kamus label dan status (copy UI)](#22-kamus-label-dan-status-copy-ui)
23. [Batas angka dan validasi](#23-batas-angka-dan-validasi)
24. [Aturan yang tidak boleh dilanggar saat redesain](#24-aturan-yang-tidak-boleh-dilanggar-saat-redesain)
25. [Catatan pengamatan untuk redesain](#25-catatan-pengamatan-untuk-redesain)

---

## 1. Gambaran umum

**Aksara** adalah web app untuk **satu guru** dan siswa **kelas VI SD/MI**. Isinya materi belajar, bank soal, ulangan online berwaktu, penilaian, rilis hasil, dan ekspor Excel.

| Peran | Cara masuk | Yang bisa dilakukan |
|---|---|---|
| **Guru** (`TEACHER`) | Username + kata sandi (akun dari seed, tidak ada pendaftaran publik) | Semua pengelolaan: kelas, siswa, mapel/bab, materi, gambar, bank soal, ulangan, pemantauan, penilaian, rilis, ekspor |
| **Siswa** (`STUDENT`) | Kode kelas + NIS **atau** nama (tanpa kata sandi, tanpa email) | Membaca materi terbit, mengerjakan ulangan, melihat hasil yang sudah dirilis |

**Teknologi yang memengaruhi UI:**
- Next.js 16 (App Router, `cacheComponents`), React 19. Setiap halaman memeriksa sesi di dalam `<Suspense>` dan menampilkan "Memuat…" sebagai fallback.
- Tailwind v4 (token di `app/globals.css`), shadcn gaya `base-maia` dengan primitif `@base-ui/react` (bukan Radix).
- Ikon dari `@hugeicons/react`. Font: **Figtree** (sans) dan Geist Mono.
- Semua copy UI dalam **Bahasa Indonesia** untuk anak kelas 6. Zona waktu tampilan **WITA (Asia/Makassar, UTC+8)**.
- Konten Markdown dirender aman lewat `react-markdown` + `remark-gfm` (tanpa HTML mentah).

**Sumber konten:** Matematika Kelas VI (2022, 4 bab) dan IPAS Kelas VI edisi revisi (2025, 6 bab). Perintah `bun run db:seed:content` mengisi 2 mapel dan 10 bab secara idempoten. Isi materi dan soal tetap draf sampai guru memverifikasinya.

---

## 2. Peta halaman (sitemap)

### Umum
| URL | Isi |
|---|---|
| `/` | Langsung dialihkan ke `/login` |
| `/login` | Masuk siswa |
| `/teacher/login` | Masuk guru |
| (403) `forbidden` | "Halaman ini terkunci": peran salah membuka halaman peran lain |
| (404) `not-found` | "Halaman tidak ditemukan" |

### Guru (`/teacher/...`)
Navigasi atas (desktop: baris tautan; ponsel: menu `<details>` "Menu"), plus tombol Keluar:
**Dasbor · Kelas · Siswa · Mapel & Bab · Materi · Bank Soal · Ulangan**

| URL | Halaman |
|---|---|
| `/teacher` | Dasbor guru (daftar tugas) |
| `/teacher/password` | Ganti kata sandi (wajib bila `mustChangePassword`) |
| `/teacher/classes` | Kelola kelas |
| `/teacher/students` | Kelola siswa (filter `?kelas=&q=`) |
| `/teacher/subjects` | Mapel, bab, subbab |
| `/teacher/materials` | Daftar materi (filter `?subjectId=&chapterId=&status=`) |
| `/teacher/materials/new` | Buat materi |
| `/teacher/materials/[id]` | Ubah materi + panel gambar + tombol status |
| `/teacher/materials/[id]/preview` | Pratinjau materi seperti tampilan siswa |
| `/teacher/questions` | Bank soal (filter + halaman 50 per halaman) |
| `/teacher/questions/new` | Pilih tipe soal, lalu `?type=...` menampilkan form |
| `/teacher/questions/[id]` | Ubah soal + panel gambar + aksi |
| `/teacher/questions/[id]/preview` | Pratinjau tampilan siswa + kunci |
| `/teacher/quizzes` | Daftar ulangan |
| `/teacher/quizzes/new` | Buat ulangan (judul + mapel) |
| `/teacher/quizzes/[id]` | Detail ulangan: setelan, kelas, soal, terbit; setelah terbit: langkah berikutnya, pemantauan, hasil |
| `/teacher/quizzes/[id]/attempts/[attemptId]` | Jawaban satu percobaan siswa + form nilai uraian |

### Siswa (`/student/...`)
Header: **Aksara · Beranda · Materi · Keluar**. Header disembunyikan lewat CSS di halaman mengerjakan ulangan (penanda `data-attempt-page`).

| URL | Halaman |
|---|---|
| `/student` | Beranda: daftar ulangan + tombol mapel |
| `/student/materials` | Pohon materi terbit (mapel → bab → materi) |
| `/student/materials/[id]` | Baca satu materi |
| `/student/quizzes` | Dialihkan ke `/student` |
| `/student/quizzes/[quizId]/attempt` | Mengerjakan ulangan (berwaktu) |
| `/student/quizzes/[quizId]/result` | Hasil ulangan |

### API (Route Handlers)
| Metode + URL | Siapa | Fungsi |
|---|---|---|
| `POST /api/quizzes/[quizId]/start` | Siswa | Mulai atau lanjutkan percobaan |
| `POST /api/quizzes/[quizId]/submit` | Siswa | Kumpulkan jawaban (body `{attemptId}`) |
| `GET /api/quiz-attempts/[attemptId]` | Siswa | Status percobaan + waktu server (untuk sinkron ulang) |
| `PUT /api/quiz-attempts/[attemptId]/answers` | Siswa | Autosave satu jawaban |
| `POST /api/images` | Guru | Unggah gambar (multipart) |
| `GET /api/images/[id]` | Guru/Siswa | 302 ke URL R2 bertanda tangan (5 menit) bila diizinkan, selain itu 404 |
| `GET /api/exports/[quizId]` | Guru | Unduh file `.xlsx` |

Semua mutasi lain berjalan lewat **Server Actions** (43 aksi, misalnya `createClassAction`, `publishQuizAction`, `gradeEssayAction`).

---

## 3. Autentikasi dan sesi

### 3.1 Masuk siswa (`/login`)
**UI:** kartu "Masuk ke Aksara", deskripsi "Tulis kode kelas dari gurumu, lalu NIS atau namamu." Dua kolom: **Kode kelas** dan **NIS atau nama**, tombol **Masuk** ("Sedang masuk…" saat proses), tautan "Masuk sebagai guru". Kolom dikontrol state agar isian tidak hilang setelah gagal.

Bila URL berisi `?alasan=perangkat-lain`, muncul peringatan: *"Akunmu baru saja masuk dari perangkat lain. Kalau itu bukan kamu, beri tahu guru."*

**Mekanisme:**
1. **Normalisasi**
   - Kode kelas: NFKC, semua spasi dibuang, huruf besar (`"abc def"` → `"ABCDEF"`).
   - Identitas: NFKC, spasi beruntun jadi satu, trim, huruf kecil.
   - Identitas yang **hanya angka** dianggap **NIS**. Selain itu dicocokkan dengan `loginName` (nama yang dinormalisasi).
2. **Throttle** (lihat 3.5): kunci identitas `student:{kode}:{identitas}` (batas 10) dan kunci IP (batas 100).
3. Cari siswa yang **aktif**, di **kelas aktif** dengan kode itu.
4. Dalam transaksi: kunci baris user (`FOR UPDATE`) dan kelas (`FOR SHARE`). Sesi lama yang sudah dicabut/kedaluwarsa dihapus. **Sesi aktif lain dicabut dengan alasan `REPLACED`** (satu siswa = satu sesi aktif). Sesi baru dibuat. Bila ada sesi yang diganti, tulis audit `STUDENT_SESSION_REPLACED`.
5. Cookie `aksara_session` diset (httpOnly, `sameSite=lax`, `secure` di produksi), lalu dialihkan ke `/student`.

**Pesan:**
- Salah: *"Kode kelas atau nama belum cocok. Coba periksa lagi, ya."* (sama untuk semua kegagalan, jadi akun tidak bisa ditebak)
- Throttle: *"Terlalu banyak percobaan. Tunggu 15 menit, lalu coba lagi."*
- Error tak terduga: *"Ada masalah. Coba lagi sebentar lagi."*

### 3.2 Masuk guru (`/teacher/login`)
**UI:** kartu "Masuk Guru", kolom **Username** dan **Kata sandi**, tombol Masuk, tautan "Masuk sebagai siswa". Username dipertahankan setelah gagal, kata sandi tidak.

**Mekanisme:**
- Username dinormalisasi (NFKC, trim, huruf kecil).
- Throttle: `teacher:{username}` (batas 5) dan IP guru terpisah `ip:teacher:{ip}` (batas 100), supaya salah ketik siswa di IP sekolah yang sama tidak mengunci guru.
- Kata sandi diverifikasi dengan **Argon2id** (memory 19456, time 2, parallelism 1). Username yang tidak ada tetap menjalankan verifikasi hash dummy, jadi waktu responsnya sama.
- Guru **boleh punya banyak sesi** (tidak saling mencabut).
- Bila `mustChangePassword` → dialihkan ke `/teacher/password`, selain itu ke `/teacher`.
- Pesan salah: *"Username atau kata sandi salah."*

### 3.3 Ganti kata sandi guru (`/teacher/password`)
**UI:** kartu "Ganti kata sandi". Deskripsinya "Buat kata sandi baru dulu sebelum memakai Aksara." bila wajib, atau "Masukkan kata sandi lama, lalu buat kata sandi baru." Kolom: Kata sandi lama, Kata sandi baru (petunjuk "Minimal 12 karakter."), Ulangi kata sandi baru.

**Aturan:** baru ≥ 12 karakter, harus berbeda dari yang lama, dan konfirmasi harus sama. Percobaan kata sandi lama ikut dihitung oleh throttle login guru, jadi sesi curian tidak bisa dipakai menebak.

**Efek:** hash baru disimpan, `mustChangePassword=false`, **semua sesi guru dicabut**, sesi baru dibuat untuk perangkat ini, audit `TEACHER_PASSWORD_CHANGED`, lalu dialihkan ke `/teacher`. Selama `mustChangePassword` aktif, semua halaman guru lain dialihkan ke sini.

### 3.4 Sesi
- Token acak 32 byte (base64url). Di DB hanya disimpan **hash SHA-256** token.
- Umur sesi: **siswa 8 jam**, **guru 12 jam**.
- Status sesi: `ok`, `revoked` (alasan `REPLACED` atau `REVOKED`), atau `none`. User nonaktif atau siswa di kelas nonaktif dianggap `none`.
- Sesi dicabut karena `REPLACED` → siswa dialihkan ke `/login?alasan=perangkat-lain`. Kasus lain → `/login` (siswa) atau `/teacher/login` (guru).
- Peran yang salah → halaman 403 "Halaman ini terkunci".

### 3.5 Throttle login
- Jendela 15 menit per kunci (hash SHA-256 dari string kunci), dicatat di tabel `LoginThrottle`.
- Setiap percobaan **dipesan dulu** secara atomik (upsert). Bila melewati batas, ditolak sebelum kredensial diperiksa.
- Kunci identitas diperiksa dulu. Kunci IP hanya dibebani selama identitas masih di bawah batas.
- Setelah berhasil: baris identitas dihapus dan jatah IP dikembalikan satu.

| Kunci | Batas / 15 menit |
|---|---|
| Guru (username) | 5 |
| Siswa (kode + identitas) | 10 |
| IP (siswa) | 100 |
| IP (guru, terpisah) | 100 |

### 3.6 Keluar
Tombol **Keluar** (komponen `LogoutButton`) ada di header guru dan siswa. Baris sesi dihapus dan cookie **selalu** dibersihkan, walaupun DB gagal. Guru diarahkan ke `/teacher/login`, siswa ke `/login`.

---

## 4. Dasbor guru

**URL:** `/teacher` · **Fungsi data:** `getTeacherDashboard()` (`lib/dashboard.ts`)

**UI:**
- Judul "Halo, {nama guru}"
- Ringkasan satu baris: `{n} materi terbit · {n} soal aktif · {n} siswa aktif`
- Kartu **"Mulai dari sini"** (hanya bila belum ada siswa aktif): daftar bernomor tautan **Buat kelas → Tambah siswa → Tulis materi**
- Bagian **"Perlu tindakan"**: daftar tugas. Tiap tugas berisi ikon, teks, dan satu tombol. Bila kosong: status sukses "Tidak ada yang perlu dikerjakan sekarang."

**Jenis tugas (urutan tampil):**

| Jenis | Kapan muncul | Teks | Tombol → tujuan |
|---|---|---|---|
| `RUNNING` | Ada percobaan berjalan di ulangan terbit | "{judul}: {n} siswa sedang mengerjakan" | **Pantau** → `/teacher/quizzes/{id}#pemantauan` |
| `GRADE` | Ada uraian belum dinilai (pada percobaan terkumpul yang tidak diganti) | "{judul}: {n} jawaban uraian belum dinilai" | **Nilai sekarang** → `#pemantauan` |
| `RELEASE` | Belum dirilis, tidak ada yang berjalan, tidak ada uraian tertunda, tidak ada pengganti tertunda, dan ada ≥1 percobaan terhitung | "{judul}: semua sudah dinilai, siap dibagikan ke {n} siswa" | **Rilis hasil** → `#hasil` |
| `OTHER_DEVICE` | Ada siswa aktif yang sesinya diganti perangkat lain dalam 7 hari | "{n} siswa masuk dari perangkat lain minggu ini" | **Lihat siswa** → `/teacher/students` |
| `REVIEWED_MATERIALS` | Ada materi berstatus "Sudah ditinjau" | "{n} materi sudah ditinjau, belum diterbitkan" | **Lihat materi** → `/teacher/materials?status=REVIEWED` |

Sebelum menghitung, dasbor memfinalkan dulu semua percobaan yang sudah lewat batas waktu (lihat 13.6).

---

## 5. Kelola kelas

**URL:** `/teacher/classes` · **Domain:** `lib/classes.ts`

**UI:**
- Kartu **"Tambah kelas"**: kolom "Nama kelas baru" (placeholder "Contoh: VI-A"), tombol **Buat kelas**.
- Bila kosong: "Belum ada kelas. Buat kelas pertama di atas."
- Satu kartu per kelas (urut nama):
  - Nama, status **Aktif/Nonaktif**, "{n} siswa"
  - Kode kelas **disamarkan** ("••• •••"), karena layar bisa sedang diproyeksikan
  - Tombol: **Tampilkan kode**, **Ganti kode**, **Keluarkan semua siswa**, **Nonaktifkan/Aktifkan**
  - Form "Ubah nama kelas" + tombol **Simpan nama**

**Mekanisme:**

| Fitur | Detail |
|---|---|
| **Buat kelas** | Nama 1–30 karakter, harus unik ("NAME_TAKEN"). Kode 6 karakter dari alfabet tanpa huruf/angka yang mirip (`ABCDEFGHJKMNPQRSTUVWXYZ23456789`), dibuat dengan `crypto.randomInt`. Bila kode bentrok, dicoba ulang sampai 5 kali. Audit `CLASS_CREATED`. |
| **Tampilkan kode** | Dialog "Kode kelas {nama}" dengan kode **besar** berformat `ABC DEF` ("Tulis kode ini di papan tulis untuk siswa."). Aria-label mengeja kode huruf demi huruf. |
| **Ganti kode** | Konfirmasi: "Kode yang lama tidak bisa dipakai untuk masuk lagi. Siswa yang sudah masuk tetap masuk…". Kode baru dijamin berbeda dari yang lama, `codeRotatedAt` diperbarui, audit `CLASS_CODE_ROTATED`. Sesi siswa **tidak** dicabut. |
| **Keluarkan semua siswa** | Konfirmasi destruktif. Semua sesi siswa di kelas itu dicabut (`REVOKED`). Audit `CLASS_SESSIONS_REVOKED` berisi jumlahnya. |
| **Nonaktifkan** | Konfirmasi destruktif. Kelas jadi nonaktif dan semua sesi siswanya dicabut. Siswa tidak bisa masuk. Audit `CLASS_DEACTIVATED`. |
| **Aktifkan** | Siswa bisa masuk lagi. Audit `CLASS_ACTIVATED`. Bila status sudah sama, tidak terjadi apa-apa (tidak ada audit). |
| **Ubah nama** | Aturan sama dengan buat kelas. Audit `CLASS_UPDATED`. |

> Kode kelas hanya keluar dari domain di halaman ini (`listClasses`). Halaman lain sengaja membuang kode sebelum data dikirim ke komponen klien.

---

## 6. Kelola siswa

**URL:** `/teacher/students?kelas={classId}&q={teks}` · **Domain:** `lib/students.ts`

**UI:**
- Kartu **"Tambah siswa"**: Nama siswa, NIS ("boleh dikosongkan", keyboard numerik), pilihan Kelas (kelas nonaktif diberi tanda "(nonaktif)"). Kelas otomatis terpilih bila filter kelas sedang aktif.
- Form filter (GET): **Kelas** (Semua kelas / per kelas) + **Cari nama atau NIS** + tombol **Cari**.
- Bila kosong: "Belum ada siswa. Tambah siswa di atas." atau "Tidak ada siswa yang cocok."
- Satu kartu per siswa (urut kelas, lalu nama):
  - Nama, status Aktif/Nonaktif, "Kelas {x} · NIS {y atau -}"
  - Peringatan kuning bila sesinya diganti perangkat lain dalam 7 hari: "Masuk dari perangkat lain {n}× minggu ini, terakhir {waktu}"
  - Tombol: **Ubah data** (dialog), **Keluarkan dari perangkat**, **Nonaktifkan/Aktifkan**

**Mekanisme:**

| Fitur | Detail |
|---|---|
| **Tambah siswa** | Nama 1–60 karakter (disimpan dalam bentuk NFKC dengan spasi tunggal, huruf besar/kecil asli tetap), **tidak boleh hanya angka**. NIS opsional, 4–20 digit, unik global. `loginName` = nama yang dinormalisasi, unik **per kelas**. Boleh ditambahkan ke kelas nonaktif (persiapan). Audit `STUDENT_CREATED`. |
| **Error unik** | "NAME_TAKEN" (nama sudah ada di kelas itu; UI menyebut nama kelasnya) dan "NIS_TAKEN". |
| **Ubah data** | Dialog berisi peringatan: nama dipakai untuk masuk, jadi sampaikan nama baru ke siswa; pindah kelas berarti siswa memakai kode kelas baru. **Pindah kelas tidak mencabut sesi.** Audit `STUDENT_UPDATED` mencatat field yang berubah. Bila tidak ada yang berubah, tidak ada audit. |
| **Keluarkan dari perangkat** | Semua sesi siswa itu dicabut. Audit `STUDENT_SESSIONS_REVOKED`. |
| **Nonaktifkan** | Sesi dicabut dan siswa tidak bisa masuk. Data tetap tersimpan. Audit `STUDENT_DEACTIVATED`. |
| **Aktifkan** | Audit `STUDENT_ACTIVATED`. |
| **Cari** | Nama mengandung teks (tanpa beda huruf besar/kecil) **atau** NIS diawali teks. Tanpa paginasi (dirancang untuk sekitar 60 siswa). |

---

## 7. Mapel, bab, dan subbab

**URL:** `/teacher/subjects` · **Domain:** `lib/subjects.ts`

Struktur: **Mapel → Bab (berurutan) → Subbab (berurutan)**. Materi dan soal menempel ke bab dan boleh juga ke subbab.

**UI:** satu kartu per mapel (urut nama):
- Nama + deskripsi. `<details>` **"Ubah"** membuka form mapel. Tombol **Hapus**.
- Daftar bab bernomor: "Bab {urutan}: {judul}", baris info "{buku} · {tahun/edisi} · {n} materi", tombol **Naik/Turun**, `<details>` **Ubah**, **Hapus**.
  - Di dalam tiap bab: "Subbab" → daftar "{urutan}. {judul} (hal. {x}) · {n} materi", dengan Naik/Turun, Ubah, Hapus. Ada juga `<details>` **"Tambah subbab"**.
- `<details>` **"Tambah bab"** di bawah daftar bab.
- Kartu terakhir: **"Tambah mapel baru"**.

**Field:**
- Mapel: Nama (≤80, unik), Deskripsi (opsional)
- Bab: Judul (≤150), Nama buku sumber (≤150), Tahun atau edisi (≤40)
- Subbab: Judul (≤150), Halaman sumber (opsional, ≤50)

**Mekanisme:**
- Bab/subbab baru mendapat urutan `max + 1`.
- **Naik/Turun** menukar urutan dengan tetangga lewat 3 tulisan dengan urutan negatif sementara, supaya batasan unik `(parent, order)` tidak bentrok. Tombol dinonaktifkan untuk posisi pertama/terakhir.
- **Hapus diblokir bila masih dipakai** (pesan `IN_USE`):
  - Mapel: "Mapel ini masih punya {n} bab." atau "Mapel ini masih dipakai {n} ulangan."
  - Bab: "Bab ini masih dipakai {n} materi dan {n} subbab."
  - Subbab: "Subbab ini masih dipakai {n} materi."
- Bagian ini tidak menulis audit.

---

## 8. Materi pelajaran

**Domain:** `lib/materials.ts` · **Renderer:** `components/material-view.tsx`

### 8.1 Daftar materi guru (`/teacher/materials`)
- Judul + tombol **Materi baru**.
- Filter GET: **Mapel**, **Bab** (label "Mapel · Bab n · Judul"), **Status**, tombol **Terapkan**.
- Tiap baris: judul, status, "{mapel} · {bab}", tombol **Naik/Turun** (hanya di dalam bab yang sama), tautan **Ubah** dan **Pratinjau**.
- Maksimal 200 baris. Bila lebih: "Tampil 200 materi pertama. Persempit filter."
- Urutan: nama mapel → urutan bab → urutan materi.

### 8.2 Buat/ubah materi (`/teacher/materials/new`, `/teacher/materials/[id]`)
**Field form:**

| Field | Wajib | Batas |
|---|---|---|
| Judul | ya | 150 |
| Ringkasan | ya | 1.000 |
| Bab | ya | pilihan |
| Subbab | tidak | harus dari bab yang dipilih |
| Isi materi (Markdown) | ya | 50.000 |
| Contoh dan aktivitas (Markdown) | tidak | 50.000 |
| Latihan (Markdown) | tidak | 50.000 |
| Sumber (nama buku) | ya | 200 |
| Halaman sumber | tidak | 50 |

Teks bantuan di kolom panjang: *"Bisa pakai Markdown: **tebal**, *miring*, daftar dengan -, tabel. Sisipkan gambar dengan kode dari panel Gambar."*

**Alur:** buat → dialihkan ke halaman ubah (panel gambar baru tersedia setelah materi ada). Halaman ubah menampilkan:
- Judul "Ubah materi" + status, "{mapel} · {bab} · Diubah {waktu WITA}"
- Tautan **Pratinjau** + tombol status (8.3)
- Form materi
- Bagian **Gambar** (panel gambar, lihat §9)
- **Hapus materi** (hanya saat Draf)

**Validasi referensi:** kode gambar `aksara-image:{id}` di isi, contoh, atau latihan **harus milik materi ini**. Selain itu muncul error "Ada kode gambar yang bukan milik materi ini. Pakai tombol Salin kode sisip."

**Pindah bab:** materi diletakkan di urutan terakhir bab tujuan.

**Audit:** `MATERIAL_UPDATED` (berisi daftar field yang berubah) hanya ditulis bila materi sedang **Terbit**.

### 8.3 Alur status materi
```
DRAF ──"Tandai sudah ditinjau"──▶ SUDAH DITINJAU ──"Terbitkan" (konfirmasi)──▶ TERBIT
  ▲                                   │                                      │
  └────────"Kembalikan ke draft"──────┘                                      │
  └──────────────────"Tarik dari siswa" (konfirmasi)─────────────────────────┘
```
- Transisi yang diizinkan: DRAFT→REVIEWED, REVIEWED→PUBLISHED/DRAFT, PUBLISHED→DRAFT.
- Saat terbit, `publishedAt` diisi. Perubahan status memakai pengecekan optimis (`where status = from`), jadi perubahan bersamaan ditolak sebagai `BAD_TRANSITION`.
- Audit `MATERIAL_STATUS_CHANGED` {from, to}.
- Dialog konfirmasi: "Terbitkan materi ini? Siswa akan bisa membaca materi ini." dan "Tarik materi dari siswa? Siswa tidak bisa lagi membuka materi ini."

### 8.4 Hapus materi
Hanya saat **Draf** (selain itu `NOT_DRAFT`: "Kembalikan materi ke draft dulu sebelum menghapusnya."). Baris gambar dan materi dihapus dalam transaksi, lalu objek R2 dihapus sebagai upaya terbaik. Audit `MATERIAL_DELETED` {title}. Setelah itu dialihkan ke daftar.

### 8.5 Pratinjau guru (`/teacher/materials/[id]/preview`)
Catatan di atas: "Pratinjau. Status: {status}" + "Kembali ke ubah materi". Isinya `MaterialView` yang sama dengan tampilan siswa.

### 8.6 Materi untuk siswa
- **`/student/materials`**: judul "Materi Pelajaran". Hanya mapel dan bab yang punya materi **Terbit**. Tiap mapel punya anchor `#{subjectId}` (dipakai tombol mapel di beranda). Daftar: mapel → "Bab n: judul" → tautan materi. Bila kosong: "Belum ada materi. Tunggu gurumu menerbitkannya."
- **`/student/materials/[id]`**: hanya materi Terbit. Materi Draf/Ditinjau ditolak server walaupun URL diketik langsung, dan halaman 404 khusus menampilkan "Materi ini sedang diperbarui guru." + "Kembali ke daftar materi".
- **Tata letak `MaterialView`:** H1 judul → ringkasan → bagian **Materi** → **Contoh dan Aktivitas** (bila ada) → **Latihan** (bila ada) → "Sumber: {buku}, {halaman}".

### 8.7 Renderer Markdown (`Markdown`)
- GFM (tabel, dll.). H1 Markdown diturunkan jadi H2 (karena H1 halaman sudah ada), H2 jadi H3, H3–H6 jadi H4.
- Tautan dibuka di tab baru dengan `rel="noopener noreferrer"`.
- Gambar `![alt](aksara-image:{id})` dirender sebagai `<img src="/api/images/{id}">` dengan `loading="lazy"` + keterangan "{caption} · {sumber}".
- Gambar dengan URL lain tidak dimuat dan diganti teks "[Gambar: {alt}]". ID yang tidak dikenal diganti "[Gambar tidak tersedia]".
- Tabel dibungkus wadah yang bisa digulir.

---

## 9. Gambar (materi dan soal)

**Domain:** `lib/images.ts`, `lib/storage.ts` (Cloudflare R2, bucket privat) · **UI:** `image-panel.tsx`

### 9.1 Panel gambar (di halaman ubah materi/soal)
- **Form unggah:** File gambar (JPG/PNG/WEBP), **Teks alternatif** (wajib), Keterangan (opsional), Sumber gambar (opsional), tombol **Unggah gambar**.
  - Petunjuk alt: "Jelaskan isi gambar untuk siswa yang tidak bisa melihatnya." Untuk soal ditambah: "Teks alternatif jangan membocorkan jawaban. Tulis mis. 'Gambar A'."
  - Klien menolak file > 4 MB sebelum mengirim.
- **Kartu per gambar:** pratinjau gambar, **kode sisip** `![alt](aksara-image:{id})` + tombol **Salin kode sisip** ("Kode disalin." atau "Salin manual: pilih kode di atas."), form ubah alt/keterangan/sumber + **Simpan keterangan**, dan tombol **Hapus** (konfirmasi menyebut bila gambar masih dipakai di teks).

### 9.2 Mekanisme unggah (`POST /api/images`)
1. Cek same-origin, sesi guru, ukuran ≤ 4 MB (413 bila lebih).
2. **Jenis file ditentukan dari magic bytes** (JPEG/PNG/WEBP), bukan dari klaim browser.
3. Diproses dengan `sharp`: rotasi otomatis, **sisi terpanjang maks 1600 px** (tidak diperbesar), di-encode ulang (EXIF/GPS terbuang), batas piksel input 50 juta, hasil maks 2 MB.
4. Batas jumlah: **20 gambar per materi**, **5 gambar per soal**.
5. Disimpan ke R2 dengan kunci `images/{uuid}.{ext}`, lalu baris `Image` + audit `IMAGE_ADDED`. Bila DB gagal, objek R2 dihapus lagi.
6. Pesan: "File harus gambar JPG, PNG, atau WEBP.", "Ukuran gambar paling besar 4 MB.", "Satu materi paling banyak 20 gambar.", "Satu soal paling banyak 5 gambar."

### 9.3 Hapus gambar
- Bila gambar dipakai ulangan yang **sudah terbit** (ada `QuizQuestionImage`): hanya ditandai `deletedAt`. Baris dan objek R2 tetap ada supaya ulangan terbit tidak rusak.
- Bila tidak: baris dan objek R2 dihapus.
- Audit `IMAGE_REMOVED`.

### 9.4 Siapa boleh melihat gambar (`GET /api/images/[id]`)
- **Guru:** semua gambar.
- **Siswa:**
  - Gambar materi **Terbit**: boleh.
  - Gambar soal (beku di ulangan) dengan visibilitas **QUESTION**: boleh bila siswa sedang mengerjakan ulangan itu (sebelum batas waktu + 60 detik) **atau** sudah mengumpulkan dan hasil sudah dirilis.
  - Gambar **EXPLANATION** (pembahasan): hanya bila siswa boleh melihat kunci (aturan sama dengan halaman hasil, §17.3).
  - Selain itu 404.
- Respons berupa redirect 302 ke URL R2 bertanda tangan yang berlaku **5 menit** (`private, max-age=300`). `storageKey` tidak pernah dikirim ke klien.

---

## 10. Bank soal

**Domain:** `lib/questions.ts`, `lib/grading.ts` · **Label:** `questions/labels.ts`

### 10.1 Tipe soal

| Tipe (kode) | Label UI | Opsi | Kunci |
|---|---|---|---|
| `SINGLE_CHOICE` | Pilihan ganda | 2–6 (slot a–f) | satu opsi |
| `TRUE_FALSE` | Benar/salah | — | Benar atau Salah |
| `MULTIPLE_SELECT` | Pilihan ganda kompleks | 3–8 (slot a–h) | ≥1 opsi benar, **tidak boleh semua** |
| `SHORT_ANSWER` | Jawaban singkat | — | 1–10 jawaban diterima (satu per baris, ≤200 karakter), opsi "Huruf besar dan kecil dibedakan" |
| `ESSAY` | Uraian | — | Rubrik (opsional, ≤5.000), dinilai manual |

Aturan opsi: teks opsi tidak boleh kembar, ≤1.000 karakter. Untuk jawaban singkat, jawaban yang setelah dinormalisasi jadi sama ditolak ("Ada jawaban diterima yang sama.").

### 10.2 Field umum soal

| Field | Wajib | Batas/nilai |
|---|---|---|
| Bab / Subbab | bab wajib | subbab harus dari bab itu |
| Teks soal (Markdown) | ya | 5.000 |
| Pembahasan (Markdown) | tidak | 5.000 |
| Poin | ya | bilangan bulat 1–100 (bawaan 1) |
| Kesulitan | ya | Mudah / Sedang / Sulit |
| Sumber | tidak | 200 |
| Catatan verifikasi | tidak | 5.000 (internal guru) |

Status soal: **Draf** atau **Aktif**. Hanya soal **Aktif** yang bisa dimasukkan ke ulangan.

### 10.3 Daftar soal (`/teacher/questions`)
- Judul "Bank soal" + **Soal baru**.
- `<details>` **"Saring soal"** (terbuka otomatis bila ada filter): Mapel, Bab, Subbab, Tipe, Kesulitan, Status, Kata kunci (cari di teks soal), tombol **Terapkan**.
- Tiap baris: cuplikan teks (kode gambar dan tanda Markdown dibuang, maks 120 karakter), badge tipe, badge kesulitan, status, "{mapel} · {bab}", tautan **Ubah** dan **Pratinjau**.
- Paginasi **50 per halaman** (Sebelumnya/Berikutnya), urut dari yang terakhir diubah.

### 10.4 Buat soal (`/teacher/questions/new`)
Langkah 1: "Pilih tipe soal." (daftar 5 tautan tipe). Langkah 2: `?type=X` menampilkan form untuk tipe itu. Setelah dibuat, dialihkan ke halaman ubah, karena gambar baru bisa diunggah setelah soal ada.

**Bagian kunci per tipe di form:**
- PG / PG kompleks: daftar slot "Opsi A…", di sebelahnya radio/checkbox "Benar". Legend: "Opsi (isi 2 sampai 6, pilih yang benar)" atau "Opsi (isi 3 sampai 8, centang yang benar)". Slot kosong diabaikan.
- Benar/salah: radio Benar/Salah.
- Jawaban singkat: textarea "Jawaban diterima (satu per baris)" + checkbox case-sensitive.
- Uraian: textarea "Rubrik (opsional)".

### 10.5 Ubah soal (`/teacher/questions/[id]`)
- Header: "Ubah soal" + badge tipe + status, "{mapel} · {bab} · Diubah {waktu}".
- **Pratinjau**, tombol **Aktifkan / Jadikan draft**, **Duplikat** (konfirmasi), **Hapus soal** (hanya Draf).
- Form (tipe **tidak bisa diubah**: "Tipe soal tidak bisa diubah."), lalu panel **Gambar**.
- Kode gambar di teks soal, opsi, dan pembahasan harus milik soal ini.
- Audit `QUESTION_UPDATED` (field yang berubah, dibandingkan dengan JSON berkunci terurut) hanya bila soal **Aktif**. `QUESTION_STATUS_CHANGED` untuk perubahan status.

### 10.6 Duplikat soal
Salinan dibuat sebagai **Draf**, lengkap dengan gambarnya. Objek R2 disalin dulu, lalu ID gambar di teks soal, pembahasan, dan opsi ditulis ulang ke ID baru. Bila gagal, salinan R2 dibersihkan. Setelah itu dialihkan ke halaman ubah salinan.

### 10.7 Hapus soal
Hanya bila **Draf** ("Jadikan soal draft dulu sebelum menghapusnya.") **dan belum pernah dipakai ulangan** (`IN_USE`). Gambar ikut terhapus. Audit `QUESTION_DELETED`.

### 10.8 Pratinjau soal (`/teacher/questions/[id]/preview`)
- Catatan: "Pratinjau. {tipe} · {kesulitan} · Status: {status}" + kembali.
- Bagian **"Tampilan siswa"**: `QuestionView` dari `toPublicQuestion` (tanpa kunci).
- Bagian **"Kunci dan pembahasan"**: jawaban benar (opsi dengan huruf) atau jawaban diterima (+ keterangan case), Rubrik (uraian), Poin, Pembahasan, Catatan verifikasi.

### 10.9 Bentuk soal untuk siswa
`toPublicQuestion` adalah **satu-satunya** bentuk soal yang boleh dikirim ke siswa: `{id, type, prompt, options[{id,text}], images}`. Gambar disaring ke yang benar-benar dirujuk di teks soal atau opsi. Kunci, pembahasan, dan catatan **tidak pernah** ikut.

---

## 11. Ulangan: penyusunan oleh guru

**Domain:** `lib/quizzes.ts` · **UI:** `quizzes/quiz-forms.tsx`, `quizzes/[id]/page.tsx`

### 11.1 Daftar ulangan (`/teacher/quizzes`)
Judul + **Buat ulangan**. Tiap baris: judul (tautan), status (Draf/Terbit), badge mapel, "{n} soal · {kelas, …} atau 'Belum ada kelas' · Diubah {waktu}". Urut dari yang terakhir diubah.

### 11.2 Buat ulangan (`/teacher/quizzes/new`)
Hanya **Judul** + **Mata pelajaran**, lalu dialihkan ke halaman detail untuk setelan lengkap. Nilai bawaan yang diisi oleh `createQuizAction`: durasi **30 menit**, batas percobaan **1**, kebijakan **Nilai tertinggi**, tanpa jadwal, tanpa KKM. Ketiga checkbox (acak soal, acak pilihan, tampilkan pembahasan) **mati**, karena form buat tidak mengirimnya. Akibatnya "Tampilkan pembahasan" harus dinyalakan manual sebelum terbit, walaupun default di skema DB `true`.

### 11.3 Halaman detail, mode Draf
Urutan bagian: **Setelan → Kelas → Soal (+ Tambah soal dari bank) → Terbitkan**.

**Setelan:**

| Field | Aturan | Setelah terbit |
|---|---|---|
| Judul | 1–150 | bisa diubah |
| Petunjuk | ≤5.000 | bisa diubah |
| Durasi (menit) | bulat 1–300 | 🔒 terkunci |
| Mulai (WITA) | `datetime-local`, opsional | 🔒 terkunci |
| Selesai (WITA) | opsional, harus setelah Mulai | **hanya boleh diperpanjang** (tidak bisa dikosongkan atau dimajukan) |
| Batas percobaan | bulat 1–10 | **hanya boleh dinaikkan** |
| Kebijakan nilai | Nilai tertinggi / Remedial | bisa diubah (dengan catatan peringatan) |
| KKM | bulat 0–100, opsional | bisa diubah |
| Acak urutan soal | checkbox | 🔒 terkunci |
| Acak urutan pilihan | checkbox | 🔒 terkunci |
| Tampilkan pembahasan setelah hasil dirilis | checkbox | 🔒 terkunci |

- **Remedial** butuh KKM **dan** batas percobaan ≥2 ("Kebijakan Remedial butuh KKM dan batas percobaan minimal 2.").
- Input waktu dibaca sebagai WITA. Tanggal yang "melompat" (mis. 30 Feb) ditolak.
- Field terkunci tampil `disabled`, dan nilainya tetap dikirim lewat input tersembunyi.
- Saat terbit muncul catatan: "Mengubah kebijakan nilai atau KKM dapat mengubah rekap semua siswa."
- Audit `QUIZ_SCORING_CHANGED` bila kebijakan atau KKM berubah.

**Kelas:** daftar checkbox semua kelas (nonaktif ditandai). Draf: set kelas **diganti total** (minimal 1). Terbit: kelas yang sudah dipilih terkunci, **hanya boleh menambah** ("Kelas tidak bisa dilepas setelah ulangan terbit.").

**Soal:**
- Ringkasan "{n} soal · total {poin} poin · {n} uraian".
- Daftar bernomor: cuplikan + badge tipe + kontrol: **Poin** (1–100) + Simpan, **Naik/Turun**, **Keluarkan** (konfirmasi menampilkan cuplikan soal).
- Menghapus soal merapatkan nomor posisi berikutnya.
- **Tambah soal dari bank** (anchor `#tambah`): filter Bab/Tipe/Kesulitan, hanya **soal Aktif dari mapel ulangan ini**, paginasi 50, tiap baris "{tipe} · {kesulitan} · {bab} · {poin} poin" + tombol **Tambah**, atau label "Sudah dipilih". Poin awal = poin bawaan soal. Soal kembar ditolak ("Soal ini sudah ada di ulangan.").
- Setelah terbit: soal, urutan, dan poin **terkunci** ("Soal ulangan terkunci setelah terbit."). Daftar hanya menampilkan "{n} poin".

Semua operasi penyusunan mengunci baris ulangan (`SELECT … FOR UPDATE`), jadi tidak bisa balapan dengan proses terbit.

---

## 12. Ulangan: terbit dan snapshot

### 12.1 Terbitkan
Tombol utama **Terbitkan ulangan**, konfirmasi: "Soal, poin, dan sebagian setelan terkunci setelah terbit."

**Syarat terbit** (bila gagal, semua alasan ditampilkan sekaligus):
- "Tambahkan minimal satu soal."
- "Soal nomor {n} masih draf. Aktifkan dulu di bank soal."
- "Total poin harus lebih dari 0."
- "Jadwal selesai sudah lewat."
- "Pilih minimal satu kelas aktif."
- Aturan Remedial (KKM + percobaan ≥2)
- "Soal nomor {n} memakai gambar yang sudah dihapus."

**Saat terbit (satu transaksi):**
1. Tiap `QuizQuestion` menyimpan **`questionSnapshot`** (tipe, teks, opsi, gambar: bentuk publik tanpa kunci) dan **`answerKeySnapshot`** (kunci + pembahasan).
2. Gambar yang dirujuk dibekukan ke `QuizQuestionImage` dengan visibilitas **QUESTION** (ada di teks soal/opsi) atau **EXPLANATION** (hanya di pembahasan).
3. Status menjadi `PUBLISHED` dan `publishedAt` diisi. Audit `QUIZ_PUBLISHED` {jumlah soal, poin maks}.

**Akibatnya:** penilaian **hanya membaca snapshot**. Perubahan bank soal sesudahnya tidak mengubah ulangan yang sudah terbit.

### 12.2 Kembalikan ke draf
Tombol destruktif **Kembalikan ke draf**: "Siswa tidak bisa lagi melihat ulangan ini sampai kamu menerbitkannya lagi." **Ditolak bila sudah ada percobaan** (`HAS_ATTEMPTS`). Snapshot dan gambar beku dihapus. Audit `QUIZ_UNPUBLISHED`.

---

## 13. Ulangan: siswa mengerjakan

**Domain:** `lib/attempts.ts` · **UI:** `attempt/attempt-client.tsx`, `attempt/save-queue.ts`, `quizzes/start-button.tsx`

### 13.1 Mulai (`StartButton` → `POST /api/quizzes/{id}/start`)
Tombol berlabel **Mulai / Ulangi / Lanjutkan** ("Membuka…" saat proses). Bila berhasil, pindah ke halaman mengerjakan. Bila gagal, pesan tampil di bawah tombol (`role=status`):

| Kode | Pesan |
|---|---|
| `NOT_FOUND` | "Ulangan tidak ditemukan." (belum terbit, bukan kelasnya, belum jadwal mulai, atau sudah lewat jadwal selesai) |
| `ATTEMPT_LIMIT` | "Kesempatan mengerjakan ulangan ini sudah habis." |
| `REMEDIAL_NOT_AVAILABLE` | "Remedial belum bisa dimulai untukmu." |
| `RESULTS_RELEASED` | "Hasil ulangan ini sudah dirilis, jadi tidak bisa diulang lagi." |
| Sesi habis | "Sesimu berakhir. Masuk lagi untuk melanjutkan." + tautan "Masuk lagi" |
| Offline | "Tidak ada sambungan internet. Coba lagi." |

**Mekanisme mulai:**
1. Memfinalkan percobaan lama yang kedaluwarsa.
2. Mengunci ulangan secara bersama (`FOR SHARE`).
3. Bila sudah ada percobaan **berjalan**, ID yang sama dikembalikan (**idempoten**, tidak membuat duplikat).
4. Bila ada **percobaan pengganti** yang sudah diberikan tapi belum dipakai: slot percobaan lama dipakai ulang.
5. Bila tidak: hitung percobaan terpakai (tidak termasuk yang diganti). Bila ≥ batas → `ATTEMPT_LIMIT`. Untuk percobaan ke-2 dan seterusnya, `retakeOpen` diperiksa (§16.3).
6. Buat percobaan:
   - `deadlineAt = min(sekarang + durasi, jadwal selesai)`
   - `questionOrder` (diacak dengan Fisher–Yates + `crypto.randomInt` bila diaktifkan)
   - `optionOrder` per soal PG/PG kompleks (diacak bila diaktifkan)
   - `maxPoints` = jumlah poin
   - `attemptNumber` (urutan fisik) dan `slot` (urutan hitungan: 1 = utama, ≥2 = remedial/ulang)
7. Start bersamaan dari dua tab: pelanggaran unik ditangkap, lalu percobaan yang sedang berjalan dikembalikan.

### 13.2 Halaman mengerjakan (`/student/quizzes/[quizId]/attempt`)
Header navigasi siswa disembunyikan. Markdown soal dirender di server, jadi klien tidak membawa renderer.

**Susunan UI:**
- Judul ulangan
- ⏱ **"Sisa waktu MM:SS"** (ikon jam + teks, tidak bergantung warna)
- Peringatan (aria-live): ikon ⚠ + "Sisa 5 menit." lalu "Sisa 1 menit."
- Status simpan (aria-live): "Menyimpan…", "Tersimpan {jam:menit}", atau "Gagal menyimpan, mencoba lagi"
- **Navigasi nomor soal**: tombol 1..n, nomor aktif terisi (`aria-current=step`), soal terjawab diberi ikon centang (aria-label "Soal n, sudah/belum dijawab")
- **Satu soal per layar** (`fieldset` + legend "Soal n"):
  - PG → radio dalam kartu-label besar (min 48 px, border tebal saat dipilih)
  - PG kompleks → checkbox
  - Benar/salah → radio "Benar"/"Salah"
  - Jawaban singkat → input teks (maks 200)
  - Uraian → textarea (maks 5.000)
- Tombol **Sebelumnya**, **Berikutnya**, **Kumpulkan jawaban**
- Dialog konfirmasi "Kumpulkan jawaban?" dengan "{n} soal belum dijawab." atau "Semua soal sudah dijawab." + Batal/Kumpulkan
- Bila tidak ada percobaan berjalan: "Tidak ada ulangan yang sedang kamu kerjakan." + kembali

### 13.3 Timer
- Server mengirim `deadlineAt` dan `serverNow`. Sisa waktu = `deadlineAt − (serverNow + waktu berlalu menurut performance.now())`, jadi **jam perangkat tidak dipakai**.
- `setInterval` 1 detik hanya untuk tampilan. Saat 0, klien flush lalu submit otomatis sekali.
- **Sinkron ulang** ke `GET /api/quiz-attempts/{id}` saat tab terlihat lagi, saat online kembali, dan saat komponen tampil ulang. Bila percobaan sudah ditutup, layar langsung berganti.
- Server adalah penentu: semua pengecekan memakai waktu server, tanpa `setTimeout` di server.

### 13.4 Autosave (`createSaveQueue`)
- Pilihan (radio/checkbox) disimpan **langsung**. Teks disimpan setelah **jeda 800 ms** atau saat blur/pindah soal.
- Antrean per soal: hanya satu request per soal dalam satu waktu, dan nilai terbaru menggantikan yang menunggu.
- `PUT /api/quiz-attempts/{id}/answers` dengan body `{quizQuestionId, answer}`.
- Respons:
  - 2xx: tersimpan
  - 409/404: percobaan ditutup ("Waktu habis, jawabanmu sudah dikumpulkan." / "Jawabanmu sudah dikumpulkan.")
  - 400/403: ditolak, tidak diulang
  - Jaringan/5xx: **coba ulang dengan backoff** 1→2→4→8→10 detik. Event `online` melewati jeda.
  - Redirect login: "Sesimu berakhir…"
- `beforeunload` memperingatkan bila masih ada yang belum tersimpan.
- **Server:** jawaban divalidasi terhadap snapshot (`parseAnswer`: opsi harus ada, tidak kembar, panjang teks dibatasi), lalu dibangun ulang tanpa field tambahan. Jawaban kosong disimpan sebagai null. Upsert per `(attemptId, quizQuestionId)` membuatnya idempoten. Ditolak bila status bukan berjalan atau bila waktu ≥ `deadlineAt + 60 detik`.

### 13.5 Kumpulkan (`POST /api/quizzes/{id}/submit`)
- Klien flush antrean (maks tunggu 5 detik), lalu kirim.
- Server: `MANUAL` bila sebelum `deadlineAt`, atau `TIMEOUT` bila lewat tapi masih dalam masa tenggang 60 detik. Update bersyarat (status berjalan dan belum lewat tenggang) membuatnya **idempoten**: kirim ulang tidak menggandakan.
- Lalu penilaian otomatis berjalan (§15.1).
- Layar selesai: ✓ "Jawabanmu sudah dikumpulkan. Nilaimu akan muncul setelah gurumu membagikannya." + "Kembali ke daftar ulangan".
- Bila submit manual gagal: "Gagal mengumpulkan. Coba lagi." Bila submit oleh timer gagal: server tetap memfinalkan sendiri.

### 13.6 Finalisasi kedaluwarsa (tanpa proses latar belakang)
`finalizeExpiredAttempts` dipanggil secara **malas** setiap kali data dibaca: saat start, membuka halaman mengerjakan, dasbor, daftar ulangan siswa, rekap, hasil, ekspor, dan halaman jawaban guru. Percobaan berjalan yang `deadlineAt + 60 detik` sudah lewat diubah jadi `SUBMITTED / TIMEOUT` dengan `submittedAt = deadlineAt`, lalu dinilai.

### 13.7 Masa tenggang jaringan
`GRACE_MS = 60.000`. Penulisan diterima sampai `deadlineAt + 60 detik`. Hitung mundur tetap berakhir di `deadlineAt`.

---

## 14. Pemantauan dan percobaan pengganti

### 14.1 Halaman detail ulangan, mode Terbit
Urutan bagian: **Langkah berikutnya → Pemantauan → Hasil → `<details>` "Lihat setelan ulangan"** (berisi setelan, kelas, soal, dan Status terbit).

**Langkah berikutnya** (satu hal, sesuai urutan yang menghalangi rilis):
1. "{n} siswa sedang mengerjakan."
2. Tautan "Nilai {n} jawaban uraian." ke percobaan pertama yang perlu dinilai
3. "{n} siswa belum mengerjakan percobaan pengganti."
4. "Hasil sudah dibagikan." (+ tombol Batalkan rilis)
5. Selain itu: tombol utama **Rilis hasil**

### 14.2 Pemantauan (`MonitorList`, anchor `#pemantauan`)
- **Muat otomatis** setiap 30 detik selama ada siswa yang sedang mengerjakan dan tab terlihat. Ada tombol **Muat ulang** + "Diperbarui pukul {jam}". Ini hanya untuk tampilan dan tidak memengaruhi waktu ulangan.
- **Ringkasan status** (chip, angka 0 disembunyikan): Belum mulai · Sedang mengerjakan · Menunggu pengganti · Perlu dinilai · Selesai.
- **Filter kelas** (hanya bila ulangan untuk >1 kelas).
- **Satu kartu per siswa** (siswa aktif dari kelas sasaran + siapa pun yang punya percobaan; urut kelas lalu nama):
  - Nama, "{kelas} · NIS {x}"
  - Status. Saat mengerjakan: "Sedang mengerjakan · {terjawab}/{total} terjawab · selesai pukul {jam}" atau "waktu habis" (saat dalam masa tenggang)
  - "Percobaan {terpakai}/{maks}"
  - Nilai: "Nilai {x}" atau "Nilai sementara {x}" (ada uraian belum dinilai). Untuk Remedial ditambah "Nilai asli {tertinggi}" bila lebih tinggi dari rekap. Bila belum ada: "Belum ada nilai".
  - Ketuntasan (bila ada KKM): Tuntas / Belum tuntas / "Ketuntasan belum ada" (nilai belum final)
  - `<details>` **"Lihat percobaan"**: tiap percobaan "Percobaan n", status (Sedang dikerjakan / Terkumpul / Diganti) + nilai, tautan **Lihat jawaban**, **Nilai uraian** (bila ada yang tertunda), dan **Beri percobaan pengganti**

**Status rekap per siswa:**

| State | Label pemantauan | Label rekap/Excel | Kondisi |
|---|---|---|---|
| `IN_PROGRESS` | Sedang mengerjakan | Sedang dikerjakan | ada percobaan berjalan |
| `WAITING_REPLACEMENT` | Menunggu pengganti | Menunggu percobaan pengganti | pengganti diberikan tapi belum dimulai |
| `NOT_STARTED` | Belum mulai | Belum mulai | belum ada percobaan terhitung |
| `NEEDS_GRADING` | Perlu dinilai | Belum final – {n} uraian belum dinilai | ada uraian belum dinilai |
| `FINAL` | Selesai | Final | semua final |

### 14.3 Percobaan pengganti
**Tujuan:** membatalkan percobaan yang bermasalah (mis. perangkat rusak) supaya siswa bisa mengulang tanpa menghabiskan jatah.

**UI:** dialog "Beri percobaan pengganti", "{siswa}, percobaan n. Percobaan ini tidak dihitung lagi dan siswa bisa mengulang.", kolom **Alasan** (5–300 huruf).

**Mekanisme:**
- **Ditolak bila hasil sudah dirilis** (siswa yang sudah melihat kunci tidak boleh dapat percobaan baru). Ini diurutkan terhadap proses rilis dengan kunci bersama.
- Percobaan ditandai `replacementGrantedAt/ById/Reason`. Bila masih berjalan, langsung ditutup dengan alasan `REPLACED`.
- Tidak bisa diberikan dua kali (`ALREADY_REPLACED`).
- Percobaan pengganti yang dimulai siswa memakai **slot yang sama** dan merujuk ke percobaan lama (`replacesAttemptId`, unik).
- Percobaan yang diganti **tidak dihitung** dalam batas percobaan maupun nilai.
- Di beranda siswa muncul "Gurumu membukakan kesempatan baru untukmu".
- Audit `ATTEMPT_REPLACEMENT_GRANTED` {alasan}.

---

## 15. Penilaian (otomatis dan uraian)

### 15.1 Penilaian otomatis (saat submit/finalisasi)
Hanya membaca **snapshot**. Aturan per tipe (`gradeObjective`):

| Tipe | Benar bila… |
|---|---|
| PG | `optionId` sama dengan kunci |
| Benar/salah | nilai boolean sama |
| PG kompleks | **semua atau nol**: himpunan pilihan **persis** sama dengan kunci. Pilihan kembar ditolak, jawaban kosong tidak pernah benar. |
| Jawaban singkat | **cocok persis** setelah normalisasi. Case-insensitive: NFKC + spasi dirapatkan + trim + huruf kecil. Case-sensitive: sama, tanpa diubah ke huruf kecil. Tanpa fuzzy matching. Jawaban kosong tidak pernah benar. |
| Uraian | tidak dinilai otomatis |

- Poin benar = poin soal di ulangan, salah = 0. Input yang rusak bernilai 0.
- Uraian yang **tidak dijawab** tetap dibuatkan baris jawaban kosong, jadi tetap menunggu dinilai guru.
- `objectiveScore` disimpan. `gradingStatus` = `PENDING_MANUAL_GRADING` bila ada uraian, selain itu `FINAL`.

### 15.2 Halaman jawaban siswa (`/teacher/quizzes/[id]/attempts/[attemptId]`)
- "Kembali ke ulangan", nama siswa (H1), "{ulangan} · {kelas} · percobaan n", waktu kumpul atau "Masih dikerjakan."
- Bila diganti: "Percobaan ini diganti ({alasan}), jadi tidak dihitung."
- "Nilai {x}" atau "Nilai sementara {x}: {n} uraian belum dinilai"
- Tiap soal (urutan asli, bukan urutan acak): "Soal n · {tipe} · {poin} poin", tampilan soal, lalu daftar **Jawaban siswa / Kunci (atau Rubrik) / Poin** ("{x} dari {y} (benar/salah)" atau "Belum dinilai"), dan `<details>` **Pembahasan**.

### 15.3 Menilai uraian (`EssayGradeForm`)
- Kolom **"Nilai soal n (0 sampai {maks})"** (`inputMode=decimal`, petunjuk "Boleh pecahan, misalnya 2,5."), **Umpan balik untuk siswa** (opsional, ≤2.000), tombol **Simpan nilai**.
- Untuk uraian kosong yang belum dinilai ada tombol cepat **Beri 0**.
- **Aturan:** angka ≤3 digit dengan maksimal 2 desimal, koma atau titik diterima, 0 sampai poin soal. Hanya untuk percobaan **terkumpul dan tidak diganti**, dan hanya soal uraian (selain itu `NOT_GRADABLE`).
- Baris percobaan dikunci, jadi dua uraian dari percobaan yang sama bisa dinilai bersamaan dengan aman.
- Setelah tersimpan: `gradingStatus` dihitung ulang (`FINAL` bila tidak ada lagi uraian yang belum dinilai).
- Audit `MANUAL_SCORE_SET` {from, to} hanya bila nilainya berubah.
- Nilai uraian **boleh diubah** lagi kapan saja (juga setelah rilis).

---

## 16. Perhitungan nilai dan rekap

**Modul murni:** `lib/scoring.ts`. Nilai **dihitung setiap kali dibaca, tidak pernah disimpan**.

### 16.1 Nilai satu percobaan
`nilai = diperoleh / maks × 100`, dibulatkan setengah ke atas ke **2 desimal**. Poin dihitung dalam **perseratus** (bilangan bulat) supaya tidak ada galat float (2/3 → 66,67). Format tampil Indonesia: `66,67`. Ulangan dengan maks 0 tidak bisa terbit.

### 16.2 Rekap per siswa (`computeRecap`)
Yang dihitung hanya percobaan **terkumpul dan tidak diganti**.

| Kebijakan | Nilai rekap |
|---|---|
| **Nilai tertinggi** (`HIGHEST`), atau tanpa KKM | Nilai percobaan tertinggi |
| **Remedial** (`REMEDIAL`, ada KKM) | Nilai **percobaan utama** (slot 1). Bila utama < KKM dan ada remedial (slot ≥2) yang lebih baik, rekap = `min(nilai remedial terbaik, KKM)`. Remedial **dibatasi di KKM** dan tidak pernah menurunkan nilai. |

- Hasil rekap juga menyimpan `primary` (nilai utama), `highest` (tertinggi asli), dan `basis` (percobaan dasar).
- `final` = semua percobaan terhitung sudah `FINAL`. Selama belum final, rekap **bukan** nilai akhir.
- `passed` = rekap ≥ KKM (null bila tidak ada KKM).

### 16.3 Kapan boleh mengulang (`retakeOpen`)
Berlaku untuk percobaan ke-2 dan seterusnya (batas percobaan diperiksa terpisah):

| Kondisi | Boleh mengulang? |
|---|---|
| Hasil **belum dirilis**, kebijakan Nilai tertinggi | ✅ ya (sampai batas) |
| Hasil belum dirilis, kebijakan Remedial | ❌ tidak (remedial menunggu hasil) |
| Hasil **sudah dirilis**, Nilai tertinggi | ❌ tidak |
| Hasil sudah dirilis, Remedial | ✅ hanya bila rekap **final** dan **< KKM** |

---

## 17. Rilis hasil dan halaman hasil siswa

**Domain:** `lib/results.ts`

### 17.1 Rilis hasil
Tombol **Rilis hasil** (konfirmasi): "Siswa bisa melihat nilai, jawaban, dan (bila diizinkan) kunci serta pembahasan." Bila jadwal belum berakhir, ditambah: "Jadwal belum berakhir: siswa yang belum mengerjakan masih bisa mulai, padahal temannya sudah melihat kunci."

**Ditolak bila** (pesan digabung: "Hasil belum bisa dirilis: …"):
- "{n} siswa masih mengerjakan"
- "{n} uraian belum dinilai"
- "{n} percobaan pengganti belum dikerjakan"

Memakai kunci eksklusif, jadi tidak ada start atau pemberian pengganti yang bisa menyelinap. Yang disimpan: `resultsReleasedAt` + `resultsReleasedById`. Audit `RESULTS_RELEASED` {attemptCount}.

### 17.2 Batalkan rilis
"Siswa tidak bisa lagi melihat nilai dan pembahasan, dan remedial baru tidak bisa dimulai." Kolom rilis dikosongkan. Audit `RESULTS_UNRELEASED` {waktu rilis sebelumnya}.

Bagian **Hasil** di detail ulangan: "Dirilis {waktu}." atau "Belum dirilis. Siswa belum bisa melihat nilai." + tombol **Unduh Excel**.

### 17.3 Kapan kunci dan pembahasan boleh dilihat siswa (`maySeeKey`)
Semua syarat ini harus terpenuhi:
1. Hasil sudah dirilis **dan** setelan "Tampilkan pembahasan" hidup
2. Siswa punya ≥1 percobaan terhitung
3. Tidak ada percobaan yang sedang berjalan
4. Siswa **tidak bisa lagi** memulai percobaan (jatah habis atau `retakeOpen` false). Selama remedial masih terbuka, kunci tetap disembunyikan.

Aturan yang sama juga mengatur gambar pembahasan (§9.4).

### 17.4 Halaman hasil siswa (`/student/quizzes/[quizId]/result`)
`getStudentResult` adalah **satu-satunya** bentuk hasil untuk siswa. Hasilnya `null` sebelum rilis, untuk siswa lain, atau bila belum ada yang dikumpulkan.

**Belum ada hasil:** "Hasil ulangan" + status "Nilaimu belum keluar" + "Nilaimu akan muncul setelah gurumu membagikannya." + **Kembali ke beranda**.

**Ada hasil:**
- "Hasil: {judul}"
- Nilai besar ("Nilaimu" + angka 5xl), atau "Nilaimu belum final. Gurumu masih memeriksa jawaban uraian."
- Ketuntasan (bila ada KKM): ✅ "Kamu tuntas", ℹ "Kamu bisa mencoba lagi" (+ tombol **Coba lagi dari beranda**), atau "Belum mencapai KKM {x}"
- Satu bagian per percobaan terhitung. Label: Remedial → "Percobaan utama" / "Remedial n", selain itu "Percobaan n". Isinya: "Dikumpulkan {waktu} · Nilai {x}" atau "Nilai belum final".
- Tiap soal: tampilan soal, **"Jawabanmu: …"**, lalu **Benar / Belum tepat** + "Poin x dari y" (uraian: "Belum dinilai guru" / "Poin x dari y").
- Bila kunci boleh dilihat: **"Jawaban benar: …"** (tidak untuk uraian, karena rubrik selalu internal), **Pembahasan** (Markdown + gambar), **"Pesan guru: …"**.

---

## 18. Ekspor Excel

**Endpoint:** `GET /api/exports/[quizId]` (khusus guru, dibuat per permintaan, tidak pernah disimpan atau publik) · **Domain:** `lib/export.ts` (ExcelJS)

**Nama file:** `Nilai_{slug-judul}_{YYYY-MM-DD WITA}.xlsx`. Header baris pertama ditebalkan.

**Sheet 1, `Rekap Nilai`** (satu baris per siswa):
No · Kelas · NIS · Nama siswa · Mata pelajaran · Judul ulangan · Percobaan digunakan · Kebijakan nilai · KKM · Nilai utama · Nilai tertinggi asli · Poin diperoleh · Poin maksimum · Nilai rekap (0–100) · Ketuntasan (Tuntas/Belum tuntas) · Status penilaian · Waktu pengumpulan · Status publikasi hasil ("Dirilis {waktu}" / "Belum dirilis").
→ Bila **belum final**, semua sel nilai **dikosongkan** dan kolom status menjelaskan alasannya.

**Sheet 2, `Rincian Jawaban`** (satu baris per percobaan × soal):
Kelas · NIS · Nama siswa · Judul ulangan · Percobaan ke- (dengan tag "Utama"/"Remedial n"/"Pengganti"/"Diganti: {alasan}") · Nomor soal · ID soal · Tipe soal · Jawaban siswa · Kunci jawaban · Poin maksimum · Poin diperoleh · Status penilaian (Otomatis / Menunggu penilaian guru / Dinilai guru / Sedang dikerjakan / Diganti, tidak dihitung) · Umpan balik guru.

**Keamanan:**
- Teks yang diawali `=`, `+`, `-`, `@`, tab, atau CR diberi awalan `'` supaya tidak dijalankan sebagai rumus.
- Jawaban dan kunci dibuat mudah dibaca: teks opsi, "Benar/Salah", gambar menjadi "[gambar: alt]", "(kosong)".
- Audit `EXPORT_DOWNLOADED` {rowCount}. Respons `Cache-Control: no-store`.

---

## 19. Log audit

Tabel `AuditLog`: aktor, aksi, jenis entitas, ID entitas, metadata JSON, waktu. **Tidak pernah** berisi kata sandi, token, kode kelas, kunci jawaban, atau jawaban lengkap. Saat ini **belum ada halaman UI** untuk melihat log. Satu-satunya pemakaian di UI adalah peringatan "masuk dari perangkat lain" (dari `STUDENT_SESSION_REPLACED`).

| Area | Aksi |
|---|---|
| Siswa | `STUDENT_CREATED`, `STUDENT_UPDATED`, `STUDENT_SESSIONS_REVOKED`, `STUDENT_SESSION_REPLACED`, `STUDENT_DEACTIVATED`, `STUDENT_ACTIVATED` |
| Kelas | `CLASS_CREATED`, `CLASS_UPDATED`, `CLASS_CODE_ROTATED`, `CLASS_SESSIONS_REVOKED`, `CLASS_DEACTIVATED`, `CLASS_ACTIVATED` |
| Guru | `TEACHER_PASSWORD_CHANGED` |
| Materi | `MATERIAL_STATUS_CHANGED`, `MATERIAL_UPDATED` (hanya saat terbit), `MATERIAL_DELETED` |
| Gambar | `IMAGE_ADDED`, `IMAGE_REMOVED` |
| Soal | `QUESTION_STATUS_CHANGED`, `QUESTION_UPDATED` (hanya saat aktif), `QUESTION_DELETED` |
| Ulangan | `QUIZ_PUBLISHED`, `QUIZ_UNPUBLISHED`, `QUIZ_SCORING_CHANGED`, `ATTEMPT_REPLACEMENT_GRANTED`, `MANUAL_SCORE_SET`, `RESULTS_RELEASED`, `RESULTS_UNRELEASED`, `EXPORT_DOWNLOADED` |

---

## 20. Halaman beranda siswa

**URL:** `/student` · **Data:** `listStudentQuizzes` + `listPublishedTree`

**UI:**
- "Halo, {nama}"
- Bagian **Ulangan**: kartu per ulangan (judul, mapel, status, aksi). Bila kosong: "Belum ada ulangan. Sambil menunggu, baca materi dulu."
- Bagian **Materi**: tombol besar per mapel yang punya materi terbit, menuju `/student/materials#{id}`.

**State ulangan untuk siswa:**

| State | Kondisi |
|---|---|
| `IN_PROGRESS` | ada percobaan berjalan |
| `SCHEDULED` | sebelum jadwal mulai |
| `CLOSED` | jadwal selesai lewat |
| `REPLACEMENT` | ada pengganti yang belum dipakai |
| `DONE` | jatah habis atau pengulangan terkunci |
| `AVAILABLE` | bisa dimulai |

**Urutan dan tampilan kartu:**

| Peringkat | Kasus | Status (tone) | Aksi |
|---|---|---|---|
| 1 | Sedang dikerjakan | ⚠ "Waktu habis pukul {jam}". Kartu diberi border tebal + label "Lanjutkan ulangan" | **Lanjutkan** |
| 2 | Bisa dikerjakan / pengganti | ℹ "Siap dikerjakan" / "Kamu bisa mencoba lagi" / "Gurumu membukakan kesempatan baru untukmu" | **Mulai** atau **Ulangi** (+ **Lihat nilai** bila sudah dirilis) |
| 3 | Hasil sudah dirilis | ✅ "Nilaimu sudah keluar" | **Lihat nilai** |
| 4 | Terjadwal | "Mulai {tanggal jam}" | — |
| 5 | Lainnya (menunggu guru, ditutup) | "Nilaimu akan muncul setelah gurumu membagikannya" | — |

Hanya ulangan **terbit** untuk kelas siswa itu yang tampil.

---

## 21. Komponen dan pola UI bersama

| Komponen | Lokasi | Fungsi / pola |
|---|---|---|
| `Status` | `components/status.tsx` | Badge **ikon + teks** (tidak hanya warna). Tone: success ✓, warning ⚠, danger ✕, info ℹ, neutral 🕒. Boleh membungkus baris di ponsel. |
| `ConfirmAction` | `components/confirm-action.tsx` | Tombol + AlertDialog konfirmasi. Varian `destructive` (merah), `primary` (tombol utama besar), dan outline. Aksi dikirim sebelum dialog tertutup. Trigger memakai `aria-disabled` supaya fokus bisa kembali. Hasil tampil lewat `Feedback`. |
| `FormField` / `FormMessage` | `components/form-field.tsx` | Label + input + petunjuk + error (`aria-invalid`, `aria-describedby`). |
| `Feedback` | `components/form-feedback.tsx` | Menampilkan `FormState.message` (ok/error). |
| `LogoutButton` | `components/logout-button.tsx` | Tombol Keluar (form ke `logoutAction`). |
| `MaterialView` / `Markdown` | `components/material-view.tsx` | Renderer konten (RSC murni). |
| `QuestionView` | `components/question-view.tsx` | Hanya menerima `PublicQuestion`. Opsi tampil sebagai daftar A, B, C. Untuk isian: "Jawaban diketik." |
| shadcn `ui/*` | `components/ui/` | AlertDialog, Alert, Badge, Button, Card, Dialog, Input, Label |

**Pola yang konsisten di seluruh app:**
- **Form = Server Action + `useActionState`.** Saat error, nilai isian dikembalikan (`values`) supaya tidak hilang. Error per field + pesan form. Tombol berganti teks "Sedang menyimpan…" dan memakai `aria-busy`.
- **Filter = form GET** dengan `<select>` native + tombol "Terapkan"/"Cari". State ada di URL.
- **Ubah inline = `<details>/<summary>`** (halaman Mapel & Bab, filter Bank Soal, setelan ulangan terbit, daftar percobaan).
- **Urutan = tombol Naik/Turun** (tanpa drag-and-drop), dinonaktifkan di ujung daftar.
- **Target sentuh** minimal 44–48 px (`min-h-11`/`min-h-12`, `h-11`).
- **Teks tersembunyi untuk pembaca layar** (`sr-only`) melengkapi tombol berlabel sama ("Ubah", "Hapus", "Naik").
- **Loading** = teks "Memuat…" di fallback Suspense.
- **Waktu** selalu WITA, format `id-ID` (mis. "30 Okt 2026, 10.00").
- **Nilai** selalu 2 desimal dengan koma.

---

## 22. Kamus label dan status (copy UI)

| Domain | Kode → Label |
|---|---|
| Status materi | DRAFT → **Draf** (neutral) · REVIEWED → **Sudah ditinjau** (info) · PUBLISHED → **Terbit** (success) |
| Status soal | DRAFT → **Draf** · ACTIVE → **Aktif** |
| Tipe soal | SINGLE_CHOICE → Pilihan ganda · TRUE_FALSE → Benar/salah · MULTIPLE_SELECT → Pilihan ganda kompleks · SHORT_ANSWER → Jawaban singkat · ESSAY → Uraian |
| Kesulitan | EASY → Mudah · MEDIUM → Sedang · HARD → Sulit |
| Status ulangan | DRAFT → **Draf** · PUBLISHED → **Terbit** |
| Kebijakan nilai | HIGHEST → Nilai tertinggi · REMEDIAL → Remedial |
| Status kelas/siswa | Aktif · Nonaktif |
| Alasan kumpul | MANUAL (siswa menekan Kumpulkan) · TIMEOUT (waktu habis) · REPLACED (diganti guru) |
| Status penilaian | PENDING_MANUAL_GRADING (Belum final) · FINAL |

---

## 23. Batas angka dan validasi

| Item | Batas |
|---|---|
| Nama kelas | 1–30, unik |
| Kode kelas | 6 karakter, alfabet tanpa I/L/O/0/1 |
| Nama siswa | 1–60, tidak boleh hanya angka, unik per kelas (setelah normalisasi) |
| NIS | opsional, 4–20 digit, unik global |
| Kata sandi guru | ≥12 karakter |
| Mapel / Bab / Subbab | 80 / 150 / 150 karakter |
| Judul materi / ringkasan / isi | 150 / 1.000 / 50.000 |
| Teks soal / pembahasan / opsi | 5.000 / 5.000 / 1.000 |
| Opsi PG / PG kompleks | 2–6 / 3–8 |
| Jawaban singkat diterima | 1–10, masing-masing ≤200 |
| Poin soal | 1–100 (bulat) |
| Durasi ulangan | 1–300 menit |
| Batas percobaan | 1–10 |
| KKM | 0–100 |
| Jawaban siswa singkat / uraian | ≤200 / ≤5.000 karakter |
| Nilai uraian | 0–poin soal, ≤2 desimal |
| Umpan balik guru | ≤2.000 |
| Alasan pengganti | 5–300 |
| Gambar | ≤4 MB unggah, ≤2 MB hasil, sisi ≤1600 px, 20/materi, 5/soal, JPG/PNG/WEBP |
| Masa tenggang | 60 detik setelah `deadlineAt` |
| Sesi | siswa 8 jam, guru 12 jam |
| Throttle | 15 menit; guru 5, siswa 10, IP 100 |
| Daftar materi | 200 baris (tanpa paginasi) |
| Bank soal | 50 per halaman |
| Peringatan perangkat lain | jendela 7 hari |
| Muat otomatis pemantauan | 30 detik |
| Autosave teks | jeda 800 ms; backoff 1–10 detik |

---

## 24. Aturan yang tidak boleh dilanggar saat redesain

Ini batas keamanan dan integritas. **Redesain tidak boleh melonggarkannya** walaupun demi UI yang lebih sederhana.

1. **Otorisasi di server untuk setiap operasi.** Menyembunyikan tombol bukan kontrol akses. Setiap halaman dan aksi memanggil `requireTeacher`/`requireStudent`.
2. **Kunci jawaban tidak pernah sampai ke klien siswa.** Komponen siswa hanya boleh menerima `PublicQuestion`, `AttemptView`, dan `StudentResult`. Jangan mengoper objek soal penuh ke komponen klien.
3. **Kode kelas** hanya tampil di halaman Kelas (dan tetap disamarkan sampai "Tampilkan kode").
4. **Timer milik server.** Tampilan hitung mundur boleh didesain ulang, tetapi tetap berbasis `deadlineAt` + `serverNow`, dan **tidak boleh hanya mengandalkan warna** (wajib ada teks/ikon).
5. **Autosave dan submit idempoten.** Status simpan ("Menyimpan…/Tersimpan/Gagal") harus tetap terlihat dan diumumkan (`aria-live`).
6. **Materi draf** tidak boleh tampil untuk siswa.
7. **Hasil tersembunyi sampai dirilis.** Nilai yang belum final tidak boleh ditampilkan sebagai nilai akhir.
8. **Status = ikon + teks.**
9. **Ponsel lebih dulu** (uji di lebar 360 px), bisa dipakai dengan keyboard, target sentuh ≥44 px.
10. **Copy dalam Bahasa Indonesia untuk anak kelas 6**: kalimat pendek dan ramah ("ya", "gurumu", "kamu").

---

## 25. Catatan pengamatan untuk redesain

Pengamatan netral dari struktur UI saat ini, sebagai bahan diskusi (bukan keputusan):

**Guru**
- **Detail ulangan adalah halaman terpanjang.** Mode draf menumpuk Setelan, Kelas, Soal, Tambah soal, dan Terbitkan dalam satu kolom. Mode terbit menumpuk Langkah berikutnya, Pemantauan, Hasil, dan setelan dalam `<details>`. Kandidat untuk tab, langkah (wizard), atau tata letak dua kolom di desktop.
- **Menambah soal ke ulangan** memakai filter GET yang memuat ulang halaman dan pindah ke `#tambah`. Tidak ada pencarian kata kunci di panel ini, padahal bank soal punya.
- **Mapel & Bab** memakai banyak `<details>` bersarang (Ubah/Tambah di tiga tingkat). Hierarkinya dalam dan bisa membingungkan guru yang kurang terbiasa dengan teknologi.
- **Form tambah** (kelas, siswa) selalu tampil di atas daftar dan memakan ruang layar pertama.
- **Tidak ada impor siswa massal.** Siswa ditambah satu per satu.
- **Daftar materi** tanpa paginasi (dibatasi 200 baris). Siswa tanpa paginasi.
- **Penyusunan urutan** hanya lewat Naik/Turun satu langkah per klik.
- **Penilaian uraian** dilakukan per percobaan. Belum ada tampilan "nilai soal nomor X untuk semua siswa".
- **Log audit** belum punya halaman.
- **Ekspor** hanya per ulangan.
- **Editor Markdown** berupa textarea biasa tanpa pratinjau langsung. Pratinjau ada di halaman terpisah. Gambar disisipkan dengan menyalin kode.
- **Format waktu ulangan** memakai input `datetime-local` native dengan label "(WITA)".

**Siswa**
- **Beranda** sudah memprioritaskan aksi (lanjutkan → kerjakan → nilai → jadwal), tetapi semua kartu memakai bentuk yang sama.
- **Halaman mengerjakan**: tombol nomor soal, status simpan, dan timer berada di header yang ikut tergulir (tidak menempel). Di ponsel, timer bisa keluar layar saat soal panjang.
- **Materi**: daftar berupa tautan teks. Belum ada penanda "sudah dibaca", pencarian, atau navigasi antarmateri (sebelumnya/berikutnya).
- **Hasil**: semua percobaan dan semua soal tampil memanjang dalam satu halaman.
- Halaman "Memuat…" masih berupa teks polos, belum ada skeleton.

---

*Peta file utama:* domain di `lib/*.ts` (`auth/`, `classes`, `students`, `subjects`, `materials`, `images`, `storage`, `questions`, `grading`, `quizzes`, `attempts`, `scoring`, `results`, `export`, `dashboard`, `format`, `audit`); halaman di `app/(auth)`, `app/(teacher)/teacher`, `app/(student)/student`; API di `app/api`; komponen bersama di `components/`.
