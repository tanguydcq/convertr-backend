/**
 * Meta Ads Integration Service
 * Business logic for Meta Ads integration
 */

import { MetaClient } from './meta.client.js';
import { mapMetaLeadsToPrismaInputs, mapMetaLeadToInternal } from './meta.mapper.js';
import { MetaApiConfig, MetaAdAccount, MetaLeadGenForm, MetaLeadInternal } from './meta.types.js';
import { SyncResult, IntegrationApiError } from '../types.js';
import prisma from '../../lib/prisma.js';

export class MetaService {
    private client: MetaClient | null = null;

    /**
     * Initialize the client with tenant-specific configuration
     * In production, you'd fetch this from a database
     */
    private initClient(config: MetaApiConfig): void {
        this.client = new MetaClient(config);
    }

    /**
     * Ensure client is initialized
     */
    private ensureClient(): MetaClient {
        if (!this.client) {
            throw new Error('MetaService not initialized. Call initClient first.');
        }
        return this.client;
    }

    // ===========================================================================
    // Configuration Management
    // ===========================================================================

    /**
     * Get configuration for a tenant
     * TODO: Implement actual storage (database table for integration configs)
     */
    async getConfigForTenant(tenantId: string): Promise<MetaApiConfig | null> {
        // Placeholder - in production, fetch from database
        // Example:
        // const config = await prisma.integrationConfig.findFirst({
        //   where: { tenantId, provider: 'META' },
        // });
        // return config ? { accessToken: config.accessToken } : null;

        console.warn(`[MetaService] getConfigForTenant not implemented for tenant ${tenantId}`);
        return null;
    }

    /**
     * Save configuration for a tenant
     * TODO: Implement actual storage
     */
    async saveConfigForTenant(
        tenantId: string,
        _config: MetaApiConfig,
    ): Promise<void> {
        // Placeholder - in production, save to database
        console.warn(`[MetaService] saveConfigForTenant not implemented for tenant ${tenantId}`);
    }

    // ===========================================================================
    // Ad Accounts
    // ===========================================================================

    /**
     * Get connected ad accounts for a tenant
     */
    async getConnectedAccounts(tenantId: string): Promise<MetaAdAccount[]> {
        const config = await this.getConfigForTenant(tenantId);
        if (!config) {
            return [];
        }

        this.initClient(config);
        const response = await this.ensureClient().getAdAccounts();
        return response.data;
    }

    // ===========================================================================
    // Lead Forms
    // ===========================================================================

    /**
     * Get lead forms for a page
     */
    async getLeadForms(tenantId: string, pageId: string): Promise<MetaLeadGenForm[]> {
        const config = await this.getConfigForTenant(tenantId);
        if (!config) {
            throw new Error('Meta integration not configured for this tenant');
        }

        this.initClient(config);
        const response = await this.ensureClient().getLeadForms(pageId);
        return response.data;
    }

    // ===========================================================================
    // Lead Sync
    // ===========================================================================

    /**
     * Fetch leads from Meta without saving to database
     */
    async fetchLeadsFromForm(
        tenantId: string,
        formId: string,
        since?: Date,
    ): Promise<MetaLeadInternal[]> {
        const config = await this.getConfigForTenant(tenantId);
        if (!config) {
            throw new Error('Meta integration not configured for this tenant');
        }

        this.initClient(config);
        const metaLeads = await this.ensureClient().getAllLeads(formId, since);

        return metaLeads.map(mapMetaLeadToInternal);
    }

    /**
     * Sync leads from a Meta form into the database
     */
    async syncLeadsFromForm(
        tenantId: string,
        formId: string,
        since?: Date,
    ): Promise<SyncResult> {
        const config = await this.getConfigForTenant(tenantId);
        if (!config) {
            throw new Error('Meta integration not configured for this tenant');
        }

        this.initClient(config);
        const result: SyncResult = { synced: 0, skipped: 0, errors: 0, details: [] };

        try {
            const metaLeads = await this.ensureClient().getAllLeads(formId, since);

            if (metaLeads.length === 0) {
                return result;
            }

            const leadsToCreate = mapMetaLeadsToPrismaInputs(metaLeads, tenantId);

            // Filter out leads that already exist (by email)
            const existingEmails = new Set(
                (
                    await prisma.lead.findMany({
                        where: {
                            tenantId,
                            email: { in: leadsToCreate.map((l) => l.email) },
                        },
                        select: { email: true },
                    })
                ).map((l) => l.email),
            );

            const newLeads = leadsToCreate.filter((l) => !existingEmails.has(l.email));
            result.skipped = leadsToCreate.length - newLeads.length;

            if (newLeads.length > 0) {
                // Create leads one by one to handle individual errors
                for (const leadData of newLeads) {
                    try {
                        await prisma.lead.create({ data: leadData });
                        result.synced++;
                    } catch (error) {
                        result.errors++;
                        result.details?.push({
                            externalId: leadData.email,
                            message: error instanceof Error ? error.message : 'Unknown error',
                        });
                    }
                }
            }
        } catch (error) {
            if (error instanceof IntegrationApiError) {
                throw error;
            }
            throw new Error(`Failed to sync leads: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        return result;
    }
}

// Singleton instance
export const metaService = new MetaService();
