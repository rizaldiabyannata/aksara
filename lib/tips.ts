// True app-usage tips (D8). No claims about textbook content.
export const TIPS = [
  { text: "Tampilkan kode kelas di proyektor: buka kartu Ruang Kelas di dasbor, lalu tekan tombol kode kelasnya agar terbaca dari bangku belakang.", href: "/teacher/classes", cta: "Buka Kelas" },
  { text: "Aktifkan token ujian di halaman ulangan, lalu bagikan tokennya saat siswa sudah siap. Siswa yang belum diberi token tidak bisa mulai.", href: "/teacher/quizzes", cta: "Buka Ulangan" },
  { text: "Jawaban siswa tersimpan otomatis saat mereka mengerjakan. Kalau sinyal putus, jawaban dikirim lagi setelah tersambung, selama waktu ulangan belum habis.", href: "/teacher/quizzes", cta: "Lihat Ulangan" },
  { text: "Nilai belum terlihat siswa sampai Anda menekan Rilis Hasil. Rilis hanya bisa setelah semua uraian dinilai dan tidak ada siswa yang masih mengerjakan.", href: "/teacher/quizzes", cta: "Buka Ulangan" },
  { text: "Materi baru berstatus draf. Siswa hanya melihatnya setelah Anda memeriksa dan menerbitkannya.", href: "/teacher/materials", cta: "Buka Materi" },
  { text: "Soal yang sudah dipakai di ulangan terbit tidak ikut berubah ketika Anda mengedit soal di bank soal.", href: "/teacher/questions", cta: "Buka Bank Soal" },
  { text: "Tombol Bantuan Guru di halaman siswa menandai siswa di daftar pemantauan. Tekan Sudah dibantu setelah Anda menolongnya.", href: "/teacher/quizzes", cta: "Buka Ulangan" },
] as const;

// ISO 8601 week number (Monday-first; week 1 holds the year's first Thursday).
export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const jan1 = Date.UTC(t.getUTCFullYear(), 0, 1);
  return Math.ceil(((t.getTime() - jan1) / 86400000 + 1) / 7);
}

export function tipOfWeek(now: Date): (typeof TIPS)[number] {
  return TIPS[isoWeek(now) % TIPS.length];
}
