// Original practice items and passages following the TKA SD Bahasa Indonesia kisi-kisi (docs/tka-sd-kisi-kisi.md).
// The passages are written for this seed, not quoted from any book. Not official questions.
import { withText, type TkaItem, type TkaSubject } from "./types";

const T = "Pemahaman Tekstual";
const I = "Pemahaman Inferensial";
const E = "Evaluasi dan Apresiasi";
const SESUAI: [string, string] = ["Sesuai", "Tidak Sesuai"];

const MANGROVE = `Hutan mangrove adalah hutan yang tumbuh di pantai berlumpur, di tempat air laut dan air sungai bertemu. Pohon mangrove memiliki akar yang mencuat dari lumpur. Akar itu membantu pohon bernapas dan tetap berdiri kokoh walaupun diterjang ombak setiap hari.

Mangrove memiliki banyak manfaat. Akarnya yang rapat menahan ombak sehingga pantai tidak mudah terkikis. Pengikisan pantai oleh air laut ini disebut abrasi. Selain itu, akar mangrove menjadi tempat tinggal dan tempat bertelur bagi ikan, kepiting, dan udang.

Sayangnya, banyak hutan mangrove ditebang untuk dijadikan tambak dan permukiman. Karena itu, beberapa sekolah di daerah pesisir mengajak siswanya menanam bibit mangrove. Kegiatan sederhana ini membantu menjaga pantai tetap aman bagi warga.`;

const LAYANGAN = `Raka sudah tiga hari membuat layang-layang dari bambu dan kertas minyak. Ia ingin ikut lomba layang-layang di lapangan desa hari Minggu.

Pagi itu angin bertiup kencang. Layang-layang Raka naik tinggi, paling tinggi di antara yang lain. Hatinya berbunga-bunga. Namun, tiba-tiba benangnya putus. Layang-layang itu melayang jauh dan tersangkut di pohon kelapa.

Raka terdiam. Matanya berkaca-kaca. Teman-temannya mendekat. "Sudahlah, Raka. Layanganmu tadi paling tinggi," kata Bayu sambil menepuk bahunya.

Raka menarik napas panjang, lalu tersenyum. "Tidak apa-apa. Besok aku buat lagi dengan benang yang lebih kuat," katanya. Sore itu, ia malah membantu Bayu memperbaiki layang-layang Bayu yang sobek.`;

const KOMPOS = `Kompos adalah pupuk alami yang dibuat dari sisa makhluk hidup. Kita dapat membuatnya sendiri di rumah dari sampah dapur.

Bahan dan alat: sisa sayuran dan kulit buah, daun kering, tanah, ember bekas yang diberi lubang kecil di bagian bawah, dan air secukupnya.

Langkah-langkah:

1. Cacah sisa sayuran dan kulit buah menjadi potongan kecil agar cepat membusuk.
2. Masukkan selapis tanah ke dasar ember.
3. Tambahkan lapisan sampah dapur, lalu tutup dengan daun kering.
4. Percikkan sedikit air agar campuran lembap, tetapi tidak becek.
5. Tutup ember dan aduk campuran seminggu sekali.

Setelah sekitar satu bulan, sampah berubah menjadi kompos yang berwarna cokelat kehitaman dan berbau seperti tanah. Jangan memasukkan daging, tulang, atau plastik karena bahan itu tidak dapat membusuk dengan baik dan dapat mengundang lalat.`;

const FABEL = `Di tepi sebuah danau, hiduplah seekor Kura-Kura yang pendiam dan seekor Burung Pipit yang suka membanggakan diri.

"Lihat aku! Aku bisa terbang ke mana saja dalam sekejap. Kau berjalan saja lambat sekali," ejek Pipit sambil tertawa terpingkal-pingkal.

Kura-Kura hanya tersenyum. "Setiap makhluk punya kelebihan masing-masing," jawabnya pelan.

Suatu siang, hujan deras turun disertai angin kencang. Sarang Pipit jatuh ke air. Pipit kebasahan dan kedinginan. Ia tidak bisa terbang karena sayapnya basah.

Kura-Kura berenang mendekat. "Naiklah ke punggungku," katanya. Dengan sabar, Kura-Kura membawa Pipit ke tepi danau yang aman.

Sejak hari itu, Pipit tidak pernah lagi mengejek teman-temannya.`;

