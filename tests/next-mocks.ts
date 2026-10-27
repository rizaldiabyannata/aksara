import { expect, vi } from "vitest";

// In-memory request context for code that calls next/headers. Usage (vi.mock is hoisted per file):
//   vi.mock("next/headers", () => import("../../tests/next-mocks").then((m) => m.nextHeadersMock()));
//   vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
//   beforeEach(resetNextMocks);
export const cookieJar = new Map<string, string>();
/** Options of the last set/delete per cookie name. */
export const cookieOptions = new Map<string, Record<string, unknown>>();
export const headerJar = new Map<string, string>();

type CookieArg = string | ({ name: string } & Record<string, unknown>);

export function nextHeadersMock() {
  return {
    cookies: async () => ({
      get: (name: string) =>
        cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined,
      set: (name: string, value: string, options: Record<string, unknown> = {}) => {
        cookieJar.set(name, value);
        cookieOptions.set(name, options);
      },
      delete: (arg: CookieArg) => {
        const opts = typeof arg === "string" ? { name: arg } : arg;
        cookieJar.delete(opts.name);
        cookieOptions.set(opts.name, opts);
      },
    }),
    headers: async () => new Headers([...headerJar]),
  };
}

export function resetNextMocks() {
  cookieJar.clear();
  cookieOptions.clear();
  headerJar.clear();
  vi.clearAllMocks();
}

/** Redirect digest is `NEXT_REDIRECT;<type>;<url>;<status>;`, so `path` must match the URL exactly. */
export async function expectRedirect(promise: Promise<unknown>, path: string) {
  const err = await promise.then(
    () => expect.fail(`expected redirect to ${path}`),
    (e: { digest?: string }) => e,
  );
  expect(err.digest).toMatch(/^NEXT_REDIRECT;/);
  expect(err.digest?.split(";")[2]).toBe(path);
}

export async function expectForbidden(promise: Promise<unknown>) {
  await expect(promise).rejects.toMatchObject({
    digest: "NEXT_HTTP_ERROR_FALLBACK;403",
  });
}
