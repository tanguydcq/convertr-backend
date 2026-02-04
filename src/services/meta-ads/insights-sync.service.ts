/**
 * Insights Sync Service
 * Manages append-only ingestion of raw Meta insights
 */

import prisma from '../../lib/prisma.js';
import { MetaClient } from '../../integrations/meta/meta.client.js';
import { credentialsService } from '../../modules/credentials/credentials.service.js';
import type { MetaApiConfig } from '../../integrations/meta/meta.types.js';

export interface InsightIngestionResult {
    insightId: string;
    campaignId: string;
    fetchedAt: Date;
}

export class InsightsSyncService {
    /**
     * Get Meta API config for an organisation
     */
    private async getMetaConfig(organisationId: string): Promise<MetaApiConfig | null> {
        const creds = await credentialsService.getCredentials(organisationId, 'meta_ads');
        if (!creds) return null;
        return {
            accessToken: creds.secrets.accessToken,
            adAccountId: creds.secrets.adAccountId,
        };
    }

    /**
     * Ingest raw insight data - APPEND ONLY
     */
    async ingestRawInsight(
        organisationId: string,
        campaignId: string,
        metaPayload: Record<string, unknown>
    ): Promise<InsightIngestionResult> {
        const now = new Date();

        const insight = await prisma.campaignInsightRaw.create({
            data: {
                organisationId,
                campaignId,
                fetchedAt: now,
                metaPayloadJson: metaPayload as unknown as any,
            },
        });

        return {
            insightId: insight.id,
            campaignId,
            fetchedAt: now,
        };
    }

    /**
     * Fetch insights from Meta and ingest
     */
    async fetchAndIngestInsights(
        organisationId: string,
        campaignExternalId: string
    ): Promise<InsightIngestionResult | null> {
        const config = await this.getMetaConfig(organisationId);
        if (!config) {
            throw new Error('Meta integration not configured for this organisation');
        }

        // Get internal campaign ID
        const campaign = await prisma.campaign.findFirst({
            where: { organisationId, externalId: campaignExternalId },
        });

        if (!campaign) {
            throw new Error(`Campaign ${campaignExternalId} not found in database`);
        }

        const client = new MetaClient(config);

        // Fetch current insights from Meta
        const insightsResponse = await client.getDailyInsights(campaignExternalId);

        if (!insightsResponse.data || insightsResponse.data.length === 0) {
            return null;
        }

        // Store raw payload
        return this.ingestRawInsight(
            organisationId,
            campaign.id,
            {
                campaign_id: campaignExternalId,
                fetched_at: new Date().toISOString(),
                insights: insightsResponse.data,
            }
        );
    }

    /**
     * Get active campaigns for polling
     */
    async getActiveCampaigns(organisationId: string) {
        return prisma.campaign.findMany({
            where: {
                organisationId,
                status: 'ACTIVE',
            },
            select: {
                id: true,
                externalId: true,
                name: true,
            },
        });
    }

    /**
     * Fetch and ingest insights for all active campaigns
     */
    async syncAllActiveCampaigns(organisationId: string): Promise<{
        synced: number;
        errors: string[];
    }> {
        const activeCampaigns = await this.getActiveCampaigns(organisationId);
        const errors: string[] = [];
        let synced = 0;

        for (const campaign of activeCampaigns) {
            try {
                const result = await this.fetchAndIngestInsights(
                    organisationId,
                    campaign.externalId
                );
                if (result) synced++;
            } catch (error) {
                errors.push(
                    `Campaign ${campaign.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
                );
            }
        }

        return { synced, errors };
    }

    /**
     * Get latest raw insights for a campaign
     */
    async getLatestRawInsights(campaignId: string, limit = 10) {
        return prisma.campaignInsightRaw.findMany({
            where: { campaignId },
            orderBy: { fetchedAt: 'desc' },
            take: limit,
        });
    }

    /**
     * Get raw insights between dates
     */
    async getRawInsightsBetween(campaignId: string, from: Date, to: Date) {
        return prisma.campaignInsightRaw.findMany({
            where: {
                campaignId,
                fetchedAt: {
                    gte: from,
                    lte: to,
                },
            },
            orderBy: { fetchedAt: 'asc' },
        });
    }
}

export const insightsSyncService = new InsightsSyncService();
