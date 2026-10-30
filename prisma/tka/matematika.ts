// Original practice items following the TKA SD Matematika kisi-kisi (docs/tka-sd-kisi-kisi.md). Not official questions.
import type { TkaSubject } from "./types";

const B = "Bilangan";
const G = "Objek Geometri";
const P = "Pengukuran";
const D = "Data";

const TABEL_NILAI = `| Nilai | Banyak siswa |
|---|---|
| 60 | 3 |
| 70 | 7 |
| 80 | 9 |
| 90 | 5 |
| 100 | 1 |`;

const PIKTOGRAM = `| Petani | Hasil panen jagung |
|---|---|
| Pak Ali | 🌽🌽🌽🌽 |
| Pak Budi | 🌽🌽🌽🌽🌽🌽 |
| Pak Candra | 🌽🌽🌽 |
| Pak Dedi | 🌽🌽🌽🌽🌽 |

Keterangan: setiap 🌽 = 10 karung.`;

const DIAGRAM = "Diagram batang berikut menunjukkan banyak siswa kelas 6 yang memilih setiap kegiatan ekstrakurikuler.\n\n{{gambar}}";
const DIAGRAM_ALT =
  "Diagram batang kegiatan ekstrakurikuler: Pramuka 12 siswa, Tari 8, Futsal 15, Melukis 6, Paduan Suara 9.";

