import { hashPassword, verifyPassword, needsRehash } from '../src/lib/password';

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

        it('should return false for invalid hash format', async () => {
            const result = await verifyPassword('password', 'not-a-valid-hash');
            expect(result).toBe(false);
        });

        it('should return false for empty password', async () => {
            const hash = await hashPassword('test');
            const result = await verifyPassword('', hash);
            expect(result).toBe(false);
        });
    });

    describe('needsRehash', () => {
        it('should not flag argon2id for rehash', async () => {
            const argon2Hash = await hashPassword('password');
            expect(needsRehash(argon2Hash)).toBe(false);
        });
    });

    describe('security properties', () => {
        it('should verify password timing is consistent', async () => {
            const password = 'test-password';
            const hash = await hashPassword(password);

            // Both correct and incorrect passwords should complete
            const start1 = Date.now();
            await verifyPassword(password, hash);
            const time1 = Date.now() - start1;

            const start2 = Date.now();
            await verifyPassword('wrong-password', hash);
            const time2 = Date.now() - start2;

            // Times should be in the same order of magnitude (rough check)
            expect(Math.abs(time1 - time2)).toBeLessThan(500);
        });
    });
});
