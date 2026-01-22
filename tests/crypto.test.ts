import { encrypt, decrypt, decryptAs } from '../src/lib/crypto';

describe('Crypto Library', () => {
    describe('encrypt/decrypt', () => {
        it('should encrypt and decrypt object roundtrip', () => {
            const original = {
                accessToken: 'secret-token-12345',
                refreshToken: 'refresh-token-67890',
                expiresAt: '2024-12-31T23:59:59Z',
                adAccountId: 'act_123456789',
            };

            const encrypted = encrypt(original);
            const decrypted = decrypt(encrypted);

            expect(decrypted).toEqual(original);
        });

        it('should produce different ciphertext for same plaintext (unique IV)', () => {
            const data = { secret: 'test-value' };

            const encrypted1 = encrypt(data);
            const encrypted2 = encrypt(data);

            // Different IV means different ciphertext
            expect(encrypted1.equals(encrypted2)).toBe(false);

            // But both decrypt to same value
            expect(decrypt(encrypted1)).toEqual(data);
            expect(decrypt(encrypted2)).toEqual(data);
        });

        it('should handle complex nested objects', () => {
            const data = {
                tokens: {
                    access: 'abc',
                    refresh: 'def',
                },
                metadata: {
                    createdAt: '2024-01-01',
                    permissions: ['read', 'write'],
                },
            };

            const encrypted = encrypt(data);
            const decrypted = decrypt(encrypted);

            expect(decrypted).toEqual(data);
        });
    });

    describe('decryptAs', () => {
        interface TestSecrets {
            apiKey: string;
            endpoint: string;
        }

        it('should return typed object', () => {
            const original: TestSecrets = {
                apiKey: 'key123',
                endpoint: 'https://api.example.com',
            };

            const encrypted = encrypt(original);
            const decrypted = decryptAs<TestSecrets>(encrypted);

            expect(decrypted.apiKey).toBe('key123');
            expect(decrypted.endpoint).toBe('https://api.example.com');
        });
    });

    describe('error handling', () => {
        it('should fail on tampered payload', () => {
            const data = { secret: 'test' };
            const encrypted = encrypt(data);

            // Tamper with ciphertext (last byte)
            encrypted[encrypted.length - 1] ^= 0xff;

            expect(() => decrypt(encrypted)).toThrow('Decryption failed');
        });

        it('should fail on too short payload', () => {
            const shortPayload = Buffer.alloc(10); // Less than IV + AUTH_TAG + 1

            expect(() => decrypt(shortPayload)).toThrow('Invalid payload: too short');
        });

        it('should fail on null input', () => {
            expect(() => encrypt(null as any)).toThrow('Cannot encrypt null or undefined');
        });

        it('should fail on undefined input', () => {
            expect(() => encrypt(undefined as any)).toThrow('Cannot encrypt null or undefined');
        });

        it('should require Buffer type for decrypt', () => {
            expect(() => decrypt('not a buffer' as any)).toThrow('Payload must be a Buffer');
        });
    });

    describe('security properties', () => {
        it('should use 12-byte IV (NIST GCM recommendation)', () => {
            const data = { test: true };
            const encrypted = encrypt(data);

            // IV is first 12 bytes
            const iv = encrypted.subarray(0, 12);
            expect(iv.length).toBe(12);
        });

        it('should use 16-byte auth tag', () => {
            const data = { test: true };
            const encrypted = encrypt(data);

            // Auth tag is bytes 12-28
            const authTag = encrypted.subarray(12, 28);
            expect(authTag.length).toBe(16);
        });
    });
});
