import { requireTeacher } from "@/lib/auth/guard";
import { guarded } from "@/lib/attempt-http";
import { buildQuestionTemplate } from "@/lib/question-import-workbook";

export async function GET(): Promise<Response> {
  await requireTeacher();
  return guarded(async () => {
    const workbook = await buildQuestionTemplate();
    return new Response(new Uint8Array(await workbook.xlsx.writeBuffer()), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="template-soal-aksara.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  });
}
