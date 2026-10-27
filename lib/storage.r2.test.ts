import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { deleteImage, presignGet, putImage } from "@/lib/storage";

// Runs only against a real R2 bucket (see README setup checklist).
describe.skipIf(!process.env.R2_BUCKET)("R2 smoke", () => {
  it("stores a private object, serves it via presigned GET, refuses unsigned GET, deletes", async () => {
    const key = `smoke/${randomUUID()}.jpg`;
    const body = await sharp({
      create: { width: 8, height: 8, channels: 3, background: "#369" },
    })
      .jpeg()
      .toBuffer();

    await putImage(key, body, "image/jpeg");
    try {
      const signed = await fetch(await presignGet(key));
      expect(signed.status).toBe(200);
      expect(signed.headers.get("content-type")).toBe("image/jpeg");

      const unsigned = await fetch(
        `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${key}`,
      );
      expect(unsigned.status).toBeGreaterThanOrEqual(400);
      expect(unsigned.status).toBeLessThan(500);
    } finally {
      await deleteImage(key);
    }
  });
});
