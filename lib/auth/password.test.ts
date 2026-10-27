import { describe, expect, it } from "vitest";
import {
  hashPassword,
  verifyDummyPassword,
  verifyPassword,
} from "@/lib/auth/password";

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
  it("always returns false, while doing a real Argon2 verify", async () => {
    expect(await verifyDummyPassword("x")).toBe(false);
  });
});
