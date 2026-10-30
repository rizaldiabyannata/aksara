import { startAttempt } from "@/lib/attempts";
import { forbiddenOrigin, guarded, respond, sameOrigin } from "@/lib/attempt-http";
import { requireStudent } from "@/lib/auth/guard";

export async function POST(req: Request, { params }: { params: Promise<{ quizId: string }> }): Promise<Response> {
  if (!sameOrigin(req)) return forbiddenOrigin();
  const student = await requireStudent();
  const { quizId } = await params;
  const body: unknown = await req.json().catch(() => null);
  const raw = body && typeof body === "object" ? (body as { token?: unknown }).token : undefined;
  const token = typeof raw === "string" ? raw.slice(0, 32) : undefined;
  return guarded(async () =>
    respond(await startAttempt({ id: student.id, classId: student.classId }, quizId, new Date(), token), (r) => ({ ok: true, attemptId: r.attemptId })),
  );
}
