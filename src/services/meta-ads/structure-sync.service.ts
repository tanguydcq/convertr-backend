/**
 * Structure Sync Service
 * Manages append-only snapshots of Meta campaign structure
 */

import prisma from '../../lib/prisma.js';
import { MetaClient } from '../../integrations/meta/meta.client.js';
import { credentialsService } from '../../modules/credentials/credentials.service.js';
import type { MetaApiConfig } from '../../integrations/meta/meta.types.js';

export interface SnapshotResult {
    created: boolean;
    snapshotId: string | null;
    reason: 'new' | 'changed' | 'unchanged';
}

export class StructureSyncService {
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
     * Create a campaign snapshot if structure has changed
     */
    async createCampaignSnapshot(
        organisationId: string,
        metaObjectId: string,
        payload: Record<string, unknown>
    ): Promise<SnapshotResult> {
        // Get latest active snapshot
        const latestSnapshot = await prisma.campaignStructureSnapshot.findFirst({
            where: {
                organisationId,
                metaObjectId,
                validTo: null, // Active snapshot
            },
            orderBy: { validFrom: 'desc' },
        });

        // Compare payloads
        if (latestSnapshot) {
            const existingPayload = latestSnapshot.payloadJson as Record<string, unknown>;
            if (this.deepEqual(existingPayload, payload)) {
                return { created: false, snapshotId: null, reason: 'unchanged' };
            }

            // Close the old snapshot
            await prisma.campaignStructureSnapshot.update({
                where: { id: latestSnapshot.id },
                data: { validTo: new Date() },
            });
        }

        // Create new snapshot
        const newSnapshot = await prisma.campaignStructureSnapshot.create({
            data: {
                organisationId,
                metaObjectId,
                snapshotVersion: (latestSnapshot?.snapshotVersion ?? 0) + 1,
                payloadJson: payload as unknown as any,
                validFrom: new Date(),
            },
        });

        return {
            created: true,
            snapshotId: newSnapshot.id,
            reason: latestSnapshot ? 'changed' : 'new',
        };
    }

    /**
     * Create an ad set snapshot if structure has changed
     */
    async createAdSetSnapshot(
        organisationId: string,
        metaObjectId: string,
        payload: Record<string, unknown>
    ): Promise<SnapshotResult> {
        const latestSnapshot = await prisma.adSetStructureSnapshot.findFirst({
            where: {
                organisationId,
                metaObjectId,
                validTo: null,
            },
            orderBy: { validFrom: 'desc' },
        });

        if (latestSnapshot) {
            const existingPayload = latestSnapshot.payloadJson as Record<string, unknown>;
            if (this.deepEqual(existingPayload, payload)) {
                return { created: false, snapshotId: null, reason: 'unchanged' };
            }

            await prisma.adSetStructureSnapshot.update({
                where: { id: latestSnapshot.id },
                data: { validTo: new Date() },
            });
        }

        const newSnapshot = await prisma.adSetStructureSnapshot.create({
            data: {
                organisationId,
                metaObjectId,
                snapshotVersion: (latestSnapshot?.snapshotVersion ?? 0) + 1,
                payloadJson: payload as unknown as any,
                validFrom: new Date(),
            },
        });

        return {
            created: true,
            snapshotId: newSnapshot.id,
            reason: latestSnapshot ? 'changed' : 'new',
        };
    }

    /**
     * Create an ad snapshot if structure has changed
     */
    async createAdSnapshot(
        organisationId: string,
        metaObjectId: string,
        payload: Record<string, unknown>
    ): Promise<SnapshotResult> {
        const latestSnapshot = await prisma.adStructureSnapshot.findFirst({
            where: {
                organisationId,
                metaObjectId,
                validTo: null,
            },
            orderBy: { validFrom: 'desc' },
        });

        if (latestSnapshot) {
            const existingPayload = latestSnapshot.payloadJson as Record<string, unknown>;
            if (this.deepEqual(existingPayload, payload)) {
                return { created: false, snapshotId: null, reason: 'unchanged' };
            }

            await prisma.adStructureSnapshot.update({
                where: { id: latestSnapshot.id },
                data: { validTo: new Date() },
            });
        }

        const newSnapshot = await prisma.adStructureSnapshot.create({
            data: {
                organisationId,
                metaObjectId,
                snapshotVersion: (latestSnapshot?.snapshotVersion ?? 0) + 1,
                payloadJson: payload as unknown as any,
                validFrom: new Date(),
            },
        });

        return {
            created: true,
            snapshotId: newSnapshot.id,
            reason: latestSnapshot ? 'changed' : 'new',
        };
    }

