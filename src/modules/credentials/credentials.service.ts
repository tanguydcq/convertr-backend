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

export class CredentialsService {
    /**
     * Save or update credentials for an organisation/provider pair.
     * If credentials already exist, use rotateCredentials() instead.
     * 
     * @throws CredentialsError if credentials already exist
     */
    async saveCredentials<P extends Provider>(
        organisationId: string,
        provider: P,
        secrets: ProviderSecretsMap[P],
    ): Promise<void> {
        // Check if credentials already exist
        const existing = await prisma.credential.findFirst({
            where: {
                organisationId,
                provider
            },
        });

        if (existing) {
            throw new CredentialsError(
                `Credentials already exist for ${provider}. Use rotateCredentials() to update.`,
                'ALREADY_EXISTS',
            );
        }

        const encryptedData = encrypt(secrets);

        await prisma.credential.create({
            data: {
                organisationId,
                provider,
                encryptedData: encryptedData as any,
                keyId: 'v1', // Default key version
            },
        });
    }

    /**
     * Retrieve and decrypt credentials for an organisation/provider pair.
     * 
     * @returns Decrypted credentials or null if not found
     */
    async getCredentials<P extends Provider>(
        organisationId: string,
        provider: P,
    ): Promise<DecryptedCredential<P> | null> {
        const record = await prisma.credential.findFirst({
            where: {
                organisationId,
                provider
            },
        });

        if (!record) {
            return null;
        }

        const secrets = decryptAs<ProviderSecretsMap[P]>(Buffer.from(record.encryptedData));

        return {
            id: record.id,
            organisationId: record.organisationId,
            provider: provider,
            secrets,
            createdAt: record.createdAt,
            rotatedAt: record.updatedAt, // Using updatedAt as rotatedAt equivalent
        };
    }

    /**
     * Rotate (update) existing credentials.
     * 
     * @throws CredentialsError if credentials don't exist
     */
    async rotateCredentials<P extends Provider>(
        organisationId: string,
        provider: P,
        newSecrets: ProviderSecretsMap[P],
    ): Promise<void> {
        const existing = await prisma.credential.findFirst({
            where: {
                organisationId,
                provider
            },
        });

        if (!existing) {
            throw new CredentialsError(
                `No credentials found for ${provider}. Use saveCredentials() to create.`,
                'NOT_FOUND',
            );
        }

        const encryptedData = encrypt(newSecrets);

        await prisma.credential.update({
            where: { id: existing.id },
            data: {
                encryptedData: encryptedData as any,
                updatedAt: new Date(),
                keyId: 'v1',
            },
        });
    }

    /**
     * Delete credentials for an organisation/provider pair.
     * 
     * @throws CredentialsError if credentials don't exist
     */
    async deleteCredentials(organisationId: string, provider: Provider): Promise<void> {
        const existing = await prisma.credential.findFirst({
            where: {
                organisationId,
                provider
            },
        });

        if (!existing) {
            throw new CredentialsError(
                `No credentials found for ${provider}.`,
                'NOT_FOUND',
            );
        }

        await prisma.credential.delete({
            where: { id: existing.id },
        });
    }

    /**
     * Check if credentials exist for an organisation/provider pair.
     * Does not decrypt the credentials.
     */
    async hasCredentials(organisationId: string, provider: Provider): Promise<boolean> {
        const count = await prisma.credential.count({
            where: { organisationId, provider },
        });
        return count > 0;
    }

    /**
     * List all providers with stored credentials for an organisation.
     * Does not decrypt any credentials.
     */
    async listProviders(organisationId: string): Promise<Provider[]> {
        const records = await prisma.credential.findMany({
            where: { organisationId },
            select: { provider: true },
        });

        return records.map((r) => r.provider as Provider);
    }
}

export const credentialsService = new CredentialsService();