const LOMBA = `Dalam rangka memperingati Hari Lingkungan Hidup, SD Harapan Bangsa mengadakan Lomba Kebersihan Kelas. Lomba berlangsung pada 2–6 Juni. Setiap hari, tim juri yang terdiri atas tiga guru dan dua anggota OSIS memeriksa semua kelas pada pukul 09.30.

Hal yang dinilai adalah kebersihan lantai dan jendela, kerapian meja dan rak buku, tempat sampah yang terpisah antara sampah organik dan anorganik, serta adanya tanaman hias di dalam kelas.

Pemenang akan diumumkan pada upacara hari Senin, 9 Juni. Kelas terbaik mendapat piala bergilir dan bibit pohon untuk ditanam di halaman sekolah. Kepala sekolah berharap kebiasaan menjaga kebersihan tetap dilakukan meskipun lomba sudah selesai.`;

// Two trailing spaces keep each line of the poem on its own line in Markdown.
const PUISI = `Mentari mengintip dari balik bukit,
embun berkilau di ujung daun padi.
Ayam jantan berkokok bersahutan,
membangunkan desa yang masih sunyi.

Ibu menanak nasi di dapur,
asap tipis menari di atas genting.
Ayah memanggul cangkul ke sawah,
langkahnya ringan, hatinya hening.

Aku berlari menyusuri pematang,
menghirup udara sejuk dan bersih.
Desaku, tempat hatiku pulang,
akan selalu kujaga dan kukasihi.`;

const m = (q: string) => withText("Hutan Mangrove, Penjaga Pantai", MANGROVE, q);
const l = (q: string) => withText("Layang-Layang Raka", LAYANGAN, q);
const k = (q: string) => withText("Membuat Kompos dari Sampah Dapur", KOMPOS, q);
const f = (q: string) => withText("Kura-Kura dan Burung Pipit", FABEL, q);
const b = (q: string) => withText("Lomba Kebersihan Kelas", LOMBA, q);
const p = (q: string) => withText("Pagi di Desaku", PUISI, q);

