import { requireTeacher } from "@/lib/auth/guard";
import { guarded, notFound } from "@/lib/attempt-http";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { buildAttendanceWorkbook } from "@/lib/export";

export async function GET(req: Request, { params }: { params: Promise<{ classId: string }> }): Promise<Response> {
  // Outside guarded(): the redirect/forbidden interrupts must not become a 500.
  const user = await requireTeacher();
  const { classId } = await params;
  const month = new URL(req.url).searchParams.get("month") ?? "";
  return guarded(async () => {
    const book = await buildAttendanceWorkbook(classId, month);
    if (!book) return notFound();
    await writeAudit(prisma, {
      actorUserId: user.id, action: "ATTENDANCE_EXPORTED", entityType: "Class", entityId: classId,
      metadata: { month, rowCount: book.rowCount },
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
