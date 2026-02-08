/**
 * Type definitions for external provider credentials
 * 
 * Each provider has its own secrets structure.
 * Credentials are encrypted at rest using AES-256-GCM.
 */

/**
 * Supported external providers
 */
export type Provider = 'meta_ads' | 'retell_ai' | 'google_ads';

/**
 * Google Ads API credentials
 */
export interface GoogleAdsSecrets {
    access_token: string;
    refresh_token: string;
    scope: string;
    token_type: string;
    expiry_date: number;
}

/**
 * Meta Ads API credentials
 * @see https://developers.facebook.com/docs/marketing-api/authentication
 */
export interface MetaAdsSecrets {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: string; // ISO 8601 date string
    adAccountId?: string;
}

/**
 * Retell AI API credentials
 * @see https://docs.retell.ai/authentication
 */
export interface RetellAISecrets {
    apiKey: string;
}

/**
 * Union type for all provider secrets
 */
export type ProviderSecrets = MetaAdsSecrets | RetellAISecrets;

/**
 * Map provider to its secrets type
 */
export interface ProviderSecretsMap {
    meta_ads: MetaAdsSecrets;
    retell_ai: RetellAISecrets;
    google_ads: GoogleAdsSecrets;
}

/**
 * Input for saving credentials
 */
export interface SaveCredentialsInput<P extends Provider> {
    organisationId: string;
    provider: P;
    secrets: ProviderSecretsMap[P];
}

/**
 * Credential record as returned from database (decrypted)
 */
export interface DecryptedCredential<P extends Provider> {
    id: string;
    organisationId: string;
    provider: P;
    secrets: ProviderSecretsMap[P];
    createdAt: Date;
    rotatedAt: Date | null;
}
