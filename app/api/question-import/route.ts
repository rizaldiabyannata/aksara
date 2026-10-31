import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth/guard";
import { forbiddenOrigin, guarded, json, sameOrigin } from "@/lib/attempt-http";
import { IMPORT_BODY_MAX } from "@/lib/question-import-format";
import { importQuestionQuiz } from "@/lib/question-import";

export async function POST(req: Request): Promise<Response> {
  const teacher = await requireTeacher();
  if (!sameOrigin(req)) return forbiddenOrigin();
  if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return json({ ok: false, message: "Kirim data impor dalam format JSON." }, 415);
  return guarded(async () => {
    const reader = req.body?.getReader();
    if (!reader) return json({ ok: false, message: "Data impor kosong." }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > IMPORT_BODY_MAX) {
          await reader.cancel();
          return json({ ok: false, message: "Isi teks terlalu besar. Kurangi jumlah atau panjang soal, lalu impor sebagai ulangan terpisah." }, 413);
        }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    let input: unknown;
    try { input = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { return json({ ok: false, message: "Data impor tidak terbaca. Baca ulang berkas." }, 400); }
    const result = await importQuestionQuiz(teacher.id, input);
    if (!result.ok) return json({ ...result, message: Object.values(result.fieldErrors).join("\n") }, 400);
    revalidatePath("/teacher/quizzes");
    revalidatePath("/teacher/questions");
    return json(result);
  });
}
