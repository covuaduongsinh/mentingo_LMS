import { randomInt } from "node:crypto";

// Excludes visually-confusable characters (l, 1, 0, O, I) — codes/usernames/passwords
// are read off a printed sheet or a classroom screen by young children.
const SAFE_CODE_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateSafeCode(length: number): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += SAFE_CODE_CHARSET[randomInt(SAFE_CODE_CHARSET.length)];
  }
  return code;
}

const PSEUDONYM_CHESS_PIECES = ["Mã", "Tượng", "Xe", "Hậu", "Tốt", "Vua"];

export function generatePseudonym(): { firstName: string; lastName: string } {
  const piece = PSEUDONYM_CHESS_PIECES[randomInt(PSEUDONYM_CHESS_PIECES.length)];
  const suffix = randomInt(100, 1000);
  return { firstName: piece, lastName: String(suffix) };
}

export function generateManagedAccountEmail(): string {
  return `managed.${generateSafeCode(16).toLowerCase()}@class.mentingo.local`;
}

export function generateUsernameCandidate(): string {
  return `hs${generateSafeCode(6).toLowerCase()}`;
}
