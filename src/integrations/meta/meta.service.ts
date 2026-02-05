/**
 * Meta Ads Integration Service
 * Business logic for Meta Ads integration
 */

import { MetaClient } from './meta.client.js';
import { mapMetaLeadsToPrismaInputs, mapMetaLeadToInternal } from './meta.mapper.js';
import { MetaApiConfig, MetaAdAccount, MetaLeadGenForm, MetaLeadInternal } from './meta.types.js';
import { SyncResult, IntegrationApiError } from '../types.js';
import prisma from '../../lib/prisma.js';
import { config } from '../../config/index.js';
import { credentialsService } from '../../modules/credentials/credentials.service.js';

export class MetaService {
    private client: MetaClient | null = null;

    /**
     * Initialize the client with account-specific configuration
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
    // Authentication & Connection
    // ===========================================================================

    /**
     * Check if account is connected
     */
    async isConnected(organisationId: string): Promise<boolean> {
        return credentialsService.hasCredentials(organisationId, 'meta_ads');
    }

    /**
     * Exchange OAuth code for access token
     */
    async exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
        if (!config.META_APP_ID || !config.META_APP_SECRET) {
            throw new Error('Meta App ID and Secret are not configured');
        }

        const url = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
        url.searchParams.set('client_id', config.META_APP_ID);
        url.searchParams.set('client_secret', config.META_APP_SECRET);
        url.searchParams.set('redirect_uri', redirectUri);
        url.searchParams.set('code', code);

        const response = await fetch(url.toString());
        const data = await response.json() as any;

        if (data.error) {
            console.error('Meta OAuth Error:', data.error);
            throw new Error(data.error.message || 'Failed to exchange code for token');
        }

