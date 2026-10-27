import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import {
  releaseOnSuccess,
  reserveAttempt,
  throttleKey,
} from "@/lib/auth/throttle";

afterEach(() => {
  vi.useRealTimers();
});

describe("reserveAttempt", () => {
  it("allows 5 teacher attempts then blocks the 6th", async () => {
    const k = throttleKey.teacher("bu-guru");
    for (let i = 0; i < 5; i++) expect(await reserveAttempt([k])).toBe(true);
    expect(await reserveAttempt([k])).toBe(false);
  });

  it("resets the window after 15 minutes", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const k = throttleKey.teacher("bu-guru");
    for (let i = 0; i < 6; i++) await reserveAttempt([k]);
    expect(await reserveAttempt([k])).toBe(false);
    vi.setSystemTime(Date.now() + 15 * 60 * 1000);
    expect(await reserveAttempt([k])).toBe(true);
  });

  it("allows 10 student attempts then blocks the 11th", async () => {
    const k = throttleKey.student("6A-X7K2", "budi");
    for (let i = 0; i < 10; i++) expect(await reserveAttempt([k])).toBe(true);
    expect(await reserveAttempt([k])).toBe(false);
  });

  it("is atomic under concurrency: 10 parallel reserves yield exactly 5 true", async () => {
    const k = throttleKey.teacher("bu-guru");
    const results = await Promise.all(
      Array.from({ length: 10 }, () => reserveAttempt([k])),
    );
    expect(results.filter(Boolean)).toHaveLength(5);
  });

  it("stores only hashed keys", async () => {
    await reserveAttempt([throttleKey.student("6A-X7K2", "budi")]);
    const rows = await prisma.loginThrottle.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toMatch(/^[0-9a-f]{64}$/);
    expect(rows[0].key).not.toContain("6A-X7K2");
  });
});

describe("releaseOnSuccess", () => {
  it("deletes the identity row and decrements the ip row, never below 0", async () => {
    const id = throttleKey.teacher("bu-guru");
    const ip = throttleKey.ip("1.2.3.4");
    await reserveAttempt([id, ip]);
    await reserveAttempt([id, ip]);
    await releaseOnSuccess(id, ip);
    expect(
      await prisma.loginThrottle.findUnique({ where: { key: id.key } }),
    ).toBeNull();
    const row = await prisma.loginThrottle.findUnique({
      where: { key: ip.key },
    });
    expect(row?.failCount).toBe(1);

    await releaseOnSuccess(id, ip);
    await releaseOnSuccess(id, ip);
    const row2 = await prisma.loginThrottle.findUnique({
      where: { key: ip.key },
    });
    expect(row2?.failCount).toBe(0);
  });
});
