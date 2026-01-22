/**
 * Password hashing utilities for Convertr CRM
 * 
 * Uses Argon2id for new passwords (OWASP recommendation).
 * Maintains backward compatibility with existing bcrypt hashes.
 * 
 * SECURITY PROPERTIES:
 * - Argon2id: memory-hard, resistant to GPU/ASIC attacks
 * - Automatic salt generation
 * - Transparent bcrypt→Argon2id migration on verification
 */

import argon2 from 'argon2';
import bcrypt from 'bcrypt';

/**
 * Argon2id configuration following OWASP recommendations
 * https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
 */
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,   // 64 MiB
  timeCost: 3,         // 3 iterations
  parallelism: 4,      // 4 parallel threads
};

/**
 * Hash a password using Argon2id.
 * 
 * @param password - Plain text password
 * @returns Argon2id hash string
 * 
 * @example
 * const hash = await hashPassword('user-password');
 * // Store hash in database
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

/**
 * Verify a password against a hash.
 * Supports both Argon2id (new) and bcrypt (legacy) hashes.
 * 
 * @param password - Plain text password to verify
 * @param hash - Stored hash (Argon2id or bcrypt format)
 * @returns true if password matches
 * 
 * @example
 * const isValid = await verifyPassword('user-input', storedHash);
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Detect legacy bcrypt hash format ($2a$, $2b$, $2y$)
  if (isBcryptHash(hash)) {
    return bcrypt.compare(password, hash);
  }

  // Argon2id hash
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/**
 * Check if a hash is in bcrypt format (legacy).
 * Used to detect hashes that need re-hashing with Argon2id.
 * 
 * @param hash - The stored hash
 * @returns true if this is a bcrypt hash
 */
export function isBcryptHash(hash: string): boolean {
  return /^\$2[aby]\$/.test(hash);
}

/**
 * Check if a hash should be upgraded to Argon2id.
 * Call after successful password verification to enable transparent migration.
 * 
 * @param hash - The stored hash
 * @returns true if the hash should be re-hashed with Argon2id
 * 
 * @example
 * if (await verifyPassword(input, storedHash)) {
 *   if (needsRehash(storedHash)) {
 *     const newHash = await hashPassword(input);
 *     await updateUserHash(userId, newHash);
 *   }
 * }
 */
export function needsRehash(hash: string): boolean {
  return isBcryptHash(hash);
}
