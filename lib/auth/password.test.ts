import { describe, expect, it, vi } from "vitest";
import { hash } from "@node-rs/argon2";
import {
  hashPassword,
  verifyDummyPassword,
  verifyPassword,
} from "@/lib/auth/password";

vi.mock("@node-rs/argon2", async (orig) => {
  const m = await orig<typeof import("@node-rs/argon2")>();
  return { ...m, hash: vi.fn(m.hash) };
});

describe("hashPassword", () => {
  it("produces an Argon2id PHC string with the agreed parameters", async () => {
    const hash = await hashPassword("kata-sandi-rahasia-123");
    expect(hash.startsWith("$argon2id$v=19$m=19456,t=2,p=1$")).toBe(true);
  });

  it("salts each hash, so the same password yields different hashes", async () => {
    const a = await hashPassword("kata-sandi-rahasia-123");
    const b = await hashPassword("kata-sandi-rahasia-123");
    expect(a).not.toBe(b);
  });
});

describe("verifyPassword", () => {
  it("returns true for the right password and false for a wrong one", async () => {
    const hash = await hashPassword("kata-sandi-rahasia-123");
    expect(await verifyPassword(hash, "kata-sandi-rahasia-123")).toBe(true);
    expect(await verifyPassword(hash, "kata-sandi-salah-456")).toBe(false);
  });
});

describe("verifyDummyPassword", () => {
  // Must run before any successful dummy build, which would be cached for the module's life.
  it("does not cache a failed dummy-hash build", async () => {
    vi.mocked(hash).mockRejectedValueOnce(new Error("boom"));
    await expect(verifyDummyPassword("x")).rejects.toThrow("boom");
    expect(await verifyDummyPassword("x")).toBe(false);
  });

  it("always returns false, while doing a real Argon2 verify", async () => {
    expect(await verifyDummyPassword("x")).toBe(false);
  });
});