const items: TkaItem[] = [
  // Teks 1: Hutan Mangrove (informasi)
  {
    chapter: T, sub: "Ketepatan kosakata", type: "SINGLE_CHOICE", difficulty: "EASY",
    prompt: m("Makna kata **abrasi** dalam teks tersebut adalah ...."),
    options: ["pengikisan pantai oleh air laut", "penanaman bibit di pantai", "tempat bertelur ikan dan udang", "lumpur di tepi sungai"],
    key: 0,
    explanation: "Paragraf kedua menjelaskan langsung: \"Pengikisan pantai oleh air laut ini disebut abrasi.\"",
  },
  {
    chapter: I, sub: "Ide pokok, amanat, tokoh, dan nilai", type: "SINGLE_CHOICE", difficulty: "EASY",
    prompt: m("Ide pokok paragraf kedua adalah ...."),
    options: ["Mangrove memiliki banyak manfaat.", "Akar mangrove mencuat dari lumpur.", "Banyak mangrove ditebang untuk tambak.", "Siswa menanam bibit mangrove."],
    key: 0,
    explanation: "Kalimat pertama paragraf kedua adalah kalimat utama, dan kalimat-kalimat sesudahnya menjelaskan manfaat-manfaat mangrove.",
  },
  {
    chapter: I, sub: "Informasi tersurat", type: "MULTIPLE_SELECT", difficulty: "MEDIUM",
    prompt: m("Pilih **semua** manfaat mangrove yang disebutkan dalam teks."),
    options: [
      "Menahan ombak agar pantai tidak mudah terkikis",
      "Menjadi tempat tinggal ikan, kepiting, dan udang",
      "Menghasilkan buah yang dapat dijual",
      "Menjadi tempat bertelur hewan laut",
      "Menjadi bahan bangunan rumah",
    ],
    key: [0, 1, 3],
    explanation: "Teks hanya menyebut tiga hal: menahan ombak, tempat tinggal, dan tempat bertelur ikan, kepiting, dan udang. Buah dan bahan bangunan tidak disebutkan.",
  },
  {
    chapter: T, sub: "Menyusun ulang informasi (ikhtisar/bagan)", type: "SINGLE_CHOICE", difficulty: "MEDIUM",
    prompt: m(
      "Andi membuat bagan dari paragraf kedua.\n\n**Manfaat mangrove** → (1) ... → (2) Tempat tinggal dan tempat bertelur ikan, kepiting, dan udang\n\nIsi yang tepat untuk bagian (1) adalah ....",
    ),
    options: [
      "Menahan ombak sehingga pantai tidak mudah terkikis",
      "Tumbuh di pantai berlumpur",
      "Ditebang untuk dijadikan tambak",
      "Ditanam oleh siswa sekolah",
    ],
    key: 0,
    explanation: "Bagan berisi manfaat mangrove dari paragraf kedua. Manfaat pertama adalah menahan ombak sehingga pantai tidak mudah terkikis.",
  },
  {
    chapter: E, sub: "Kesesuaian unsur dan informasi", type: "CATEGORY", labels: SESUAI, difficulty: "MEDIUM",
    prompt: m("Tentukan apakah setiap pernyataan berikut **sesuai** atau **tidak sesuai** dengan isi teks."),
    options: [
      "Mangrove tumbuh di tempat air laut dan air sungai bertemu.",
      "Akar mangrove membuat pohon mudah tumbang diterjang ombak.",
      "Hutan mangrove berkurang karena ditebang untuk tambak dan permukiman.",
      "Menanam bibit mangrove hanya boleh dilakukan oleh orang dewasa.",
    ],
    key: [true, false, true, false],
    explanation: "Pernyataan 1 dan 3 ada dalam teks. Teks justru menyebut akar membuat pohon berdiri kokoh, dan siswa sekolah pun ikut menanam bibit mangrove.",
  },

  // Teks 2: Layang-Layang Raka (fiksi)
  {
    chapter: I, sub: "Ide pokok, amanat, tokoh, dan nilai", type: "SINGLE_CHOICE", difficulty: "EASY",
    prompt: l("Watak Raka yang paling tepat berdasarkan cerita tersebut adalah ...."),
    options: ["tidak mudah putus asa dan suka menolong", "mudah marah dan iri", "sombong karena layangannya paling tinggi", "malas dan suka mengeluh"],
    key: 0,
    explanation: "Raka bertekad membuat layang-layang lagi setelah benangnya putus, lalu membantu Bayu memperbaiki layang-layangnya.",
  },
  {
    chapter: T, sub: "Makna denotatif dan konotatif", type: "SINGLE_CHOICE", difficulty: "EASY",
    prompt: l("Kata **berkaca-kaca** pada kalimat *Matanya berkaca-kaca* bermakna ...."),
    options: ["hampir menangis", "memakai kacamata", "bersinar karena senang", "melihat ke cermin"],
    key: 0,
    explanation: "\"Berkaca-kaca\" di sini bermakna kiasan: mata yang basah karena hampir menangis. Raka sedih karena layang-layangnya hilang.",
  },
  {
    chapter: I, sub: "Ide pokok, amanat, tokoh, dan nilai", type: "SINGLE_CHOICE", difficulty: "EASY",
    prompt: l("Amanat yang dapat diambil dari cerita tersebut adalah ...."),
    options: [
      "Jangan mudah menyerah ketika mengalami kegagalan.",
      "Layang-layang harus dibuat dari kertas minyak.",
      "Lomba layang-layang sebaiknya tidak diikuti.",
      "Kita harus selalu menang dalam setiap lomba.",
    ],
    key: 0,
    explanation: "Raka gagal karena benangnya putus, tetapi ia tidak menyerah dan berencana membuat layang-layang yang lebih kuat.",
  },
  {
    chapter: E, sub: "Relevansi dengan kehidupan sehari-hari", type: "SINGLE_CHOICE", difficulty: "EASY",
    prompt: l("Jika kamu menjadi teman Raka saat layang-layangnya putus, sikap yang paling sesuai dengan nilai dalam cerita adalah ...."),
    options: [
      "menghibur Raka seperti yang dilakukan Bayu",
      "menertawakan Raka karena benangnya putus",
      "diam saja lalu pulang ke rumah",
      "mengambil layang-layang Raka tanpa izin",
    ],
    key: 0,
    explanation: "Bayu menghibur Raka dengan kata-kata baik dan menepuk bahunya. Sikap peduli seperti itu yang patut dicontoh.",
  },
  {
    chapter: I, sub: "Informasi tersurat", type: "CATEGORY", difficulty: "MEDIUM",
    prompt: l("Tentukan **Benar** atau **Salah** untuk setiap pernyataan berikut berdasarkan cerita."),
    options: [
      "Raka membuat layang-layang selama tiga hari.",
      "Layang-layang Raka tersangkut di pohon mangga.",
      "Bayu menghibur Raka sambil menepuk bahunya.",
      "Pada sore hari, Raka membantu memperbaiki layang-layang Bayu.",
    ],
    key: [true, false, true, true],
    explanation: "Layang-layang Raka tersangkut di pohon kelapa, bukan pohon mangga. Tiga pernyataan lainnya tertulis dalam cerita.",
  },

  // Teks 3: Kompos (prosedur)
  {
    chapter: T, sub: "Ketepatan kosakata", type: "SINGLE_CHOICE", difficulty: "EASY",
    prompt: k("Kata **cacah** pada langkah pertama memiliki arti yang sama dengan ...."),
    options: ["potong kecil-kecil", "cuci bersih", "keringkan", "kumpulkan"],
    key: 0,
    explanation: "Langkah pertama menjelaskan bahwa sisa sayuran dan kulit buah dicacah \"menjadi potongan kecil\", artinya dipotong kecil-kecil.",
  },
  {
    chapter: I, sub: "Informasi tersurat", type: "MULTIPLE_SELECT", difficulty: "EASY",
    prompt: k("Pilih **semua** bahan yang **boleh** dimasukkan ke dalam ember kompos menurut teks."),
    options: ["kulit buah", "daun kering", "tulang ayam", "sisa sayuran", "kantong plastik"],
    key: [0, 1, 3],
    explanation: "Bahan kompos adalah sisa sayuran, kulit buah, daun kering, dan tanah. Teks melarang daging, tulang, dan plastik.",
  },
  {
    chapter: T, sub: "Menyusun ulang informasi (ikhtisar/bagan)", type: "SINGLE_CHOICE", difficulty: "MEDIUM",
    prompt: k("Urutan langkah yang tepat **setelah** sampah dapur dicacah adalah ...."),
    options: [
      "memasukkan tanah – menambahkan sampah dan daun kering – memercikkan air – menutup dan mengaduk",
      "memercikkan air – memasukkan tanah – menutup ember – menambahkan sampah",
      "menambahkan sampah – memasukkan tanah – mengaduk – memercikkan air",
      "menutup ember – memasukkan tanah – memercikkan air – menambahkan daun kering",
    ],
    key: 0,
    explanation: "Sesuai langkah 2 sampai 5: tanah di dasar ember, lalu sampah dan daun kering, lalu dipercik air, lalu ditutup dan diaduk seminggu sekali.",
  },
  {
    chapter: I, sub: "Isi informasi dan karakteristik objek", type: "SINGLE_CHOICE", difficulty: "EASY",
    prompt: k("Tujuan penulis menulis teks tersebut adalah ...."),
    options: [
      "menjelaskan cara membuat kompos dari sampah dapur",
      "menceritakan pengalaman berkebun",
      "mengajak pembaca membeli pupuk",
      "menggambarkan keindahan kebun",
    ],
    key: 0,
    explanation: "Teks berisi bahan, alat, dan langkah-langkah. Teks seperti ini disebut teks prosedur, yang tujuannya menjelaskan cara membuat sesuatu.",
  },
  {
    chapter: E, sub: "Kesesuaian unsur dan informasi", type: "CATEGORY", labels: ["Fakta", "Opini"], difficulty: "MEDIUM",
    prompt: k("Tentukan apakah setiap kalimat berikut merupakan **fakta** atau **opini**."),
    options: [
      "Kompos dibuat dari sisa makhluk hidup.",
      "Membuat kompos adalah kegiatan paling menyenangkan di akhir pekan.",
      "Kompos yang sudah jadi berwarna cokelat kehitaman.",
      "Semua keluarga pasti senang jika membuat kompos sendiri.",
    ],
    key: [true, false, true, false],
    explanation: "Fakta dapat dibuktikan kebenarannya, seperti bahan dan warna kompos. Opini berisi pendapat atau perasaan seseorang, seperti \"paling menyenangkan\" dan \"pasti senang\".",
  },

  // Teks 4: Fabel
  {
    chapter: I, sub: "Ide pokok, amanat, tokoh, dan nilai", type: "SINGLE_CHOICE", difficulty: "EASY",
    prompt: f("Tokoh yang suka membanggakan diri dalam cerita tersebut adalah ...."),
    options: ["Burung Pipit", "Kura-Kura", "ikan di danau", "Kura-Kura dan Burung Pipit"],
    key: 0,
    explanation: "Kalimat pertama menyebut Burung Pipit \"suka membanggakan diri\", dan ia mengejek Kura-Kura yang berjalan lambat.",
  },
  {
    chapter: T, sub: "Makna denotatif dan konotatif", type: "SINGLE_CHOICE", difficulty: "EASY",
    prompt: f("Kata **terpingkal-pingkal** pada kalimat *ejek Pipit sambil tertawa terpingkal-pingkal* bermakna ...."),
    options: ["tertawa keras sekali", "menangis tersedu-sedu", "terjatuh berkali-kali", "berbicara dengan pelan"],
    key: 0,
    explanation: "\"Tertawa terpingkal-pingkal\" berarti tertawa sangat keras sampai badan terguncang.",
  },
  {
    chapter: I, sub: "Ide pokok, amanat, tokoh, dan nilai", type: "MULTIPLE_SELECT", difficulty: "MEDIUM",
    prompt: f("Pilih **semua** sifat Kura-Kura yang tergambar dalam cerita."),
    options: ["sabar", "suka menolong", "sombong", "tidak membalas ejekan", "pemalas"],
    key: [0, 1, 3],
    explanation: "Kura-Kura hanya tersenyum saat diejek, lalu dengan sabar menolong Pipit. Tidak ada bagian cerita yang menunjukkan Kura-Kura sombong atau malas.",
  },
  {
    chapter: E, sub: "Relevansi dengan kehidupan sehari-hari", type: "SINGLE_CHOICE", difficulty: "MEDIUM",
    prompt: f("Peristiwa dalam kehidupan sehari-hari yang paling mirip dengan isi fabel tersebut adalah ...."),
    options: [
      "Siswa yang sering diejek tetap mau menolong temannya yang mengejek saat temannya kesulitan.",
      "Dua siswa berlomba lari di lapangan sekolah.",
      "Seorang anak memelihara kura-kura di rumah.",
      "Siswa bermain di tepi danau saat hujan.",
    ],
    key: 0,
    explanation: "Inti fabel adalah Kura-Kura yang diejek tetapi tetap menolong Pipit saat Pipit dalam kesulitan.",
  },
  {
    chapter: I, sub: "Ide pokok, amanat, tokoh, dan nilai", type: "SINGLE_CHOICE", difficulty: "EASY",
    prompt: f("Pesan moral fabel tersebut adalah ...."),
    options: [
      "Jangan meremehkan orang lain karena setiap orang memiliki kelebihan.",
      "Burung harus selalu membuat sarang di tempat yang tinggi.",
      "Kita tidak boleh bermain di tepi danau.",
      "Hujan deras selalu membawa bencana.",
    ],
    key: 0,
    explanation: "Kura-Kura berkata, \"Setiap makhluk punya kelebihan masing-masing.\" Pipit yang meremehkan Kura-Kura akhirnya ditolong olehnya.",
  },

  // Teks 5: Lomba Kebersihan Kelas (informasi)
  {
    chapter: I, sub: "Informasi tersurat", type: "SINGLE_CHOICE", difficulty: "EASY",
    prompt: b("Juri memeriksa kelas setiap hari pada pukul ...."),
    options: ["09.30", "07.00", "09.00", "10.30"],
    key: 0,
    explanation: "Paragraf pertama menyebut juri \"memeriksa semua kelas pada pukul 09.30\".",
  },
  {
    chapter: T, sub: "Ketepatan kosakata", type: "SINGLE_CHOICE", difficulty: "EASY",
    prompt: b("Kata **juri** dalam teks tersebut paling tepat diartikan ...."),
    options: [
      "orang yang menilai dan menentukan pemenang lomba",
      "peserta yang mengikuti lomba",
      "panitia yang menyiapkan hadiah",
      "siswa yang membersihkan kelas",
    ],
    key: 0,
    explanation: "Juri bertugas memeriksa dan menilai kelas, lalu menentukan pemenang lomba.",
  },
  {
    chapter: E, sub: "Relevansi dengan kehidupan sehari-hari", type: "MULTIPLE_SELECT", difficulty: "MEDIUM",
    prompt: b("Pilih **semua** kebiasaan yang sesuai dengan harapan kepala sekolah dalam teks."),
    options: [
      "Membuang sampah organik dan anorganik di tempat yang terpisah setiap hari",
      "Membersihkan kelas hanya saat lomba berlangsung",
      "Merawat tanaman hias di kelas setelah lomba selesai",
      "Merapikan meja dan rak buku sebelum pulang sekolah",
      "Menyimpan sampah di laci meja",
    ],
    key: [0, 2, 3],
    explanation: "Kepala sekolah berharap kebiasaan menjaga kebersihan tetap dilakukan setelah lomba selesai. Membersihkan hanya saat lomba dan menyimpan sampah di laci tidak sesuai harapan itu.",
  },
  {
    chapter: I, sub: "Informasi tersurat", type: "CATEGORY", difficulty: "MEDIUM",
    prompt: b("Tentukan **Benar** atau **Salah** untuk setiap pernyataan berikut berdasarkan teks."),
    options: [
      "Juri lomba berjumlah lima orang.",
      "Lomba berlangsung selama tujuh hari.",
      "Kelas terbaik mendapat piala bergilir dan bibit pohon.",
      "Pemenang diumumkan pada hari terakhir lomba.",
    ],
    key: [true, false, true, false],
    explanation: "Juri terdiri atas tiga guru dan dua anggota OSIS, jadi lima orang. Lomba berlangsung 2–6 Juni, yaitu lima hari. Pemenang diumumkan 9 Juni, setelah lomba selesai.",
  },
  {
    chapter: T, sub: "Menyusun ulang informasi (ikhtisar/bagan)", type: "SINGLE_CHOICE", difficulty: "MEDIUM",
    prompt: b("Ikhtisar yang paling tepat untuk teks tersebut adalah ...."),
    options: [
      "SD Harapan Bangsa mengadakan lomba kebersihan kelas pada 2–6 Juni untuk memperingati Hari Lingkungan Hidup. Juri menilai kebersihan dan kerapian kelas setiap hari.",
      "Kepala sekolah memberikan piala bergilir kepada semua kelas yang bersih.",
      "OSIS SD Harapan Bangsa menanam bibit pohon di halaman sekolah pada 9 Juni.",
      "Siswa SD Harapan Bangsa harus membawa tanaman hias setiap hari Senin.",
    ],
    key: 0,
    explanation: "Ikhtisar memuat isi penting teks secara singkat: lomba apa, kapan, dalam rangka apa, dan apa yang dinilai. Pilihan lain hanya mengambil sebagian kecil atau tidak sesuai teks.",
  },

  // Teks 6: Puisi
  {
    chapter: T, sub: "Makna denotatif dan konotatif", type: "SINGLE_CHOICE", difficulty: "MEDIUM",
    prompt: p("Kata yang bermakna **kiasan** (konotatif) dalam puisi tersebut terdapat pada larik ...."),
    options: ["asap tipis **menari** di atas genting", "Ibu menanak **nasi** di dapur", "Ayah memanggul **cangkul** ke sawah", "embun berkilau di ujung **daun** padi"],
    key: 0,
    explanation: "Asap tidak benar-benar menari. Kata \"menari\" dipakai sebagai kiasan untuk asap yang bergerak meliuk-liuk. Kata nasi, cangkul, dan daun bermakna sebenarnya.",
  },
  {
    chapter: I, sub: "Ide pokok, amanat, tokoh, dan nilai", type: "SINGLE_CHOICE", difficulty: "EASY",
    prompt: p("Tema puisi tersebut adalah ...."),
    options: ["keindahan suasana pagi di desa", "kesibukan kota pada malam hari", "perjuangan para pahlawan", "persahabatan di sekolah"],
    key: 0,
    explanation: "Semua bait menggambarkan pagi di desa: mentari, embun, ayam berkokok, ibu memasak, ayah ke sawah, dan udara yang sejuk.",
  },
  {
    chapter: E, sub: "Respons emosional terhadap teks fiksi", type: "SINGLE_CHOICE", difficulty: "EASY",
    prompt: p("Perasaan yang paling mungkin muncul pada pembaca setelah membaca puisi tersebut adalah ...."),
    options: ["tenang dan rindu pada suasana desa", "takut dan cemas", "marah dan kecewa", "bosan dan kesal"],
    key: 0,
    explanation: "Puisi menggambarkan suasana yang damai, sejuk, dan penuh kasih sayang, sehingga pembaca cenderung merasa tenang.",
  },
  {
    chapter: E, sub: "Kesesuaian unsur dan informasi", type: "CATEGORY", labels: SESUAI, difficulty: "MEDIUM",
    prompt: p("Tentukan apakah setiap pernyataan berikut **sesuai** atau **tidak sesuai** dengan gambaran dalam puisi."),
    options: [
      "Desa digambarkan masih sunyi sebelum dibangunkan kokok ayam.",
      "Ayah pergi ke sawah dengan perasaan sedih.",
      "Udara di desa digambarkan sejuk dan bersih.",
      "Penulis puisi ingin pindah dari desanya.",
    ],
    key: [true, false, true, false],
    explanation: "Larik \"langkahnya ringan, hatinya hening\" menunjukkan Ayah tenang, bukan sedih. Bait terakhir menyebut desa sebagai \"tempat hatiku pulang\" yang akan dijaga, jadi penulis tidak ingin pindah.",
  },
  {
    chapter: E, sub: "Relevansi dengan kehidupan sehari-hari", type: "MULTIPLE_SELECT", difficulty: "MEDIUM",
    prompt: p("Pilih **semua** kegiatan sehari-hari yang sesuai dengan larik *akan selalu kujaga dan kukasihi*."),
    options: [
      "Ikut kerja bakti membersihkan saluran air di desa",
      "Membuang sampah ke sungai agar cepat hanyut",
      "Menanam pohon di sekitar rumah",
      "Merusak tanaman di pematang sawah",
      "Menjaga kebersihan lingkungan tempat tinggal",
    ],
    key: [0, 2, 4],
    explanation: "Menjaga dan mengasihi desa berarti merawat lingkungannya: kerja bakti, menanam pohon, dan menjaga kebersihan. Membuang sampah ke sungai dan merusak tanaman justru merusak desa.",
  },
];

export const BAHASA_INDONESIA: TkaSubject = {
  name: "TKA Bahasa Indonesia",
  quizTitle: "Tryout TKA 1 – Bahasa Indonesia",
  chapters: [
    { title: T, subs: ["Ketepatan kosakata", "Makna denotatif dan konotatif", "Menyusun ulang informasi (ikhtisar/bagan)"] },
    {
      title: I,
      subs: ["Informasi tersurat", "Ide pokok, amanat, tokoh, dan nilai", "Isi informasi dan karakteristik objek", "Makna ungkapan"],
    },
    { title: E, subs: ["Relevansi dengan kehidupan sehari-hari", "Kesesuaian unsur dan informasi", "Respons emosional terhadap teks fiksi"] },
  ],
  items,
};
