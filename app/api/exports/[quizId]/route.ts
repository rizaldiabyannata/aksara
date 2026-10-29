import { requireTeacher } from "@/lib/auth/guard";
import { guarded, notFound } from "@/lib/attempt-http";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { buildQuizWorkbook } from "@/lib/export";

export async function GET(_req: Request, { params }: { params: Promise<{ quizId: string }> }): Promise<Response> {
  // Outside guarded(): the redirect/forbidden interrupts must not become a 500.
  const user = await requireTeacher();
  const { quizId } = await params;
  return guarded(async () => {
    const book = await buildQuizWorkbook(quizId);
    if (!book) return notFound();
    await writeAudit(prisma, {
      actorUserId: user.id, action: "EXPORT_DOWNLOADED", entityType: "Quiz", entityId: quizId,
      metadata: { quizId, rowCount: book.rowCount },
    });
    return new Response(new Uint8Array(book.data), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${book.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
