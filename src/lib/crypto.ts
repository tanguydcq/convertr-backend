/**
 * Cryptographic utilities for Convertr CRM
 * 
 * AES-256-GCM authenticated encryption for external API secrets.
 * 
 * SECURITY PROPERTIES:
 * - 12-byte random IV per encryption (NIST SP 800-38D recommendation)
 * - 16-byte authentication tag (GCM integrity)
 * - Key derived from environment variable only
 * - No Prisma dependency (pure crypto)
 * - Timing-safe operations
 * 
 * PAYLOAD FORMAT:
 * [IV (12 bytes)][AUTH_TAG (16 bytes)][CIPHERTEXT (variable)]
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { config } from '../config/index.js';

const ALGORITHM = 'aes-256-gcm' as const;
const IV_LENGTH = 12; // NIST recommendation for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Get the master encryption key from environment.
 * Parses the "base64:" prefix and decodes.
 * 
 * @throws Error if key is missing or malformed
 */
function getMasterKey(): Buffer {
    const rawKey = config.ENCRYPTION_MASTER_KEY;

    if (!rawKey.startsWith('base64:')) {
        throw new Error('ENCRYPTION_MASTER_KEY must start with "base64:"');
    }

    const key = Buffer.from(rawKey.slice(7), 'base64');

    if (key.length !== 32) {
        throw new Error('ENCRYPTION_MASTER_KEY must be exactly 32 bytes');
    }

    return key;
}

/**
 * Encrypt an object using AES-256-GCM.
 * 
 * @param data - The object to encrypt (must be JSON-serializable)
 * @returns Buffer containing [IV][AUTH_TAG][CIPHERTEXT]
 * 
 * @example
 * const encrypted = encrypt({ accessToken: 'secret123', expiresAt: '2024-12-31' });
 * // Store encrypted in database as Bytes
 */
export function encrypt(data: object): Buffer {
    if (data === null || data === undefined) {
        throw new Error('Cannot encrypt null or undefined');
    }

    const key = getMasterKey();
    const iv = randomBytes(IV_LENGTH);

    const cipher = createCipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH,
    });

    const plaintext = JSON.stringify(data);
    const ciphertext = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // Format: [IV][AUTH_TAG][CIPHERTEXT]
    return Buffer.concat([iv, authTag, ciphertext]);
}

/**
 * Decrypt a payload encrypted with encrypt().
 * 
 * @param payload - Buffer containing [IV][AUTH_TAG][CIPHERTEXT]
 * @returns The decrypted object
 * @throws Error if decryption fails (tampered data, wrong key, etc.)
 * 
 * @example
 * const secrets = decrypt(encryptedPayload) as MetaAdsSecrets;
 */
export function decrypt(payload: Buffer): object {
    if (!Buffer.isBuffer(payload)) {
        throw new Error('Payload must be a Buffer');
    }

    const minLength = IV_LENGTH + AUTH_TAG_LENGTH + 1;
    if (payload.length < minLength) {
        throw new Error('Invalid payload: too short');
    }

    const key = getMasterKey();

    // Extract components
    const iv = payload.subarray(0, IV_LENGTH);
    const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH,
    });

    decipher.setAuthTag(authTag);

    try {
        const plaintext = Buffer.concat([
            decipher.update(ciphertext),
            decipher.final(),
        ]).toString('utf8');

        return JSON.parse(plaintext);
    } catch (error) {
        // Generic error to prevent oracle attacks
        throw new Error('Decryption failed: invalid payload or key');
    }
}

/**
 * Type-safe decrypt wrapper.
 * 
 * @example
 * const secrets = decryptAs<MetaAdsSecrets>(payload);
 * console.log(secrets.accessToken);
 */
export function decryptAs<T extends object>(payload: Buffer): T {
    return decrypt(payload) as T;
}
