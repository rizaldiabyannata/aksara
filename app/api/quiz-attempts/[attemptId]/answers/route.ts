import { saveAnswer } from "@/lib/attempts";
import { forbiddenOrigin, guarded, invalid, respond, sameOrigin } from "@/lib/attempt-http";
import { requireStudent } from "@/lib/auth/guard";

export async function PUT(req: Request, { params }: { params: Promise<{ attemptId: string }> }): Promise<Response> {
  if (!sameOrigin(req)) return forbiddenOrigin();
  const student = await requireStudent();
  const { attemptId } = await params;
  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return invalid();
  return guarded(async () =>
    respond(await saveAnswer(student.id, attemptId, body), (r) => ({ ok: true, savedAt: r.savedAt.toISOString() })),
  );
}
