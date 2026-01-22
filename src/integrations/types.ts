/**
 * Common types shared across all integrations
 */

/**
 * Generic paginated response from external APIs
 */
export interface PaginatedResponse<T> {
    data: T[];
    paging?: {
        cursors?: {
            before?: string;
            after?: string;
        };
        next?: string;
        previous?: string;
    };
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
    synced: number;
    skipped: number;
    errors: number;
    details?: SyncError[];
}

/**
 * Details about a sync error
 */
export interface SyncError {
    externalId: string;
    message: string;
    code?: string;
}

/**
 * Base configuration for an integration per tenant
 */
export interface IntegrationConfig {
    tenantId: string;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
}

/**
 * Generic API error from external services
 */
export class IntegrationApiError extends Error {
    constructor(
        public readonly statusCode: number,
        public readonly provider: string,
        public readonly errorCode: string,
        message: string,
        public readonly rawResponse?: unknown,
    ) {
        super(`[${provider}] ${message}`);
        this.name = 'IntegrationApiError';
    }
}
