import { requireSession } from "@/lib/auth/guard";
import { imageRedirectTarget } from "@/lib/images";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const user = await requireSession();
  const { id } = await params;
  const url = await imageRedirectTarget(user, id);
  if (!url) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "no-store" } });
}