    /**
     * Sync full structure for an ad account
     * Creates snapshots for campaigns, ad sets, and ads
     */
    async syncAccountStructure(
        organisationId: string,
        adAccountId: string
    ): Promise<{
        campaigns: SnapshotResult[];
        adSets: SnapshotResult[];
        ads: SnapshotResult[];
    }> {
        const config = await this.getMetaConfig(organisationId);
        if (!config) {
            throw new Error('Meta integration not configured for this organisation');
        }

        const client = new MetaClient(config);
        const results = {
            campaigns: [] as SnapshotResult[],
            adSets: [] as SnapshotResult[],
            ads: [] as SnapshotResult[],
        };

        // Fetch campaigns
        const campaignsResponse = await client.getCampaigns(adAccountId.replace('act_', ''));

        for (const campaign of campaignsResponse.data) {
            // Create campaign snapshot
            const campaignResult = await this.createCampaignSnapshot(
                organisationId,
                campaign.id,
                campaign as unknown as Record<string, unknown>
            );
            results.campaigns.push(campaignResult);

            // Upsert campaign in ads schema (for relations)
            const dbAdAccount = await prisma.adAccount.findFirst({
                where: { organisationId, externalId: adAccountId },
            });

            if (dbAdAccount) {
                await prisma.campaign.upsert({
                    where: {
                        adAccountId_externalId: {
                            adAccountId: dbAdAccount.id,
                            externalId: campaign.id,
                        },
                    },
                    update: {
                        name: campaign.name,
                        status: campaign.status,
                        objective: campaign.objective,
                    },
                    create: {
                        organisationId,
                        adAccountId: dbAdAccount.id,
                        externalId: campaign.id,
                        name: campaign.name,
                        status: campaign.status,
                        objective: campaign.objective,
                    },
                });
            }

            // Fetch and snapshot ad sets
            const adSetsResponse = await client.getAdSets(campaign.id);
            for (const adSet of adSetsResponse.data) {
                const adSetResult = await this.createAdSetSnapshot(
                    organisationId,
                    adSet.id,
                    adSet as unknown as Record<string, unknown>
                );
                results.adSets.push(adSetResult);
            }

            // Fetch and snapshot ads
            const adsResponse = await client.getAds(campaign.id);
            for (const ad of adsResponse.data) {
                const adResult = await this.createAdSnapshot(
                    organisationId,
                    ad.id,
                    ad as unknown as Record<string, unknown>
                );
                results.ads.push(adResult);
            }
        }

        return results;
    }

    /**
     * Get valid snapshot at a specific timestamp
     */
    async getCampaignStructureAt(metaObjectId: string, ts: Date) {
        return prisma.campaignStructureSnapshot.findFirst({
            where: {
                metaObjectId,
                validFrom: { lte: ts },
                OR: [
                    { validTo: null },
                    { validTo: { gt: ts } },
                ],
            },
            orderBy: { validFrom: 'desc' },
        });
    }

    async getAdSetStructureAt(metaObjectId: string, ts: Date) {
        return prisma.adSetStructureSnapshot.findFirst({
            where: {
                metaObjectId,
                validFrom: { lte: ts },
                OR: [
                    { validTo: null },
                    { validTo: { gt: ts } },
                ],
            },
            orderBy: { validFrom: 'desc' },
        });
    }

    async getAdStructureAt(metaObjectId: string, ts: Date) {
        return prisma.adStructureSnapshot.findFirst({
            where: {
                metaObjectId,
                validFrom: { lte: ts },
                OR: [
                    { validTo: null },
                    { validTo: { gt: ts } },
                ],
            },
            orderBy: { validFrom: 'desc' },
        });
    }

    /**
     * Deep equality comparison for JSON objects
     */
    private deepEqual(a: unknown, b: unknown): boolean {
        return JSON.stringify(a) === JSON.stringify(b);
    }
}

export const structureSyncService = new StructureSyncService();
