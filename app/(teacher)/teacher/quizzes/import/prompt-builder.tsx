"use client";

import { useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IMPORT_MAX, IMPORT_SHEETS } from "@/lib/question-import-format";
import { buildQuestionPrompt, PROMPT_DIFFICULTIES, PROMPT_LEVELS, TKA_SUBJECTS, type PromptComposition, type QuestionPromptConfig } from "@/lib/question-prompt";

const SELECT = "min-h-12 w-full min-w-0 rounded-xl border-2 border-input bg-card px-3 text-base focus-visible:ring-[3px] focus-visible:ring-ring";
const TEXTAREA = "min-h-28 w-full min-w-0 rounded-xl border-2 border-input bg-card p-3 text-base focus-visible:ring-[3px] focus-visible:ring-ring";
const initial: PromptComposition = { type: "SINGLE_CHOICE", difficulty: "Sedang", level: "Pemahaman", count: 10, points: 1 };

export function PromptBuilder({ subject, chapter, subchapters, kind, disabled }: Omit<QuestionPromptConfig, "composition" | "context"> & { disabled: boolean }) {
  const nextId = useRef(1);
  const [rows, setRows] = useState([{ id: 0, ...initial }]);
  const [context, setContext] = useState("");
  const [feedback, setFeedback] = useState<{ prompt: string; text: string; error: boolean } | null>(null);
  const result = buildQuestionPrompt({ subject, chapter, subchapters, kind, context, composition: rows });
  const prompt = result.ok ? result.prompt : "";
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const tka = kind === "TRYOUT_TKA";

  function update(id: number, change: Partial<PromptComposition>) {
    setRows(current => current.map(row => row.id === id ? { ...row, ...change } : row));
  }
  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setFeedback({ prompt, text: "Prompt disalin. Unggah template Excel bersama prompt ke ChatGPT.", error: false });
    } catch {
      setFeedback({ prompt, text: "Prompt belum dapat disalin. Pilih teks pada pratinjau dan salin manual, atau unduh prompt .txt.", error: true });
    }
  }
  function downloadPrompt() {
    const url = URL.createObjectURL(new Blob([prompt], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `prompt-${tka ? "tka" : "ulangan"}-aksara.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>2. Unduh template dan prompt ChatGPT</CardTitle>
        <CardDescription>Isi Excel sendiri atau gunakan prompt sesuai konteks di atas. Unggah template Excel dan prompt ke ChatGPT, lalu unduh hasil .xlsx untuk diperiksa di Aksara.</CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        <a href="/api/question-import/template" download className={buttonVariants({ variant: "outline", className: "min-h-11 self-start" })}>Unduh template Excel</a>
        <p className="text-sm text-muted-foreground">Template yang sama mendukung ulangan biasa dan TKA. Jangan ubah nama lembar atau header. Contoh tidak diimpor; gambar ditambahkan di editor setelah impor.</p>
        <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-4">
          <legend className="mb-3 font-medium">Komposisi prompt {tka ? "Tryout TKA" : "Ulangan biasa"}</legend>
          <p className="text-sm text-muted-foreground">{tka ? `TKA: ${TKA_SUBJECTS.join(" atau ")}; hanya PG, PG kompleks, dan Kategori.` : "Ulangan biasa: keenam tipe soal tersedia untuk semua mata pelajaran."} Kesulitan berbeda dari level berpikir: soal Sulit belum tentu HOTS. Pengaturan ini tidak wajib untuk impor manual.</p>
          {tka && subject === "TKA Bahasa Indonesia" && <p className="text-sm text-muted-foreground">Level berpikir mengarahkan tuntutan soal. Kompetensi mengikuti bab; kolom Level Kognitif pada Excel harus kosong.</p>}
          <div className="flex min-w-0 flex-col gap-4">
            {rows.map((row, index) => (
              <fieldset key={row.id} className="grid min-w-0 gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-3">
                <legend className="px-1 font-medium">Komposisi {index + 1}</legend>
                <div className="flex min-w-0 flex-col gap-2"><Label htmlFor={`type-${row.id}`}>Tipe soal {index + 1}</Label><select id={`type-${row.id}`} value={row.type} className={SELECT} onChange={e => update(row.id, { type: e.target.value as PromptComposition["type"] })}>{IMPORT_SHEETS.map(s => <option key={s.type} value={s.type}>{s.name}</option>)}</select></div>
                <div className="flex min-w-0 flex-col gap-2"><Label htmlFor={`difficulty-${row.id}`}>Kesulitan {index + 1}</Label><select id={`difficulty-${row.id}`} value={row.difficulty} className={SELECT} onChange={e => update(row.id, { difficulty: e.target.value as PromptComposition["difficulty"] })}>{PROMPT_DIFFICULTIES.map(value => <option key={value}>{value}</option>)}</select></div>
                <div className="flex min-w-0 flex-col gap-2"><Label htmlFor={`level-${row.id}`}>Level berpikir {index + 1}</Label><select id={`level-${row.id}`} value={row.level} className={SELECT} onChange={e => update(row.id, { level: e.target.value as PromptComposition["level"] })}>{PROMPT_LEVELS.map(value => <option key={value} value={value}>{value === "Penalaran" ? "Penalaran/HOTS" : value}</option>)}</select></div>
                <div className="flex min-w-0 flex-col gap-2"><Label htmlFor={`count-${row.id}`}>Jumlah soal {index + 1}</Label><Input id={`count-${row.id}`} inputMode="numeric" value={Number.isNaN(row.count) ? "" : row.count || ""} onChange={e => update(row.id, { count: e.target.value.trim() ? Number(e.target.value) : NaN })} aria-describedby="prompt-count-hint" /></div>
                <div className="flex min-w-0 flex-col gap-2"><Label htmlFor={`points-${row.id}`}>Bobot {index + 1}</Label><Input id={`points-${row.id}`} inputMode="numeric" value={Number.isNaN(row.points) ? "" : row.points || ""} onChange={e => update(row.id, { points: e.target.value.trim() ? Number(e.target.value) : NaN })} aria-describedby="prompt-count-hint" /></div>
                <Button type="button" variant="outline" className="min-h-11 self-end" onClick={() => setRows(current => current.filter(item => item.id !== row.id))}>Hapus komposisi {index + 1}</Button>
              </fieldset>
            ))}
          </div>
          <p id="prompt-count-hint" className="text-sm text-muted-foreground">Jumlah dan bobot harus bilangan bulat positif; bobot maksimal 100. Total seluruh komposisi 1–{IMPORT_MAX} soal.</p>
          <p role="status">Total komposisi: {Number.isFinite(total) ? total : "—"} soal</p>
          <Button type="button" variant="outline" className="min-h-11 self-start" disabled={rows.length >= IMPORT_MAX} onClick={() => { const id = nextId.current++; setRows(current => [...current, { ...initial, count: 1, id }]); }}>Tambah komposisi</Button>
          <div className="flex min-w-0 flex-col gap-2"><Label htmlFor="prompt-context">Konteks tambahan (opsional)</Label><textarea id="prompt-context" className={TEXTAREA} maxLength={5000} value={context} onChange={e => setContext(e.target.value)} placeholder="Tujuan pembelajaran, cakupan materi, atau batasan soal. Jangan masukkan data siswa." /></div>
          {!result.ok && <ul aria-label="Perlu dilengkapi untuk prompt" className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">{result.issues.map(issue => <li key={issue}>{issue}</li>)}</ul>}
          <div className="flex flex-wrap gap-3">
            <Button type="button" className="min-h-11" disabled={!result.ok} onClick={() => void copyPrompt()}>Salin prompt</Button>
            <Button type="button" variant="outline" className="min-h-11" disabled={!result.ok} onClick={downloadPrompt}>Unduh prompt .txt</Button>
          </div>
        </fieldset>
        {feedback && feedback.prompt === prompt && <p role={feedback.error ? "alert" : "status"} className="text-sm">{feedback.text}</p>}
        {result.ok && <div className="flex min-w-0 flex-col gap-2"><Label htmlFor="prompt-preview">Pratinjau prompt</Label><textarea id="prompt-preview" readOnly className={`${TEXTAREA} min-h-64`} value={prompt} /></div>}
        <p className="text-sm text-muted-foreground">Prompt membantu mengikuti format; hasil ChatGPT tetap perlu divalidasi dan ditinjau guru. Semua soal hasil impor disimpan sebagai draf.</p>
      </CardContent>
    </Card>
  );
}
