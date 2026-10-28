import { getAttemptView } from "@/lib/attempts";
import { guarded, json, notFound } from "@/lib/attempt-http";
import { requireStudent } from "@/lib/auth/guard";

export async function GET(_req: Request, { params }: { params: Promise<{ attemptId: string }> }): Promise<Response> {
  const student = await requireStudent();
  const { attemptId } = await params;
  return guarded(async () => {
    const view = await getAttemptView(student.id, { attemptId });
    return view ? json({ ok: true, attempt: view }) : notFound();
  });
}
