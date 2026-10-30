import { requestHelp } from "@/lib/attempts";
import { forbiddenOrigin, guarded, respond, sameOrigin } from "@/lib/attempt-http";
import { requireStudent } from "@/lib/auth/guard";

export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }): Promise<Response> {
  if (!sameOrigin(req)) return forbiddenOrigin();
  const student = await requireStudent();
  const { attemptId } = await params;
  return guarded(async () => respond(await requestHelp(student.id, attemptId), () => ({ ok: true })));
}
