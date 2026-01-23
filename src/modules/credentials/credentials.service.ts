/**
 * Credentials Service for Convertr CRM
 * 
 * Manages encrypted storage of external API credentials.
 * 
 * SECURITY PROPERTIES:
 * - All secrets encrypted at rest with AES-256-GCM
 * - Decryption only in memory, never logged
 * - One credential set per account per provider
 * - Supports credential rotation with audit trail
 */

import prisma from '../../lib/prisma.js';
import { encrypt, decryptAs } from '../../lib/crypto.js';
import {
    Provider,
    ProviderSecretsMap,
    DecryptedCredential,
} from './credentials.types.js';

/**
 * Error thrown when credential operations fail
 */
export class CredentialsError extends Error {
    constructor(
        message: string,
        public readonly code: 'NOT_FOUND' | 'ALREADY_EXISTS' | 'CRYPTO_FAILURE',
    ) {
        super(message);
        this.name = 'CredentialsError';
    }
}

class CredentialsService {
    /**
     * Save or update credentials for an account/provider pair.
     * If credentials already exist, use rotateCredentials() instead.
     * 
     * @throws CredentialsError if credentials already exist
     */
    async saveCredentials<P extends Provider>(
        accountId: string,
        provider: P,
        secrets: ProviderSecretsMap[P],
    ): Promise<void> {
        // Check if credentials already exist
        const existing = await prisma.externalCredential.findUnique({
            where: { accountId_provider: { accountId, provider } },
        });

        if (existing) {
            throw new CredentialsError(
                `Credentials already exist for ${provider}. Use rotateCredentials() to update.`,
                'ALREADY_EXISTS',
            );
        }

        const encryptedPayload = encrypt(secrets);

        await prisma.externalCredential.create({
            data: {
                accountId,
                provider,
                encryptedPayload,
            },
        });
    }

    /**
     * Retrieve and decrypt credentials for an account/provider pair.
     * 
     * @returns Decrypted credentials or null if not found
     */
    async getCredentials<P extends Provider>(
        accountId: string,
        provider: P,
    ): Promise<DecryptedCredential<P> | null> {
        const record = await prisma.externalCredential.findUnique({
            where: { accountId_provider: { accountId, provider } },
        });

        if (!record) {
            return null;
        }

        const secrets = decryptAs<ProviderSecretsMap[P]>(record.encryptedPayload);

        return {
            id: record.id,
            accountId: record.accountId,
            provider: provider,
            secrets,
            createdAt: record.createdAt,
            rotatedAt: record.rotatedAt,
        };
    }

    /**
     * Rotate (update) existing credentials.
     * Updates the rotatedAt timestamp for audit purposes.
     * 
     * @throws CredentialsError if credentials don't exist
     */
    async rotateCredentials<P extends Provider>(
        accountId: string,
        provider: P,
        newSecrets: ProviderSecretsMap[P],
    ): Promise<void> {
        const existing = await prisma.externalCredential.findUnique({
            where: { accountId_provider: { accountId, provider } },
        });

        if (!existing) {
            throw new CredentialsError(
                `No credentials found for ${provider}. Use saveCredentials() to create.`,
                'NOT_FOUND',
            );
        }

        const encryptedPayload = encrypt(newSecrets);

        await prisma.externalCredential.update({
            where: { id: existing.id },
            data: {
                encryptedPayload,
                rotatedAt: new Date(),
            },
        });
    }

    /**
     * Delete credentials for an account/provider pair.
     * 
     * @throws CredentialsError if credentials don't exist
     */
    async deleteCredentials(accountId: string, provider: Provider): Promise<void> {
        const existing = await prisma.externalCredential.findUnique({
            where: { accountId_provider: { accountId, provider } },
        });

        if (!existing) {
            throw new CredentialsError(
                `No credentials found for ${provider}.`,
                'NOT_FOUND',
            );
        }

        await prisma.externalCredential.delete({
            where: { id: existing.id },
        });
    }

    /**
     * Check if credentials exist for an account/provider pair.
     * Does not decrypt the credentials.
     */
    async hasCredentials(accountId: string, provider: Provider): Promise<boolean> {
        const count = await prisma.externalCredential.count({
            where: { accountId, provider },
        });
        return count > 0;
    }

    /**
     * List all providers with stored credentials for an account.
     * Does not decrypt any credentials.
     */
    async listProviders(accountId: string): Promise<Provider[]> {
        const records = await prisma.externalCredential.findMany({
            where: { accountId },
            select: { provider: true },
        });

        return records.map((r) => r.provider as Provider);
    }
}

export const credentialsService = new CredentialsService();
