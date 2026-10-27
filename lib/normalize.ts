// Normalization for login identifiers. Input is user-typed, so compare the
// normalized forms only; store and display the original where needed.

const WHITESPACE = /\s+/gu;

export function normalizeIdentity(s: string): string {
  return s.normalize("NFKC").replace(WHITESPACE, " ").trim().toLowerCase();
}

export function isNis(normalized: string): boolean {
  return /^[0-9]+$/.test(normalized);
}

export function normalizeUsername(s: string): string {
  return s.normalize("NFKC").trim().toLowerCase();
}

// Class codes are shown grouped ("ABC DEF"), so spaces inside them are noise.
export function normalizeClassCode(s: string): string {
  return s.normalize("NFKC").replace(WHITESPACE, "").toUpperCase();
}
