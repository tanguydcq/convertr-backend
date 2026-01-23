/**
 * Password hashing utilities for Convertr CRM
 * 
 * Uses Argon2id for new passwords (OWASP recommendation).
 * 
 * SECURITY PROPERTIES:
 * - Argon2id: memory-hard, resistant to GPU/ASIC attacks
 * - Automatic salt generation
 */

import argon2 from 'argon2';

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
 * 
 * @param password - Plain text password to verify
 * @param hash - Stored hash (Argon2id format)
 * @returns true if password matches
 * 
 * @example
 * const isValid = await verifyPassword('user-input', storedHash);
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/**
 * Check if a hash needs to be upgraded.
 * Currently always returns false as we only use Argon2id.
 * 
 * @param hash - The stored hash
 * @returns true if the hash should be re-hashed
 */
export function needsRehash(_hash: string): boolean {
  // All new hashes are Argon2id, no migration needed
  return false;
}
