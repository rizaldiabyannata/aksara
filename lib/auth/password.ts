import { hash, verify } from "@node-rs/argon2";

// Argon2id is the library default. Same cost as the PRD's Argon2id setting.
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export function hashPassword(pw: string): Promise<string> {
  return hash(pw, OPTIONS);
}

export function verifyPassword(hashed: string, pw: string): Promise<boolean> {
  return verify(hashed, pw);
}

// Lazily built once, so unknown-user logins cost the same time as real ones.
let dummyHash: Promise<string> | undefined;

export async function verifyDummyPassword(pw: string): Promise<false> {
  dummyHash ??= hashPassword("dummy-password-never-matches");
  await verify(await dummyHash, pw);
  return false;
}
