import { requireTeacher } from "@/lib/auth/guard";
import { guarded } from "@/lib/attempt-http";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { getGradebook } from "@/lib/gradebook";
import { GradebookError, parseGradeFilters } from "@/lib/gradebook-filters";
import { buildGradeTables, serializeGradebook } from "@/lib/gradebook-export";

export async function GET(req: Request): Promise<Response> {
  const user = await requireTeacher();
  return guarded(async () => {
    try {
      const params = new URL(req.url).searchParams, filters = parseGradeFilters(params);
      const format = params.get("format") || "xlsx", mode = params.get("mode") || "summary";
      if (format !== "xlsx" && format !== "csv") throw new GradebookError("Format harus Excel (xlsx) atau CSV (csv).");
      if (mode !== "summary" && mode !== "full") throw new GradebookError("Pilihan unduhan harus ringkas (summary) atau lengkap (full).");
      const book = await getGradebook(filters, { full: mode === "full" });
      const file = await serializeGradebook(buildGradeTables(book, mode), format, book.capturedAt);
      await writeAudit(prisma, {
        actorUserId: user.id, action: "EXPORT_DOWNLOADED", entityType: "Gradebook", entityId: user.id,
        metadata: { format, mode, rowCount: file.rowCount, quizIds: book.quizzes.map((q) => q.id) },
      });
      return new Response(new Uint8Array(file.data), { headers: {
        "Content-Type": file.type, "Content-Disposition": `attachment; filename="${file.filename}"`, "Cache-Control": "no-store",
      } });
    } catch (e) {
      if (e instanceof GradebookError) return Response.json({ error: e.message }, { status: e.status, headers: { "Cache-Control": "no-store" } });
      throw e;
    }
  });
}
