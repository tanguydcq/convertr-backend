import { hashPassword, verifyPassword, needsRehash, isBcryptHash } from '../src/lib/password';
import bcrypt from 'bcrypt';

describe('Password Library', () => {
    describe('hashPassword', () => {
        it('should hash with Argon2id', async () => {
            const password = 'test-password-123';
            const hash = await hashPassword(password);

            // Argon2id hashes start with $argon2id$
            expect(hash).toMatch(/^\$argon2id\$/);
        });

        it('should produce different hashes for same password (unique salt)', async () => {
            const password = 'same-password';

            const hash1 = await hashPassword(password);
            const hash2 = await hashPassword(password);

            expect(hash1).not.toBe(hash2);
        });
    });

    describe('verifyPassword', () => {
        it('should verify Argon2id hash', async () => {
            const password = 'correct-password';
            const hash = await hashPassword(password);

            expect(await verifyPassword(password, hash)).toBe(true);
            expect(await verifyPassword('wrong-password', hash)).toBe(false);
        });

        it('should verify legacy bcrypt hash (backward compat)', async () => {
            const password = 'legacy-password';
            // Create a bcrypt hash (simulating existing db entry)
            const bcryptHash = await bcrypt.hash(password, 12);

            expect(await verifyPassword(password, bcryptHash)).toBe(true);
            expect(await verifyPassword('wrong', bcryptHash)).toBe(false);
        });

        it('should return false for invalid hash format', async () => {
            const result = await verifyPassword('password', 'not-a-valid-hash');
            expect(result).toBe(false);
        });
    });

    describe('isBcryptHash', () => {
        it('should detect bcrypt $2a$ format', () => {
            expect(isBcryptHash('$2a$12$abcdefghijklmnopqrstuv')).toBe(true);
        });

        it('should detect bcrypt $2b$ format', () => {
            expect(isBcryptHash('$2b$12$abcdefghijklmnopqrstuv')).toBe(true);
        });

        it('should detect bcrypt $2y$ format', () => {
            expect(isBcryptHash('$2y$12$abcdefghijklmnopqrstuv')).toBe(true);
        });

        it('should not detect argon2id as bcrypt', () => {
            expect(isBcryptHash('$argon2id$v=19$m=65536')).toBe(false);
        });
    });

    describe('needsRehash', () => {
        it('should flag bcrypt hash for rehash', async () => {
            const bcryptHash = await bcrypt.hash('password', 12);
            expect(needsRehash(bcryptHash)).toBe(true);
        });

        it('should not flag argon2id for rehash', async () => {
            const argon2Hash = await hashPassword('password');
            expect(needsRehash(argon2Hash)).toBe(false);
        });
    });

    describe('migration workflow', () => {
        it('should support transparent bcrypt to argon2id migration', async () => {
            const password = 'user-password';

            // Simulate existing bcrypt hash in database
            const legacyHash = await bcrypt.hash(password, 12);

            // Verify works with bcrypt
            const isValid = await verifyPassword(password, legacyHash);
            expect(isValid).toBe(true);

            // Check if needs rehash
            if (needsRehash(legacyHash)) {
                // Migrate to argon2id
                const newHash = await hashPassword(password);
                expect(newHash).toMatch(/^\$argon2id\$/);

                // New hash still verifies
                expect(await verifyPassword(password, newHash)).toBe(true);

                // New hash doesn't need rehash
                expect(needsRehash(newHash)).toBe(false);
            }
        });
    });
});
