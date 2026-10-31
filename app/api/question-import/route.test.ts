import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { makeTeacher, makeClass, makeStudent } from "../../../tests/factories";
import { cookieJar, resetNextMocks, expectForbidden, expectRedirect } from "../../../tests/next-mocks";
import { POST } from "./route";
import { GET } from "./template/route";
import { IMPORT_BODY_MAX } from "@/lib/question-import-format";
vi.mock("next/headers", () => import("../../../tests/next-mocks").then(m => m.nextHeadersMock()));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/storage", () => import("../../../tests/storage-fake").then(m => m.storageMock()));
beforeEach(resetNextMocks);
async function signIn(user: { id: string; role: "TEACHER" | "STUDENT" }) { const { token } = await createSession(prisma, user); cookieJar.set("aksara_session", token); }
const request = (body = "{}", origin = "http://localhost") => new Request("http://localhost/api/question-import", { method: "POST", headers: { origin, "content-type": "application/json" }, body });
describe("question import routes", () => {
  it("guards both endpoints against students and anonymous callers", async () => {
    await expectRedirect(GET(), "/teacher/login"); await expectRedirect(POST(request()), "/teacher/login");
    await signIn(await makeStudent((await makeClass()).id));
    await expectForbidden(GET()); await expectForbidden(POST(request()));
    expect(await prisma.quiz.count()).toBe(0);
  });
  it("serves the authenticated workbook with private no-store headers", async () => {
    await signIn((await makeTeacher()).user);
    const result = await GET();
    expect(result.status).toBe(200); expect(result.headers.get("cache-control")).toBe("no-store");
    expect(result.headers.get("content-disposition")).toContain("template-soal-aksara.xlsx");
    expect((await result.arrayBuffer()).byteLength).toBeGreaterThan(1000);
  });
  it("rejects foreign origins, malformed JSON, wrong media and oversized actual streamed bytes", async () => {
    await signIn((await makeTeacher()).user);
    expect((await POST(request("{}", "https://foreign.test"))).status).toBe(403);
    expect((await POST(request("{"))).status).toBe(400);
    const wrong = request(); wrong.headers.set("content-type", "text/plain");
    expect((await POST(wrong)).status).toBe(415);
    expect((await POST(request("x".repeat(IMPORT_BODY_MAX + 1)))).status).toBe(413);
    expect((await POST(request())).status).toBe(400);
  });
});
