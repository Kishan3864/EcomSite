import "server-only";

import bcrypt from "bcryptjs";

const ROUNDS = 10;

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

/** Minimum bar for anything that guards an account. */
export function passwordProblem(plain: string): string | null {
  if (plain.length < 8) return "Use at least 8 characters.";
  if (!/[A-Za-z]/.test(plain) || !/\d/.test(plain))
    return "Mix letters and numbers.";
  return null;
}
