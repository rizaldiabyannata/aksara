import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { makeChapter, makeClass, makeImage, makeMaterial, makeStudent, makeTeacher } from "../../../tests/factories";
import { cookieJar, expectForbidden, expectRedirect, resetNextMocks } from "../../../tests/next-mocks";
import { objects } from "../../../tests/storage-fake";
import * as storage from "@/lib/storage";
import { POST } from "./route";
import { GET } from "./[id]/route";

vi.mock("next/headers", () => import("../../../tests/next-mocks").then((m) => m.nextHeadersMock()));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/storage", () => import("../../../tests/storage-fake").then((m) => m.storageMock()));

beforeEach(() => {
  resetNextMocks();
  objects.clear();
});

async function signIn(user: { id: string; role: "STUDENT" | "TEACHER" }) {
  const { token } = await createSession(prisma, user);
  cookieJar.set("aksara_session", token);
}

const png = () =>
  sharp({ create: { width: 20, height: 20, channels: 3, background: "#f00" } }).png().toBuffer();

function upload(fields: Record<string, string | Blob>, origin: string | null = "http://localhost") {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  const headers: Record<string, string> = {};
  if (origin) headers.origin = origin;
  return new Request("http://localhost/api/images", { method: "POST", headers, body: fd });
}

async function setup() {
  const { user } = await makeTeacher();
  const ch = await makeChapter();
  const material = await makeMaterial(ch.id, user.id);
  return { user, material };
}

describe("POST /api/images authz", () => {
  it("is forbidden for a student and stores nothing", async () => {
    const { material } = await setup();
    await signIn(await makeStudent((await makeClass()).id));
    const file = new File([await png()], "a.png", { type: "image/png" });
    await expectForbidden(POST(upload({ file, materialId: material.id, altText: "a" })));
    expect(await prisma.image.count()).toBe(0);
  });

  it("redirects to the teacher login without a session", async () => {
    await expectRedirect(POST(upload({ materialId: "x" })), "/teacher/login");
  });

  it("is 403 without a matching Origin even for the teacher", async () => {
    const { user, material } = await setup();
    await signIn(user);
    const file = new File([await png()], "a.png", { type: "image/png" });
    for (const origin of [null, "http://evil.example", "not a url"]) {
      const res = await POST(upload({ file, materialId: material.id, altText: "a" }, origin));
      expect(res.status).toBe(403);
    }
    expect(await prisma.image.count()).toBe(0);
  });
});

describe("POST /api/images", () => {
  it("stores the image and never leaks the storage key", async () => {
    const { user, material } = await setup();
    await signIn(user);
    const file = new File([await png()], "a.png", { type: "image/png" });
    const res = await POST(upload({ file, materialId: material.id, altText: "Merah" }));
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(JSON.parse(text)).toEqual({ ok: true, id: expect.any(String) });
    expect(text).not.toContain("storageKey");
    expect(text).not.toContain("images/");
    expect(await prisma.image.count()).toBe(1);
    expect(objects.size).toBe(1);
  });

  it("rejects bad uploads", async () => {
    const { user, material } = await setup();
    await signIn(user);
    const svg = new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], "a.svg", { type: "image/svg+xml" });
    const fake = new File(["hello world!!"], "a.png", { type: "image/png" });
    const good = new File([await png()], "a.png", { type: "image/png" });
    const big = new File([new Uint8Array(4 * 1024 * 1024 + 1)], "big.jpg");
    expect((await POST(upload({ file: svg, materialId: material.id, altText: "a" }))).status).toBe(400);
    expect((await POST(upload({ file: fake, materialId: material.id, altText: "a" }))).status).toBe(400);
    const noAlt = await POST(upload({ file: good, materialId: material.id, altText: " " }));
    expect(noAlt.status).toBe(400);
    expect(await noAlt.json()).toMatchObject({ ok: false, message: "Periksa isian gambar.", fieldErrors: { altText: expect.any(String) } });
    expect((await POST(upload({ file: big, materialId: material.id, altText: "a" }))).status).toBe(413);
    expect((await POST(upload({ file: good, materialId: "nope", altText: "a" }))).status).toBe(404);
    expect((await POST(upload({ materialId: material.id, altText: "a" }))).status).toBe(400);
    expect(await prisma.image.count()).toBe(0);
  });

  it("answers 400 to a non-multipart body instead of crashing", async () => {
    const { user } = await setup();
    await signIn(user);
    const req = new Request("http://localhost/api/images", {
      method: "POST",
      headers: { origin: "http://localhost", "content-type": "text/plain" },
      body: "x",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, message: "File harus gambar JPG, PNG, atau WEBP." });
  });

  it("answers 500 JSON and stores no row when storage fails", async () => {
    const { user, material } = await setup();
    await signIn(user);
    const file = new File([await png()], "a.png", { type: "image/png" });
    const putSpy = vi.spyOn(storage, "putImage").mockRejectedValueOnce(new Error("R2 down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(upload({ file, materialId: material.id, altText: "a" }));
    expect(res.status).toBe(500);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ ok: false, message: "Ada masalah. Coba lagi sebentar lagi." });
    expect(errSpy).toHaveBeenCalledWith("Gagal mengunggah gambar", material.id);
    expect(await prisma.image.count()).toBe(0);
    putSpy.mockRestore();
    errSpy.mockRestore();
  });
});

describe("GET /api/images/[id]", () => {
  const get = (id: string) => GET(new Request(`http://localhost/api/images/${id}`), { params: Promise.resolve({ id }) });

  it("hides draft images from students, serves published ones via 302", async () => {
    const { user, material } = await setup();
    const draft = await makeImage(material.id, user.id);
    const pub = await makeMaterial(material.chapterId, user.id, { status: "PUBLISHED" });
    const pubImg = await makeImage(pub.id, user.id, { storageKey: "images/pub.jpg" });
    await signIn(await makeStudent((await makeClass()).id));

    const r404 = await get(draft.id);
    expect(r404.status).toBe(404);
    expect(r404.headers.get("cache-control")).toBe("no-store");

    const r302 = await get(pubImg.id);
    expect(r302.status).toBe(302);
    expect(r302.headers.get("location")).toBe("https://r2.test/images/pub.jpg?sig=1");
    expect(r302.headers.get("cache-control")).toBe("no-store");
  });

  it("redirects to /login without a session", async () => {
    await expectRedirect(get("x"), "/login");
  });

  it("lets the teacher see draft images", async () => {
    const { user, material } = await setup();
    const img = await makeImage(material.id, user.id);
    await signIn(user);
    expect((await get(img.id)).status).toBe(302);
  });
});
