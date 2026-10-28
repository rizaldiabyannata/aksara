import { startAttempt } from "@/lib/attempts";
import { forbiddenOrigin, guarded, respond, sameOrigin } from "@/lib/attempt-http";
import { requireStudent } from "@/lib/auth/guard";

export async function POST(req: Request, { params }: { params: Promise<{ quizId: string }> }): Promise<Response> {
  if (!sameOrigin(req)) return forbiddenOrigin();
  const student = await requireStudent();
  const { quizId } = await params;
  return guarded(async () =>
    respond(await startAttempt({ id: student.id, classId: student.classId }, quizId), (r) => ({ ok: true, attemptId: r.attemptId })),
  );
}
