/**
 * Credentials Service for Convertr CRM
 * 
 * Manages encrypted storage of external API credentials.
 * 
 * SECURITY PROPERTIES:
 * - All secrets encrypted at rest with AES-256-GCM
 * - Decryption only in memory, never logged
 * - One credential set per tenant per provider
 * - Supports credential rotation with audit trail
 */

import prisma from '../../lib/prisma';
import { encrypt, decryptAs } from '../../lib/crypto';
import {
    Provider,
    ProviderSecretsMap,
    DecryptedCredential,
} from './credentials.types';

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
     * Save or update credentials for a tenant/provider pair.
     * If credentials already exist, use rotateCredentials() instead.
     * 
     * @throws CredentialsError if credentials already exist
     */
    async saveCredentials<P extends Provider>(
        tenantId: string,
        provider: P,
        secrets: ProviderSecretsMap[P],
    ): Promise<void> {
        // Check if credentials already exist
        const existing = await prisma.externalCredential.findUnique({
            where: { tenantId_provider: { tenantId, provider } },
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
                tenantId,
                provider,
                encryptedPayload,
            },
        });
    }

    /**
     * Retrieve and decrypt credentials for a tenant/provider pair.
     * 
     * @returns Decrypted credentials or null if not found
     */
    async getCredentials<P extends Provider>(
        tenantId: string,
        provider: P,
    ): Promise<DecryptedCredential<P> | null> {
        const record = await prisma.externalCredential.findUnique({
            where: { tenantId_provider: { tenantId, provider } },
        });

        if (!record) {
            return null;
        }

        const secrets = decryptAs<ProviderSecretsMap[P]>(record.encryptedPayload);

        return {
            id: record.id,
            tenantId: record.tenantId,
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
        tenantId: string,
        provider: P,
        newSecrets: ProviderSecretsMap[P],
    ): Promise<void> {
        const existing = await prisma.externalCredential.findUnique({
            where: { tenantId_provider: { tenantId, provider } },
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
     * Delete credentials for a tenant/provider pair.
     * 
     * @throws CredentialsError if credentials don't exist
     */
    async deleteCredentials(tenantId: string, provider: Provider): Promise<void> {
        const existing = await prisma.externalCredential.findUnique({
            where: { tenantId_provider: { tenantId, provider } },
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
     * Check if credentials exist for a tenant/provider pair.
     * Does not decrypt the credentials.
     */
    async hasCredentials(tenantId: string, provider: Provider): Promise<boolean> {
        const count = await prisma.externalCredential.count({
            where: { tenantId, provider },
        });
        return count > 0;
    }

    /**
     * List all providers with stored credentials for a tenant.
     * Does not decrypt any credentials.
     */
    async listProviders(tenantId: string): Promise<Provider[]> {
        const records = await prisma.externalCredential.findMany({
            where: { tenantId },
            select: { provider: true },
        });

        return records.map((r) => r.provider as Provider);
    }
}

export const credentialsService = new CredentialsService();
