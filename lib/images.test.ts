import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  canStudentViewImage,
  extractImageIds,
  processUpload,
} from "@/lib/images";

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("extractImageIds", () => {
  it("finds ids in images and links, deduped", () => {
    expect(
      extractImageIds(
        "![a](aksara-image:x1) [b](aksara-image:x1) ![c](aksara-image:y2)",
      ),
    ).toEqual(["x1", "y2"]);
  });
});

describe("canStudentViewImage", () => {
  it("lets the teacher see drafts and students see only published", () => {
    expect(
      canStudentViewImage({ role: "TEACHER", materialStatus: "DRAFT" }),
    ).toBe(true);
    expect(
      canStudentViewImage({ role: "STUDENT", materialStatus: "PUBLISHED" }),
    ).toBe(true);
    expect(
      canStudentViewImage({ role: "STUDENT", materialStatus: "DRAFT" }),
    ).toBe(false);
    expect(
      canStudentViewImage({ role: "STUDENT", materialStatus: "REVIEWED" }),
    ).toBe(false);
  });
});

describe("processUpload", () => {
  it("strips EXIF and caps long side at 1600", async () => {
    const input = await sharp({
      create: { width: 2400, height: 1200, channels: 3, background: "#c00" },
    })
      .jpeg()
      .withExif({ IFD0: { Copyright: "Aksara" } })
      .toBuffer();
    expect((await sharp(input).metadata()).exif).toBeDefined();

    const r = await processUpload(input);
    if (!r.ok) throw new Error(r.error);
    expect(r.image.mimeType).toBe("image/jpeg");
    expect(r.image.ext).toBe("jpg");
    expect(r.image.width).toBe(1600);
    expect(r.image.height).toBe(800);
    expect((await sharp(r.image.data).metadata()).exif).toBeUndefined();
  });

  it("keeps PNG as PNG and does not upscale", async () => {
    const input = await sharp({
      create: { width: 300, height: 200, channels: 3, background: "#0c0" },
    })
      .png()
      .toBuffer();
    const r = await processUpload(input);
    if (!r.ok) throw new Error(r.error);
    expect(r.image.mimeType).toBe("image/png");
    expect(r.image.ext).toBe("png");
    expect([r.image.width, r.image.height]).toEqual([300, 200]);
  });

  it("rejects SVG", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );
    expect(await processUpload(svg)).toEqual({ ok: false, error: "UNSUPPORTED" });
  });

  it("rejects fake .png", async () => {
    expect(await processUpload(Buffer.from("bukan png"))).toEqual({
      ok: false,
      error: "UNSUPPORTED",
    });
  });

  it("rejects truncated PNG", async () => {
    expect(await processUpload(PNG_HEADER)).toEqual({
      ok: false,
      error: "UNSUPPORTED",
    });
  });

  it("rejects decompression bombs without throwing", async () => {
    // Build a 1x1 PNG, then patch IHDR width/height to 30000 (sharp refuses to create a huge image).
    const bomb = await sharp({
      create: { width: 1, height: 1, channels: 3, background: "#fff" },
    })
      .png()
      .toBuffer();
    bomb.writeUInt32BE(30000, 16);
    bomb.writeUInt32BE(30000, 20);
    expect(await processUpload(bomb)).toEqual({ ok: false, error: "UNSUPPORTED" });
  });
});
