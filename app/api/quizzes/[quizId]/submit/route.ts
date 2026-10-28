import { submitAttempt } from "@/lib/attempts";
import { forbiddenOrigin, guarded, notFound, respond, sameOrigin } from "@/lib/attempt-http";
import { requireStudent } from "@/lib/auth/guard";

export async function POST(req: Request, { params }: { params: Promise<{ quizId: string }> }): Promise<Response> {
  if (!sameOrigin(req)) return forbiddenOrigin();
  const student = await requireStudent();
  const { quizId } = await params;
  const body: unknown = await req.json().catch(() => null);
  const attemptId = body && typeof body === "object" ? (body as { attemptId?: unknown }).attemptId : undefined;
  if (typeof attemptId !== "string") return notFound();
  return guarded(async () => respond(await submitAttempt(student.id, quizId, attemptId), (r) => ({ ok: true, reason: r.reason })));
}
