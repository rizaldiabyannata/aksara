import { beforeEach, describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { makeStudent } from "../../../tests/factories";
import { cookieJar, expectForbidden, expectRedirect, resetNextMocks } from "../../../tests/next-mocks";
import { setup } from "../../../tests/quiz-setup";
import { GET } from "./route";

vi.mock("next/headers", () => import("../../../tests/next-mocks").then((m) => m.nextHeadersMock()));
vi.mock("@/lib/storage", () => import("../../../tests/storage-fake").then((m) => m.storageMock()));
beforeEach(resetNextMocks);
const get = (query = "") => GET(new Request(`http://localhost/api/gradebook-exports?${query}`));
async function signIn(user: { id: string; role: "STUDENT" | "TEACHER" }) {
  const { token } = await createSession(prisma, user); cookieJar.set("aksara_session", token);
}

describe("gradebook download boundary", () => {
  it("anonymous redirects; students cannot read teacher data or keys", async () => {
    const s = await setup();
    await expectRedirect(get("mode=full"), "/teacher/login");
    await signIn({ id: s.student.id, role: "STUDENT" });
    await expectForbidden(get("mode=full"));
  });
  it("validates dates, formats, modes and gives actionable no-store errors", async () => {
    const s = await setup(); await signIn({ id: s.teacher.id, role: "TEACHER" });
    for (const query of ["from=2030-02-30", "from=2030-02-01&to=2030-01-01", "format=pdf", "mode=bad", "kind=bad"]) {
      const res = await get(query);
      expect(res.status).toBe(400);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
      expect((await res.json()).error).toBeTruthy();
    }
    expect(await prisma.auditLog.count({ where: { action: "EXPORT_DOWNLOADED" } })).toBe(0);
  });
  it("downloads all filtered students beyond screen pagination, emits audit and attachment", async () => {
    const s = await setup();
    await Promise.all(Array.from({ length: 51 }, (_, i) => makeStudent(s.cls.id, { displayName: `Batch ${i}` })));
    await signIn({ id: s.teacher.id, role: "TEACHER" });
    const res = await get("format=csv&mode=summary&page=2");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("Content-Disposition")).toMatch(/^attachment; filename="Buku_Nilai_/);
    const zip = await JSZip.loadAsync(await res.arrayBuffer());
    const csv = await zip.file("BN-001.csv")!.async("string");
    expect(csv.trim().split("\r\n")).toHaveLength(53);
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { action: "EXPORT_DOWNLOADED" } });
    expect(audit.actorUserId).toBe(s.teacher.id);
    expect(audit.metadata).toMatchObject({ mode: "summary", format: "csv" });
    const filtered = await get("format=csv&q=Batch%2050");
    const only = await JSZip.loadAsync(await filtered.arrayBuffer());
    expect((await only.file("BN-001.csv")!.async("string")).trim().split("\r\n")).toHaveLength(2);
  });
});