export const MATEMATIKA: TkaSubject = {
  name: "TKA Matematika",
  quizTitle: "Tryout TKA 1 – Matematika",
  chapters: [
    {
      title: B,
      subs: [
        "Pecahan senilai",
        "Membandingkan dan mengurutkan pecahan",
        "Pecahan, desimal, dan persen",
        "Operasi hitung bilangan cacah",
        "Operasi hitung pecahan",
        "Kelipatan, faktor, KPK, dan FPB",
      ],
    },
    { title: G, subs: ["Bangun datar", "Bangun ruang dan visualisasi spasial"] },
    {
      title: P,
      subs: [
        "Panjang, volume, massa, waktu, dan kecepatan",
        "Konversi satuan baku",
        "Keliling dan luas bangun datar",
        "Volume bangun ruang",
        "Besar sudut dan penaksiran ukuran",
      ],
    },
    { title: D, subs: ["Penyajian data", "Membaca dan menggunakan data"] },
  ],
  items: [
    // Bilangan (12)
    {
      chapter: B, sub: "Pecahan senilai", type: "SINGLE_CHOICE", level: "PEMAHAMAN", difficulty: "EASY",
      prompt: "Perhatikan gambar berikut.\n\n{{gambar}}\n\nPecahan yang senilai dengan bagian yang diarsir adalah ....",
      figure: { name: "pecahan", alt: "Pita dibagi menjadi 8 bagian sama besar. 6 bagian diarsir." },
      options: ["2/3", "3/4", "4/6", "6/10"],
      key: 1,
      explanation: "Bagian yang diarsir 6 dari 8, yaitu 6/8. Pembilang dan penyebut sama-sama dibagi 2: 6/8 = 3/4.",
    },
    {
      chapter: B, sub: "Membandingkan dan mengurutkan pecahan", type: "SINGLE_CHOICE", level: "PEMAHAMAN", difficulty: "MEDIUM",
      prompt: "Urutan pecahan 2/3, 1/2, 3/4, dan 5/12 dari yang **terkecil** ke yang **terbesar** adalah ....",
      options: ["5/12, 1/2, 2/3, 3/4", "1/2, 2/3, 3/4, 5/12", "5/12, 2/3, 1/2, 3/4", "3/4, 2/3, 1/2, 5/12"],
      key: 0,
      explanation: "Samakan penyebutnya menjadi 12: 2/3 = 8/12, 1/2 = 6/12, 3/4 = 9/12, dan 5/12. Urutannya 5/12, 6/12, 8/12, 9/12.",
    },
    {
      chapter: B, sub: "Pecahan, desimal, dan persen", type: "CATEGORY", level: "PEMAHAMAN", difficulty: "EASY",
      prompt: "Tentukan **Benar** atau **Salah** untuk setiap pernyataan berikut.",
      options: ["0,25 sama dengan 25%.", "3/4 sama dengan 0,75.", "1/5 sama dengan 50%.", "1,5 sama dengan 150%."],
      key: [true, true, false, true],
      explanation: "0,25 = 25/100 = 25%. 3/4 = 75/100 = 0,75. 1/5 = 20/100 = 20%, bukan 50%. 1,5 = 150/100 = 150%.",
    },
    {
      chapter: B, sub: "Operasi hitung bilangan cacah", type: "SINGLE_CHOICE", level: "APLIKASI", difficulty: "MEDIUM",
      prompt: "Sebuah sekolah menerima 18 kardus buku. Setiap kardus berisi 24 buku. Semua buku dibagikan sama banyak ke 12 kelas. Banyak buku yang diterima setiap kelas adalah ....",
      options: ["36 buku", "432 buku", "54 buku", "30 buku"],
      key: 0,
      explanation: "Banyak buku seluruhnya 18 × 24 = 432. Setiap kelas menerima 432 : 12 = 36 buku.",
    },
    {
      chapter: B, sub: "Operasi hitung pecahan", type: "SINGLE_CHOICE", level: "APLIKASI", difficulty: "MEDIUM",
      prompt: "Pak Rudi mengecat 2/5 bagian pagar pada hari Senin dan 1/4 bagian pagar pada hari Selasa. Bagian pagar yang **belum** dicat adalah ....",
      options: ["7/20", "13/20", "3/9", "6/9"],
      key: 0,
      explanation: "Yang sudah dicat 2/5 + 1/4 = 8/20 + 5/20 = 13/20. Yang belum dicat 20/20 − 13/20 = 7/20.",
    },
    {
      chapter: B, sub: "Operasi hitung pecahan", type: "SINGLE_CHOICE", level: "APLIKASI", difficulty: "EASY",
      prompt: "Setiap hari Sinta minum 3/4 liter susu. Banyak susu yang diminum Sinta dalam 6 hari adalah ....",
      options: ["4 1/2 liter", "3 liter", "6 3/4 liter", "4 1/4 liter"],
      key: 0,
      explanation: "6 × 3/4 = 18/4 = 4 2/4 = 4 1/2 liter.",
    },
    {
      chapter: B, sub: "Kelipatan, faktor, KPK, dan FPB", type: "SINGLE_CHOICE", level: "APLIKASI", difficulty: "MEDIUM",
      prompt: "Lampu merah berkedip setiap 6 detik dan lampu hijau berkedip setiap 8 detik. Kedua lampu berkedip bersamaan tepat pukul 19.00. Kedua lampu akan berkedip bersamaan lagi untuk pertama kalinya setelah ... detik.",
      options: ["24", "48", "14", "2"],
      key: 0,
      explanation: "Waktu berkedip bersamaan adalah kelipatan persekutuan terkecil (KPK) dari 6 dan 8. Kelipatan 6: 6, 12, 18, 24. Kelipatan 8: 8, 16, 24. KPK = 24.",
    },
    {
      chapter: B, sub: "Kelipatan, faktor, KPK, dan FPB", type: "SINGLE_CHOICE", level: "APLIKASI", difficulty: "MEDIUM",
      prompt: "Bu Ani memiliki 36 jeruk dan 48 apel. Buah-buahan itu dimasukkan ke dalam kantong. Setiap kantong berisi jeruk yang sama banyak dan apel yang sama banyak, tanpa sisa. Paling banyak kantong yang dapat dibuat adalah ....",
      options: ["12 kantong", "6 kantong", "24 kantong", "144 kantong"],
      key: 0,
      explanation: "Banyak kantong terbanyak adalah FPB dari 36 dan 48. Faktor 36: 1, 2, 3, 4, 6, 9, 12, 18, 36. Faktor 48: 1, 2, 3, 4, 6, 8, 12, 16, 24, 48. FPB = 12. Setiap kantong berisi 3 jeruk dan 4 apel.",
    },
    {
      chapter: B, sub: "Membandingkan dan mengurutkan pecahan", type: "MULTIPLE_SELECT", level: "PEMAHAMAN", difficulty: "MEDIUM",
      prompt: "Pilih **semua** pecahan yang nilainya **lebih dari** 1/2.",
      options: ["3/5", "4/9", "5/8", "2/6", "7/12"],
      key: [0, 2, 4],
      explanation: "Pecahan lebih dari 1/2 jika pembilangnya lebih dari setengah penyebut. 3 > 2,5 (benar), 4 < 4,5 (tidak), 5 > 4 (benar), 2 < 3 (tidak), 7 > 6 (benar).",
    },
    {
      chapter: B, sub: "Kelipatan, faktor, KPK, dan FPB", type: "MULTIPLE_SELECT", level: "PENALARAN", difficulty: "HARD",
      prompt: "Dayu berkata, \"Bilangan 60 adalah kelipatan persekutuan dari 4, 5, dan 6.\"\n\nPilih **semua** pernyataan yang benar.",
      options: [
        "Perkataan Dayu benar karena 60 habis dibagi 4, 5, dan 6.",
        "60 adalah KPK dari 4, 5, dan 6.",
        "30 juga kelipatan persekutuan dari 4, 5, dan 6.",
        "120 juga kelipatan persekutuan dari 4, 5, dan 6.",
        "FPB dari 4, 5, dan 6 adalah 2.",
      ],
      key: [0, 1, 3],
      explanation: "60 : 4 = 15, 60 : 5 = 12, 60 : 6 = 10, jadi 60 kelipatan persekutuan. Tidak ada bilangan lebih kecil dari 60 yang habis dibagi ketiganya, jadi KPK = 60. 120 = 2 × 60 juga kelipatan persekutuan. 30 tidak habis dibagi 4. FPB dari 4, 5, dan 6 adalah 1.",
    },
    {
      chapter: B, sub: "Pecahan, desimal, dan persen", type: "SINGLE_CHOICE", level: "PENALARAN", difficulty: "HARD",
      prompt: "Harga sepasang sepatu Rp200.000. Toko A memberi potongan 25%. Toko B memberi potongan 1/5 dari harga, lalu memberi potongan lagi Rp15.000. Pernyataan yang benar adalah ....",
      options: [
        "Di Toko B lebih murah Rp5.000 daripada di Toko A.",
        "Di Toko A lebih murah Rp5.000 daripada di Toko B.",
        "Harga di kedua toko sama.",
        "Di Toko B lebih murah Rp15.000 daripada di Toko A.",
      ],
      key: 0,
      explanation: "Toko A: 25% × 200.000 = 50.000, harga menjadi Rp150.000. Toko B: 1/5 × 200.000 = 40.000, harga menjadi 160.000 − 15.000 = Rp145.000. Toko B lebih murah 150.000 − 145.000 = Rp5.000.",
    },
    {
      chapter: B, sub: "Operasi hitung pecahan", type: "CATEGORY", level: "PENALARAN", difficulty: "MEDIUM",
      prompt: "Dina mengerjakan soal penjumlahan pecahan seperti ini:\n\n1/2 + 1/3 = (1 + 1)/(2 + 3) = 2/5\n\nTentukan **Benar** atau **Salah** untuk setiap pernyataan tentang pekerjaan Dina.",
      options: [
        "Cara Dina benar karena pembilang dijumlah dengan pembilang dan penyebut dijumlah dengan penyebut.",
        "Dina seharusnya menyamakan penyebut terlebih dahulu.",
        "Hasil yang benar adalah 5/6.",
        "Hasil 2/5 lebih kecil daripada 1/2, jadi jawaban Dina pasti salah.",
      ],
      key: [false, true, true, true],
      explanation: "Penyebut harus disamakan dulu: 1/2 + 1/3 = 3/6 + 2/6 = 5/6. Menambah sesuatu ke 1/2 pasti hasilnya lebih dari 1/2, sedangkan 2/5 kurang dari 1/2, jadi 2/5 pasti salah.",
    },

    // Objek Geometri (5)
    {
      chapter: G, sub: "Bangun datar", type: "CATEGORY", level: "PEMAHAMAN", difficulty: "EASY",
      prompt: "Tentukan **Benar** atau **Salah** untuk setiap pernyataan tentang **persegi panjang** berikut.",
      options: [
        "Memiliki 4 sudut siku-siku.",
        "Keempat sisinya selalu sama panjang.",
        "Sisi-sisi yang berhadapan sama panjang dan sejajar.",
        "Kedua diagonalnya sama panjang.",
      ],
      key: [true, false, true, true],
      explanation: "Persegi panjang punya 4 sudut siku-siku, sisi berhadapan sama panjang dan sejajar, serta diagonal yang sama panjang. Keempat sisinya tidak harus sama panjang; jika sama, bangun itu disebut persegi.",
    },
    {
      chapter: G, sub: "Bangun ruang dan visualisasi spasial", type: "SINGLE_CHOICE", level: "PENALARAN", difficulty: "HARD",
      prompt: "Perhatikan susunan kubus berikut. Semua tumpukan kubus berdiri sampai ke lantai.\n\n{{gambar}}\n\nJika susunan itu dilihat **dari atas**, banyak persegi yang terlihat adalah ....",
      figure: {
        name: "kubusAtas",
        alt: "Susunan kubus satuan: baris belakang berisi tumpukan 3, 2, dan 1 kubus; baris depan berisi dua tumpukan 1 kubus di sebelah kiri.",
      },
      options: ["5", "8", "3", "6"],
      key: 0,
      explanation: "Dari atas, setiap tumpukan terlihat sebagai satu persegi, berapa pun tingginya. Ada 3 tumpukan di belakang dan 2 tumpukan di depan, jadi terlihat 5 persegi.",
    },
    {
      chapter: G, sub: "Bangun datar", type: "MULTIPLE_SELECT", level: "PEMAHAMAN", difficulty: "EASY",
      prompt: "Pilih **semua** bangun datar yang keempat sisinya **selalu** sama panjang.",
      options: ["Persegi", "Belah ketupat", "Persegi panjang", "Layang-layang", "Trapesium"],
      key: [0, 1],
      explanation: "Persegi dan belah ketupat selalu memiliki empat sisi yang sama panjang. Persegi panjang, layang-layang, dan trapesium tidak selalu.",
    },
    {
      chapter: G, sub: "Bangun ruang dan visualisasi spasial", type: "SINGLE_CHOICE", level: "APLIKASI", difficulty: "MEDIUM",
      prompt: "Perhatikan susunan kubus satuan berikut. Tidak ada kubus yang melayang; setiap tumpukan penuh sampai ke lantai.\n\n{{gambar}}\n\nBanyak kubus satuan pada susunan itu adalah ....",
      figure: {
        name: "kubusHitung",
        alt: "Susunan kubus di atas alas 2 × 2: tumpukan paling belakang 3 kubus, dua tumpukan samping masing-masing 2 kubus, tumpukan paling depan 1 kubus.",
      },
      options: ["8 kubus", "6 kubus", "7 kubus", "9 kubus"],
      key: 0,
      explanation: "Hitung per tumpukan: 3 + 2 + 2 + 1 = 8 kubus. Kubus bagian bawah tumpukan belakang tertutup, tetapi tetap ada karena tumpukan penuh sampai ke lantai.",
    },
    {
      chapter: G, sub: "Bangun datar", type: "SINGLE_CHOICE", level: "PEMAHAMAN", difficulty: "EASY",
      prompt: "Sebuah bangun datar memiliki 3 sisi. Tepat dua sisinya sama panjang dan dua sudutnya sama besar. Bangun tersebut adalah ....",
      options: ["Segitiga sama kaki", "Segitiga sama sisi", "Segitiga siku-siku", "Segitiga sembarang"],
      key: 0,
      explanation: "Segitiga yang tepat dua sisinya sama panjang disebut segitiga sama kaki. Kedua sudut alasnya sama besar.",
    },

    // Pengukuran (8)
    {
      chapter: P, sub: "Konversi satuan baku", type: "SINGLE_CHOICE", level: "PEMAHAMAN", difficulty: "EASY",
      prompt: "Hasil dari 2,5 kg + 750 g adalah ... gram.",
      options: ["3.250", "2.575", "1.000", "32.500"],
      key: 0,
      explanation: "2,5 kg = 2,5 × 1.000 = 2.500 g. Jadi 2.500 g + 750 g = 3.250 g.",
    },
    {
      chapter: P, sub: "Panjang, volume, massa, waktu, dan kecepatan", type: "SINGLE_CHOICE", level: "APLIKASI", difficulty: "MEDIUM",
      prompt: "Sebuah kereta berangkat dari Stasiun A pukul 07.45 dan tiba di Stasiun B pukul 10.20. Lama perjalanan kereta adalah ....",
      options: ["2 jam 35 menit", "3 jam 35 menit", "2 jam 25 menit", "3 jam 25 menit"],
      key: 0,
      explanation: "Dari 07.45 ke 08.00 = 15 menit. Dari 08.00 ke 10.00 = 2 jam. Dari 10.00 ke 10.20 = 20 menit. Jumlahnya 2 jam 35 menit.",
    },
    {
      chapter: P, sub: "Panjang, volume, massa, waktu, dan kecepatan", type: "SINGLE_CHOICE", level: "APLIKASI", difficulty: "MEDIUM",
      prompt: "Pak Joko mengendarai sepeda motor dengan kecepatan rata-rata 40 km/jam selama 2 jam 30 menit. Jarak yang ditempuh Pak Joko adalah ....",
      options: ["100 km", "80 km", "92 km", "120 km"],
      key: 0,
      explanation: "2 jam 30 menit = 2,5 jam. Jarak = kecepatan × waktu = 40 × 2,5 = 100 km.",
    },
    {
      chapter: P, sub: "Keliling dan luas bangun datar", type: "SINGLE_CHOICE", level: "APLIKASI", difficulty: "EASY",
      prompt: "Sebuah kebun berbentuk persegi panjang dengan panjang 25 m dan lebar 14 m. Di sekeliling kebun akan dipasang pagar. Panjang pagar yang diperlukan adalah ....",
      options: ["78 m", "39 m", "350 m", "64 m"],
      key: 0,
      explanation: "Panjang pagar = keliling = 2 × (25 + 14) = 2 × 39 = 78 m.",
    },
    {
      chapter: P, sub: "Keliling dan luas bangun datar", type: "SINGLE_CHOICE", level: "PENALARAN", difficulty: "HARD",
      prompt: "Perhatikan gambar bangun berikut.\n\n{{gambar}}\n\nLuas bangun tersebut adalah ....",
      figure: {
        name: "bangunL",
        alt: "Bangun datar berbentuk huruf L. Sisi bawah 10 cm, sisi kiri 8 cm, sisi atas 6 cm, sisi kanan 5 cm, dan lekukan di pojok kanan atas berukuran 4 cm mendatar dan 3 cm tegak.",
      },
      options: ["68 cm²", "80 cm²", "36 cm²", "56 cm²"],
      key: 0,
      explanation: "Bagi bangun menjadi dua persegi panjang: bagian bawah 10 × 5 = 50 cm² dan bagian kiri atas 6 × 3 = 18 cm². Luas = 50 + 18 = 68 cm². Cara lain: 10 × 8 − 4 × 3 = 80 − 12 = 68 cm².",
    },
    {
      chapter: P, sub: "Volume bangun ruang", type: "SINGLE_CHOICE", level: "APLIKASI", difficulty: "HARD",
      prompt: "Sebuah akuarium berbentuk balok berukuran panjang 60 cm, lebar 30 cm, dan tinggi 40 cm. Akuarium itu diisi air sampai 3/4 bagian. Volume air dalam akuarium adalah ... liter.",
      options: ["54", "72", "18", "540"],
      key: 0,
      explanation: "Volume akuarium = 60 × 30 × 40 = 72.000 cm³ = 72 liter. Air 3/4 bagian = 3/4 × 72 = 54 liter.",
    },
    {
      chapter: P, sub: "Volume bangun ruang", type: "CATEGORY", level: "PENALARAN", difficulty: "HARD",
      prompt: "Tentukan **Benar** atau **Salah** untuk setiap pernyataan berikut.",
      options: [
        "Jika panjang sisi kubus dijadikan 2 kali semula, volumenya menjadi 2 kali semula.",
        "Volume kubus dengan panjang sisi 5 cm adalah 125 cm³.",
        "1 liter sama dengan 1.000 cm³.",
        "Balok berukuran 4 cm × 3 cm × 2 cm mempunyai volume yang sama dengan kubus bersisi 3 cm.",
      ],
      key: [false, true, true, false],
      explanation: "Sisi 2 kali membuat volume 2 × 2 × 2 = 8 kali. 5 × 5 × 5 = 125 cm³. 1 liter = 1 dm³ = 1.000 cm³. Balok 4 × 3 × 2 = 24 cm³, sedangkan kubus 3 × 3 × 3 = 27 cm³, jadi tidak sama.",
    },
    {
      chapter: P, sub: "Besar sudut dan penaksiran ukuran", type: "SINGLE_CHOICE", level: "PEMAHAMAN", difficulty: "EASY",
      prompt: "Pada pukul 03.00, jarum pendek dan jarum panjang jam membentuk sudut ....",
      options: ["siku-siku (90°)", "lancip (45°)", "tumpul (120°)", "lurus (180°)"],
      key: 0,
      explanation: "Pukul 03.00 jarum panjang di angka 12 dan jarum pendek di angka 3. Jaraknya 3 angka, dan setiap angka 30°, jadi 3 × 30° = 90° (sudut siku-siku).",
    },

    // Data (5)
    {
      chapter: D, sub: "Membaca dan menggunakan data", type: "SINGLE_CHOICE", level: "PEMAHAMAN", difficulty: "EASY",
      prompt: `${DIAGRAM}\n\nKegiatan ekstrakurikuler yang **paling sedikit** dipilih siswa adalah ....`,
      figure: { name: "diagramEkskul", alt: DIAGRAM_ALT },
      options: ["Melukis", "Tari", "Paduan Suara", "Futsal"],
      key: 0,
      explanation: "Batang terendah adalah Melukis dengan 6 siswa.",
    },
    {
      chapter: D, sub: "Membaca dan menggunakan data", type: "SINGLE_CHOICE", level: "APLIKASI", difficulty: "EASY",
      prompt: `${DIAGRAM}\n\nSelisih banyak siswa yang memilih Futsal dan yang memilih Tari adalah ....`,
      figure: { name: "diagramEkskul", alt: DIAGRAM_ALT },
      options: ["7 siswa", "23 siswa", "3 siswa", "6 siswa"],
      key: 0,
      explanation: "Futsal 15 siswa dan Tari 8 siswa. Selisihnya 15 − 8 = 7 siswa.",
    },
    {
      chapter: D, sub: "Membaca dan menggunakan data", type: "MULTIPLE_SELECT", level: "PENALARAN", difficulty: "MEDIUM",
      prompt: `Tabel berikut menunjukkan nilai ulangan Matematika siswa kelas 6.\n\n${TABEL_NILAI}\n\nPilih **semua** pernyataan yang benar.`,
      options: [
        "Nilai yang paling banyak diperoleh siswa adalah 80.",
        "Banyak siswa yang mendapat nilai lebih dari 70 adalah 15 orang.",
        "Banyak siswa seluruhnya 24 orang.",
        "Siswa yang mendapat nilai 70 atau kurang ada 10 orang.",
        "Selisih banyak siswa yang mendapat nilai 80 dan nilai 90 adalah 3 orang.",
      ],
      key: [0, 1, 3],
      explanation: "Nilai 80 diperoleh 9 siswa, paling banyak. Lebih dari 70: 9 + 5 + 1 = 15. Seluruhnya 3 + 7 + 9 + 5 + 1 = 25, bukan 24. Nilai 70 atau kurang: 3 + 7 = 10. Selisih nilai 80 dan 90: 9 − 5 = 4, bukan 3.",
    },
    {
      chapter: D, sub: "Penyajian data", type: "MULTIPLE_SELECT", level: "APLIKASI", difficulty: "MEDIUM",
      prompt: `Piktogram berikut menunjukkan hasil panen jagung empat petani.\n\n${PIKTOGRAM}\n\nPilih **semua** petani yang hasil panennya **lebih dari** 45 karung.`,
      options: ["Pak Ali", "Pak Budi", "Pak Candra", "Pak Dedi"],
      key: [1, 3],
      explanation: "Pak Ali 4 × 10 = 40, Pak Budi 6 × 10 = 60, Pak Candra 3 × 10 = 30, Pak Dedi 5 × 10 = 50 karung. Yang lebih dari 45 karung adalah Pak Budi dan Pak Dedi.",
    },
    {
      chapter: D, sub: "Membaca dan menggunakan data", type: "CATEGORY", level: "PENALARAN", difficulty: "HARD",
      prompt: `${DIAGRAM}\n\nTentukan **Benar** atau **Salah** untuk setiap pernyataan berikut.`,
      figure: { name: "diagramEkskul", alt: DIAGRAM_ALT },
      options: [
        "Siswa yang memilih Futsal lebih dari dua kali siswa yang memilih Melukis.",
        "Jumlah siswa yang memilih Pramuka dan Tari sama dengan siswa yang memilih Futsal ditambah 5.",
        "Banyak siswa yang memilih semua kegiatan itu ada 48 orang.",
        "Siswa yang memilih Paduan Suara adalah 18% dari seluruh siswa pada diagram.",
      ],
      key: [true, true, false, true],
      explanation: "Futsal 15 dan dua kali Melukis 2 × 6 = 12, jadi 15 > 12. Pramuka + Tari = 12 + 8 = 20 dan Futsal + 5 = 20. Seluruhnya 12 + 8 + 15 + 6 + 9 = 50, bukan 48. Paduan Suara 9/50 = 18/100 = 18%.",
    },
  ],
};