        return data.access_token;
    }

    /**
     * Select an Ad Account for the integration
     * Also creates/updates the AdAccount record in the database
     */
    async selectAdAccount(organisationId: string, adAccountId: string): Promise<void> {
        const creds = await credentialsService.getCredentials(organisationId, 'meta_ads');
        if (!creds) {
            throw new Error('No Meta credentials found. Connect account first.');
        }

        // Fetch ad account details from Meta
        this.initClient({ accessToken: creds.secrets.accessToken, adAccountId });
        const client = this.ensureClient();

        // Get all ad accounts to find the selected one
        const accountsResponse = await client.getAdAccounts();
        const selectedAccount = accountsResponse.data.find(
            acc => acc.id === adAccountId || acc.id === `act_${adAccountId}` || `act_${acc.id}` === adAccountId
        );

        if (!selectedAccount) {
            throw new Error(`Ad account ${adAccountId} not found or not accessible`);
        }

        // Ensure platform exists
        let platform = await prisma.platform.findUnique({
            where: { name: 'facebook' },
        });

        if (!platform) {
            platform = await prisma.platform.create({
                data: { name: 'facebook' },
            });
        }

        // Normalize the external ID (remove act_ prefix for storage)
        const externalId = selectedAccount.id.replace('act_', '');

        // Upsert the AdAccount in the database
        await prisma.adAccount.upsert({
            where: {
                platformId_externalId: {
                    platformId: platform.id,
                    externalId: externalId,
                },
            },
            update: {
                name: selectedAccount.name,
                currency: selectedAccount.currency || 'EUR',
                status: selectedAccount.account_status?.toString() || 'ACTIVE',
            },
            create: {
                organisationId,
                platformId: platform.id,
                externalId: externalId,
                name: selectedAccount.name,
                currency: selectedAccount.currency || 'EUR',
                status: selectedAccount.account_status?.toString() || 'ACTIVE',
            },
        });

        // Update credentials with the selected ad account ID
        const newSecrets = {
            ...creds.secrets,
            adAccountId: externalId,
        };

        await credentialsService.rotateCredentials(organisationId, 'meta_ads', newSecrets);

        console.log(`[MetaService] Ad account ${selectedAccount.name} (${externalId}) selected and saved for org ${organisationId}`);
    }

    /**
     * Connect a Meta account
     */
    async connectAccount(organisationId: string, code: string, redirectUri: string): Promise<void> {
        // 1. Exchange code for short-lived token
        let accessToken = await this.exchangeCodeForToken(code, redirectUri);

        // 2. Exchange for long-lived token (optional but recommended)
        if (config.META_APP_ID && config.META_APP_SECRET) {
            const url = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
            url.searchParams.set('grant_type', 'fb_exchange_token');
            url.searchParams.set('client_id', config.META_APP_ID);
            url.searchParams.set('client_secret', config.META_APP_SECRET);
            url.searchParams.set('fb_exchange_token', accessToken);

            const response = await fetch(url.toString());
            const data = await response.json() as any;

            if (!data.error && data.access_token) {
                accessToken = data.access_token;
            }
        }

        // 3. Save credentials
        // Use credentialsService to save/rotate
        const hasCreds = await credentialsService.hasCredentials(organisationId, 'meta_ads');
        const secrets = { accessToken };

        if (hasCreds) {
            await credentialsService.rotateCredentials(organisationId, 'meta_ads', secrets);
        } else {
            await credentialsService.saveCredentials(organisationId, 'meta_ads', secrets);
        }
    }

    // ===========================================================================
    // Configuration Management
    // ===========================================================================

    /**
     * Get configuration for an account
     */
    async getConfigForAccount(organisationId: string): Promise<MetaApiConfig | null> {
        const creds = await credentialsService.getCredentials(organisationId, 'meta_ads');
        if (!creds) {
            return null;
        }

        return {
            accessToken: creds.secrets.accessToken,
            adAccountId: creds.secrets.adAccountId,
        };
    }

    /**
     * Save configuration for an account
     */
    async saveConfigForAccount(
        organisationId: string,
        _config: MetaApiConfig,
    ): Promise<void> {
        // Placeholder - in production, save to database
        console.warn(`[MetaService] saveConfigForAccount not implemented for organisation ${organisationId}`);
    }

    // ===========================================================================
    // Ad Accounts
    // ===========================================================================

    /**
     * Get connected ad accounts for an account
     */
    async getConnectedAccounts(organisationId: string, accessToken?: string): Promise<MetaAdAccount[]> {
        if (accessToken) {
            // Use provided token (e.g. for connection preview)
            const tempClient = new MetaClient({ accessToken, adAccountId: '' });
            const response = await tempClient.getAdAccounts();
            return response.data;
        }

        const config = await this.getConfigForAccount(organisationId);
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
    async getLeadForms(organisationId: string, pageId: string): Promise<MetaLeadGenForm[]> {
        const config = await this.getConfigForAccount(organisationId);
        if (!config) {
            throw new Error('Meta integration not configured for this account');
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
        organisationId: string,
        formId: string,
        since?: Date,
    ): Promise<MetaLeadInternal[]> {
        const config = await this.getConfigForAccount(organisationId);
        if (!config) {
            throw new Error('Meta integration not configured for this account');
        }

        this.initClient(config);
        const metaLeads = await this.ensureClient().getAllLeads(formId, since);

        return metaLeads.map(mapMetaLeadToInternal);
    }

    /**
     * Sync leads from a Meta form into the database
     */
    async syncLeadsFromForm(
        organisationId: string,
        formId: string,
        since?: Date,
    ): Promise<SyncResult> {
        const config = await this.getConfigForAccount(organisationId);
        if (!config) {
            throw new Error('Meta integration not configured for this account');
        }

        this.initClient(config);
        const result: SyncResult = { synced: 0, skipped: 0, errors: 0, details: [] };

        try {
            const metaLeads = await this.ensureClient().getAllLeads(formId, since);

            if (metaLeads.length === 0) {
                return result;
            }

            const leadsToCreate = mapMetaLeadsToPrismaInputs(metaLeads, organisationId);

            // Filter out leads that already exist (by email)
            // Note: In RLS setup, finding duplicates across an organisation requires correct context or unrestricted query?
            // Since we are running as app_client context or app_internal (if worker), assuming context is set.
            // But wait, sync might run as worker (app_internal).

            // Using prisma.lead.findMany requires correct context if RLS enabled.
            // If we are calling from API (e.g. "Sync Now"), we have context.
            // If background worker, we should have app_internal.

            const existingEmails = new Set(
                (
                    await prisma.lead.findMany({
                        where: {
                            organisationId,
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

    // ===========================================================================
    // Campaigns & Insights
    // ===========================================================================

    /**
     * Get campaigns
     */
    async getCampaigns(organisationId: string): Promise<any[]> {
        const config = await this.getConfigForAccount(organisationId);
        if (!config) {
            throw new Error('Meta integration not configured for this account');
        }

        this.initClient(config);
        // MetaClient has getCampaigns but it needs accountId from config
        if (!config.adAccountId) {
            throw new Error('Ad Account ID not configured');
        }

        const response = await this.ensureClient().getCampaigns(config.adAccountId);
        return response.data;
    }

    /**
     * Get a single campaign by ID
     */
    async getCampaign(organisationId: string, campaignId: string): Promise<any> {
        const config = await this.getConfigForAccount(organisationId);
        if (!config) {
            throw new Error('Meta integration not configured for this account');
        }

        this.initClient(config);
        const response = await this.ensureClient().getCampaign(campaignId);
        return response.data;
    }

    /**
     * Get insights
     */
    /**
     * Get full campaign details including sub-objects and insights
     */
    async getFullCampaignDetails(organisationId: string, campaignId: string): Promise<any> {
        const config = await this.getConfigForAccount(organisationId);
        if (!config) {
            throw new Error('Meta integration not configured for this account');
        }

        this.initClient(config);
        const client = this.ensureClient();

        console.log(`[MetaService] Fetching full details for campaign ${campaignId}`);

        try {
            const [campaign, adSets, ads, dailyInsights, demographics] = await Promise.all([
                client.getCampaign(campaignId).catch(err => { console.error('[MetaService] Campaign fetch failed', err); throw err; }),
                client.getAdSets(campaignId).catch(err => { console.error('[MetaService] AdSets fetch failed', err); throw new Error(`AdSets fetch failed: ${err.message}`); }),
                client.getAds(campaignId).catch(err => { console.error('[MetaService] Ads fetch failed', err); throw new Error(`Ads fetch failed: ${err.message}`); }),
                client.getDailyInsights(campaignId).catch(err => { console.error('[MetaService] DailyInsights fetch failed', err); return { data: [] }; }), // Fail gracefully
                client.getDemographics(campaignId).catch(err => { console.error('[MetaService] Demographics fetch failed', err); return { data: [] }; }) // Fail gracefully
            ]);

            return {
                campaign: campaign.data,
                adSets: adSets.data,
                ads: ads.data,
                dailyInsights: dailyInsights.data || [],
                demographics: demographics.data || []
            };
        } catch (error) {
            console.error('[MetaService] Error fetching full campaign details:', error);
            throw error;
        }
    }
    async syncCampaignDetails(organisationId: string, campaignId: string): Promise<void> {
        const details = await this.getFullCampaignDetails(organisationId, campaignId);
        const { campaign, adSets, ads, dailyInsights } = details;

        // 1. Get Ad Account config to link to the correct ad account in DB
        const config = await this.getConfigForAccount(organisationId);
        if (!config?.adAccountId) {
            throw new Error('Ad Account ID not found');
        }

        // 2. Find internal AdAccount ID
        const adAccount = await prisma.adAccount.findFirst({
            where: { organisationId, externalId: config.adAccountId }
        });

        if (!adAccount) {
            // Need to sync ad account first properly, but for now throwing error
            throw new Error(`Ad Account ${config.adAccountId} not found in DB. Please sync Ad Accounts first.`);
        }

        // 3. Upsert Campaign
        const dbCampaign = await prisma.campaign.upsert({
            where: {
                adAccountId_externalId: {
                    adAccountId: adAccount.id,
                    externalId: campaign.id
                }
            },
            update: {
                name: campaign.name,
                status: campaign.status,
                objective: campaign.objective,
                startTime: campaign.start_time ? new Date(campaign.start_time) : null,
                stopTime: campaign.stop_time ? new Date(campaign.stop_time) : null
            },
            create: {
                organisationId,
                adAccountId: adAccount.id,
                externalId: campaign.id,
                name: campaign.name,
                status: campaign.status,
                objective: campaign.objective,
                startTime: campaign.start_time ? new Date(campaign.start_time) : null,
                stopTime: campaign.stop_time ? new Date(campaign.stop_time) : null
            }
        });

        // 4. Upsert Ad Sets
        for (const set of adSets) {
            await prisma.adSet.upsert({
                where: {
                    campaignId_externalId: {
                        campaignId: dbCampaign.id,
                        externalId: set.id
                    }
                },
                update: {
                    name: set.name,
                    status: set.status,
                    startTime: set.start_time ? new Date(set.start_time) : null,
                    stopTime: set.end_time ? new Date(set.end_time) : null, // Meta API uses end_time for adsets
                },
                create: {
                    campaignId: dbCampaign.id,
                    externalId: set.id,
                    name: set.name,
                    status: set.status,
                    startTime: set.start_time ? new Date(set.start_time) : null,
                    stopTime: set.end_time ? new Date(set.end_time) : null
                }
            });
        }

        // 5. Upsert Ads
        // First we need to map ad set external IDs to internal UUIDs for the relation
        const dbAdSets = await prisma.adSet.findMany({
            where: { campaignId: dbCampaign.id }
        });
        const adSetMap = new Map(dbAdSets.map(s => [s.externalId, s.id]));

        for (const ad of ads) {
            if (adSetId) {
                await (prisma as any).ad.upsert({
                    where: {
                        adSetId_externalId: {
                            adSetId: adSetId,
                            externalId: ad.id
                        }
                    },
                    update: {
                        name: ad.name,
                        status: ad.status,
                        creativeId: ad.creative?.id,
                        creativeUrl: ad.creative?.image_url || ad.creative?.thumbnail_url
                    },
                    create: {
                        campaignId: dbCampaign.id,
                        adSetId: adSetId,
                        externalId: ad.id,
                        name: ad.name,
                        status: ad.status,
                        creativeId: ad.creative?.id,
                        creativeUrl: ad.creative?.image_url || ad.creative?.thumbnail_url
                    }
                });
            } else {
                console.warn(`[MetaService] Ad ${ad.id} skipped - could not find Ad Set`);
            }
        }
    }
}

// Singleton instance
export const metaService = new MetaService();
