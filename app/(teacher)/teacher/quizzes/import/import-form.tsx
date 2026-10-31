"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FormField, FormMessage } from "@/components/form-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IMPORT_BODY_MAX, IMPORT_FILE_MAX, validateImportRows, type ImportPreview } from "@/lib/question-import-format";

const SELECT = "min-h-12 w-full min-w-0 rounded-xl border-2 border-input bg-card px-3 text-base focus-visible:ring-[3px] focus-visible:ring-ring";
type Subject = { id: string; name: string; chapters: { id: string; title: string }[] };

export function QuestionImportForm({ subjects, classes }: { subjects: Subject[]; classes: { id: string; name: string }[] }) {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [kind, setKind] = useState("REGULAR");
  const [duration, setDuration] = useState("30");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [filename, setFilename] = useState("");
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [retryBody, setRetryBody] = useState<string | null>(null);
  const sequence = useRef(0);
  const importKey = useRef("");
  const fileInput = useRef<HTMLInputElement>(null);
  const parsed = preview ? validateImportRows(preview.rows, chapterId || "preview") : null;
  const issues = [...(preview?.issues ?? []), ...(parsed?.issues ?? [])];
  const ready = !!preview?.rows.length && issues.length === 0;
  const locked = saving || retryBody !== null;

  function clearFile() {
    sequence.current++;
    setPreview(null); setReading(false); setFilename(""); setMessage("");
    importKey.current = "";
    if (fileInput.current) fileInput.current.value = "";
  }
  async function readFile(file: File | undefined) {
    const current = ++sequence.current;
    setPreview(null); setMessage(""); setFilename(file?.name ?? ""); setReading(false);
    importKey.current = crypto.randomUUID();
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name) || file.size > IMPORT_FILE_MAX || file.size === 0) {
      setMessage("Pilih file .xlsx berisi template Aksara, maksimal 5 MB."); return;
    }
    setReading(true);
    try {
      const [{ default: ExcelJS }, { parseQuestionWorkbook }] = await Promise.all([import("exceljs"), import("@/lib/question-import-workbook")]);
      const book = new ExcelJS.Workbook();
      await book.xlsx.load(await file.arrayBuffer());
      if (sequence.current === current) setPreview(parseQuestionWorkbook(book));
    } catch {
      if (sequence.current === current) setMessage("File Excel tidak dapat dibaca. Pastikan file .xlsx tidak rusak atau dikunci sandi, lalu pilih ulang.");
    } finally { if (sequence.current === current) setReading(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || reading || (!ready && !retryBody)) return;
    const form = new FormData(event.currentTarget);
    const body = retryBody ?? JSON.stringify({
      importKey: importKey.current, title: form.get("title"), subjectId, chapterId, kind,
      durationMinutes: duration, classIds: form.getAll("classIds"), rows: preview!.rows,
    });
    if (new TextEncoder().encode(body).byteLength > IMPORT_BODY_MAX) {
      setMessage("Isi teks terlalu besar. Kurangi jumlah atau panjang soal, lalu impor sebagai ulangan terpisah."); return;
    }
    setSaving(true); setRetryBody(body); setMessage("");
    try {
      const response = await fetch("/api/question-import", { method: "POST", headers: { "Content-Type": "application/json" }, body });
      if (response.redirected || response.headers.get("content-type")?.includes("text/html")) {
        setMessage("Sesi berakhir atau akses ditolak. Masuk kembali, lalu coba simpan lagi."); return;
      }
      const result = await response.json();
      if (!response.ok || !result.ok) {
        if (response.status < 500) setRetryBody(null);
        setMessage(result.message ?? "Belum dapat menyimpan. Coba simpan lagi dengan data yang sama."); return;
      }
      router.push(`/teacher/quizzes/${result.id}`);
    } catch {
      setMessage("Koneksi terputus. Coba simpan lagi; pengiriman ulang ini tidak membuat ulangan ganda.");
    } finally { setSaving(false); }
  }
  const chapters = subjects.find(s => s.id === subjectId)?.chapters ?? [];
  return (
    <form onSubmit={submit} className="flex min-w-0 flex-col gap-6">
      <Card>
        <CardHeader><CardTitle>1. Unduh dan isi template</CardTitle><CardDescription>Pilih lembar sesuai tipe soal. Ada petunjuk dan contoh untuk keenam tipe. Maksimal 100 soal; satu mata pelajaran dan satu bab.</CardDescription></CardHeader>
        <CardContent className="flex flex-col items-start gap-3">
          <a href="/api/question-import/template" download className={buttonVariants({ variant: "outline" })}>Unduh template Excel</a>
          <p className="text-sm text-muted-foreground">Isi baris 2 dan seterusnya. Lembar Contoh tidak diimpor. Gambar ditambahkan di editor setelah impor.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>2. Tentukan ulangan</CardTitle><CardDescription>Soal disimpan sebagai draf. Jadwal dan pengaturan lanjutan dapat diatur setelah impor.</CardDescription></CardHeader>
        <CardContent>
          <fieldset disabled={locked} className="grid min-w-0 gap-4 md:grid-cols-2">
            <FormField name="title" label="Judul ulangan" required maxLength={150} autoComplete="off" />
            <div className="flex min-w-0 flex-col gap-2"><Label htmlFor="import-kind">Jenis ulangan</Label><select id="import-kind" className={SELECT} value={kind} onChange={e => { setKind(e.target.value); setDuration(e.target.value === "TRYOUT_TKA" ? "75" : "30"); }}><option value="REGULAR">Ulangan biasa</option><option value="TRYOUT_TKA">Tryout TKA</option></select></div>
            <div className="flex min-w-0 flex-col gap-2"><Label htmlFor="import-subject">Mata pelajaran</Label><select id="import-subject" className={SELECT} required value={subjectId} onChange={e => { setSubjectId(e.target.value); setChapterId(""); }}><option value="">Pilih mata pelajaran</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div className="flex min-w-0 flex-col gap-2"><Label htmlFor="import-chapter">Bab</Label><select id="import-chapter" className={SELECT} required disabled={!subjectId || locked} value={chapterId} onChange={e => setChapterId(e.target.value)}><option value="">Pilih bab</option>{chapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
            <FormField name="durationMinutes" label="Durasi (menit)" type="number" min={1} max={300} required value={duration} onChange={e => setDuration(e.target.value)} />
            <fieldset className="flex min-w-0 flex-col gap-2"><legend className="font-medium">Kelas tujuan</legend>{classes.map(c => <label key={c.id} className="flex min-h-11 items-center gap-3"><input className="size-6 shrink-0" type="checkbox" name="classIds" value={c.id} /><span className="break-words">{c.name}</span></label>)}{!classes.length && <p>Belum ada kelas aktif. Buat atau aktifkan kelas terlebih dahulu.</p>}</fieldset>
          </fieldset>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>3. Unggah dan periksa soal</CardTitle><CardDescription>File .xlsx maksimal 5 MB dibaca di perangkat ini. Semua baris harus benar sebelum disimpan.</CardDescription></CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-4">
          <div className="flex min-w-0 flex-col gap-2"><Label htmlFor="question-excel">File Excel soal</Label><Input ref={fileInput} id="question-excel" type="file" accept=".xlsx" disabled={locked} onChange={e => void readFile(e.target.files?.[0])} /></div>
          {reading && <p role="status">Membaca berkas…</p>}
          {!!filename && !locked && <Button type="button" variant="outline" className="self-start" onClick={clearFile}>Batalkan berkas</Button>}
          {preview && <p role="status">{preview.rows.length} soal ditemukan di {filename}. {ready ? "Siap diperiksa dan disimpan." : "Perbaiki kesalahan di Excel, lalu pilih ulang berkas."}</p>}
          {issues.length > 0 && <Alert variant="destructive"><AlertTitle>Perlu diperbaiki ({issues.length})</AlertTitle><AlertDescription><ul className="flex list-disc flex-col gap-1 pl-5">{issues.slice(0, 30).map((i, n) => <li key={n} className="break-words">{i.sheet}{i.row ? `, baris ${i.row}` : ""}, {i.column}: {i.message}</li>)}</ul>{issues.length > 30 && <p>Menampilkan 30 kesalahan pertama.</p>}</AlertDescription></Alert>}
          {preview && <ol aria-label="Pratinjau soal" className="flex min-w-0 flex-col gap-3">{[...preview.rows].sort((a, b) => Number(a.cells.Urutan) - Number(b.cells.Urutan)).map((row, n) => <li key={`${row.sheet}:${row.row}:${n}`} className="min-w-0 rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">Urutan {row.cells.Urutan || "—"} · {row.sheet} · Baris {row.row} · {row.cells.Bobot || "1"} poin · {row.cells.Kesulitan || "Sedang"}</p>
            <p className="mt-2 break-words whitespace-pre-wrap font-medium">{row.cells.Soal || "Teks soal belum diisi"}</p>
            <details><summary className="flex min-h-11 cursor-pointer items-center text-primary-strong underline focus-visible:ring-[3px] focus-visible:ring-ring">Periksa opsi, kunci, dan pembahasan</summary><dl className="flex min-w-0 flex-col gap-2">{Object.entries(row.cells).filter(([key]) => !["Urutan", "Soal", "Bobot", "Kesulitan"].includes(key)).map(([key, value]) => <div key={key}><dt className="font-medium">{key}</dt><dd className="break-words whitespace-pre-wrap">{value || "—"}</dd></div>)}</dl></details>
          </li>)}</ol>}
        </CardContent>
      </Card>
      <FormMessage message={message} />
      {retryBody && !saving && <p role="note">Data dikunci untuk pengiriman ulang yang sama. Periksa daftar ulangan sebelum memulai impor baru bila status simpan belum diketahui.</p>}
      <p className="text-sm text-muted-foreground">Dengan menyimpan, soal masuk ke bank soal dan draf ulangan. Periksa serta aktifkan setiap soal sebelum menerbitkan kepada siswa.</p>
      <Button type="submit" disabled={saving || reading || (!ready && !retryBody)} className="h-auto min-h-12 self-start whitespace-normal py-3">{saving ? "Menyimpan…" : retryBody ? "Coba simpan lagi" : "Simpan soal dan draf ulangan"}</Button>
    </form>
  );
}
