/**
 * Meta Graph API Client
 * Pure HTTP layer - no business logic
 */

import {
    MetaApiConfig,
    MetaApiResponse,
    MetaAdAccount,
    MetaCampaign,
    MetaLead,
    MetaLeadGenForm,
    MetaApiErrorResponse,
} from './meta.types.js';
import { IntegrationApiError } from '../types.js';

const META_GRAPH_API_VERSION = 'v19.0';
const META_GRAPH_BASE_URL = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

interface MetaRawResponse<T> {
    data?: T;
    paging?: MetaApiResponse<T>['paging'];
    error?: MetaApiErrorResponse;
}

export class MetaClient {
    private readonly baseUrl = META_GRAPH_BASE_URL;

    constructor(private readonly config: MetaApiConfig) { }

    // ===========================================================================
    // Ad Accounts
    // ===========================================================================

    /**
     * Get all ad accounts the user has access to
     */
    async getAdAccounts(): Promise<MetaApiResponse<MetaAdAccount[]>> {
        return this.get<MetaAdAccount[]>('/me/adaccounts', {
            fields: 'id,account_id,name,account_status,currency,timezone_name',
        });
    }

    // ===========================================================================
    // Campaigns
    // ===========================================================================

    /**
     * Get campaigns for an ad account
     */
    async getCampaigns(accountId: string): Promise<MetaApiResponse<MetaCampaign[]>> {
        return this.get<MetaCampaign[]>(`/act_${accountId}/campaigns`, {
            fields: 'id,name,status,objective,created_time,updated_time',
        });
    }

    /**
     * Get a single campaign
     */
    async getCampaign(campaignId: string): Promise<MetaApiResponse<MetaCampaign>> {
        return this.get<MetaCampaign>(`/${campaignId}`, {
            fields: 'id,name,status,objective,created_time,updated_time,insights{spend,reach,impressions,cpm,cpc,ctr}',
        });
    }

    /**
     * Get ad sets for a campaign
     */
    async getAdSets(campaignId: string): Promise<MetaApiResponse<any[]>> {
        return this.get<any[]>(`/${campaignId}/adsets`, {
            fields: 'id,name,status,created_time,insights{results,spend,impressions,reach,cpm,cpc,ctr,actions}',
        });
    }

    /**
     * Get ads for a campaign
     */
    async getAds(campaignId: string): Promise<MetaApiResponse<any[]>> {
        return this.get<any[]>(`/${campaignId}/ads`, {
            fields: 'id,name,status,adset_id,creative{id,image_url,thumbnail_url},insights{results,spend,impressions,cpm,cpc,ctr,actions}',
        });
    }

    /**
     * Get daily insights for a campaign
     */
    async getDailyInsights(campaignId: string): Promise<MetaApiResponse<any[]>> {
        return this.get<any[]>(`/${campaignId}/insights`, {
            time_increment: '1',
            date_preset: 'last_30d',
            fields: 'spend,impressions,actions',
        });
    }

    /**
     * Get demographics for a campaign
     */
    async getDemographics(campaignId: string): Promise<MetaApiResponse<any[]>> {
        return this.get<any[]>(`/${campaignId}/insights`, {
            breakdowns: 'age,gender',
            date_preset: 'lifetime',
            fields: 'spend,impressions,reach',
        });
    }

    // ===========================================================================
    // Lead Forms & Leads
    // ===========================================================================

    /**
     * Get lead forms for a page
     */
    async getLeadForms(pageId: string): Promise<MetaApiResponse<MetaLeadGenForm[]>> {
        return this.get<MetaLeadGenForm[]>(`/${pageId}/leadgen_forms`, {
            fields: 'id,name,status,leads_count,page_id',
        });
    }

    /**
     * Get leads from a specific form
     */
    async getLeads(
        formId: string,
        options?: { since?: Date; limit?: number; after?: string },
    ): Promise<MetaApiResponse<MetaLead[]>> {
        const params: Record<string, string> = {
            fields: 'id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,is_organic,field_data',
        };

        if (options?.limit) {
            params.limit = String(options.limit);
        }

        if (options?.after) {
            params.after = options.after;
        }

        if (options?.since) {
            params.filtering = JSON.stringify([
                {
                    field: 'time_created',
                    operator: 'GREATER_THAN',
                    value: Math.floor(options.since.getTime() / 1000),
                },
            ]);
        }

        return this.get<MetaLead[]>(`/${formId}/leads`, params);
    }

    /**
     * Get all leads with automatic pagination
     */
    async getAllLeads(formId: string, since?: Date): Promise<MetaLead[]> {
        const allLeads: MetaLead[] = [];
        let after: string | undefined;

        do {
            const response = await this.getLeads(formId, { since, limit: 100, after });
            allLeads.push(...response.data);
            after = response.paging?.cursors?.after;
        } while (after);

        return allLeads;
    }

    // ===========================================================================
    // HTTP Layer
    // ===========================================================================

    private async get<T>(
        endpoint: string,
        params: Record<string, string> = {},
    ): Promise<MetaApiResponse<T>> {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        url.searchParams.set('access_token', this.config.accessToken);

        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        const json = await response.json() as MetaRawResponse<T>;

        if (!response.ok || json.error) {
            throw new IntegrationApiError(
                response.status,
                'META',
                String(json.error?.code || 'UNKNOWN'),
                json.error?.message || 'Unknown Meta API error',
                json,
            );
        }

        if ('data' in json) {
            return { data: json.data as T, paging: json.paging };
        } else {
            // Handle single node response (no data wrapper)
            return { data: json as unknown as T };
        }
    }
}
