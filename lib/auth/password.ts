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
  // A rejected build must not stay cached: a fast-failing branch would reveal unknown usernames.
  dummyHash ??= hashPassword("dummy-password-never-matches").catch((e) => {
    dummyHash = undefined;
    throw e;
  });
  await verify(await dummyHash, pw);
  return false;
}
