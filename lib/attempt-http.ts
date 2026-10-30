// Shared HTTP bits for the student attempt Route Handlers (D22). Every response is no-store.
const MSG: Record<string, string> = {
  NOT_FOUND: "Ulangan tidak ditemukan.",
  ATTEMPT_LIMIT: "Kesempatan mengerjakan ulangan ini sudah habis.",
  REMEDIAL_NOT_AVAILABLE: "Remedial belum bisa dimulai untukmu.",
  RESULTS_RELEASED: "Nilainya sudah dibagikan, jadi ulangan ini tidak bisa diulang.",
  DEADLINE_PASSED: "Waktu habis, jawabanmu sudah dikumpulkan.",
  ATTEMPT_CLOSED: "Jawabanmu sudah dikumpulkan.",
  INVALID: "Jawaban tidak valid.",
  TOKEN_REQUIRED: "Masukkan token ujian dari gurumu.",
  TOKEN_INVALID: "Token salah. Cek lagi tokennya di papan tulis.",
  TOKEN_THROTTLED: "Terlalu banyak salah token. Tunggu 15 menit, lalu coba lagi.",
};

export const json = (body: Record<string, unknown>, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const fail = (error: string, status: number, message = MSG[error]) => json({ ok: false, error, message }, status);

export function sameOrigin(req: Request) {
  try {
    const origin = req.headers.get("origin");
    // Request drops a manually set Host header, so fall back to the URL host.
    return !!origin && new URL(origin).host === (req.headers.get("host") ?? new URL(req.url).host);
  } catch {
    return false;
  }
}

export const forbiddenOrigin = () => fail("FORBIDDEN", 403, "Permintaan ditolak.");

/** Maps a domain result to a response; `ok` results go through `onOk`. */
export function respond<R extends { ok: boolean }>(r: R, onOk: (r: Extract<R, { ok: true }>) => Record<string, unknown>) {
  if (r.ok) return json(onOk(r as Extract<R, { ok: true }>));
  const e = r as unknown as { error: string; fieldErrors?: { answer?: string } };
  if (e.error === "NOT_FOUND") return fail(e.error, 404);
  if (e.error === "INVALID") return fail(e.error, 400, e.fieldErrors?.answer ?? MSG.INVALID);
  return fail(e.error, 409);
}

/** Runs the domain call; unexpected throws become a generic 500 (no stack, no payload in logs). */
export async function guarded(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch {
    console.error("Gagal memproses permintaan ulangan");
    return json({ ok: false, error: "SERVER", message: "Ada masalah. Coba lagi sebentar lagi." }, 500);
  }
}

export const notFound = () => fail("NOT_FOUND", 404);
export const invalid = () => fail("INVALID", 400);
