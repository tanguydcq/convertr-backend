/**
 * Meta Ads API Types
 * Based on Meta Graph API v19.0
 */

// ============================================================================
// API Configuration
// ============================================================================

export interface MetaApiConfig {
    accessToken: string;
    appId?: string;
    appSecret?: string;
}

// ============================================================================
// API Response Types (raw from Meta)
// ============================================================================

export interface MetaApiResponse<T> {
    data: T;
    paging?: MetaPaging;
    error?: MetaApiErrorResponse;
}

export interface MetaPaging {
    cursors?: {
        before: string;
        after: string;
    };
    next?: string;
    previous?: string;
}

export interface MetaApiErrorResponse {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
}

// ============================================================================
// Ad Account Types
// ============================================================================

export interface MetaAdAccount {
    id: string;
    account_id: string;
    name: string;
    account_status: number;
    currency: string;
    timezone_name: string;
}

// ============================================================================
// Campaign Types
// ============================================================================

export interface MetaCampaign {
    id: string;
    name: string;
    status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
    objective: string;
    created_time: string;
    updated_time: string;
}

// ============================================================================
// Lead Types (from Lead Ads forms)
// ============================================================================

export interface MetaLead {
    id: string;
    created_time: string;
    ad_id?: string;
    ad_name?: string;
    adset_id?: string;
    adset_name?: string;
    campaign_id?: string;
    campaign_name?: string;
    form_id: string;
    is_organic: boolean;
    field_data: MetaLeadFieldData[];
}

export interface MetaLeadFieldData {
    name: string;
    values: string[];
}

// ============================================================================
// Lead Form Types
// ============================================================================

export interface MetaLeadGenForm {
    id: string;
    name: string;
    status: 'ACTIVE' | 'ARCHIVED' | 'DELETED' | 'DRAFT';
    leads_count: number;
    page_id: string;
}

// ============================================================================
// Internal Domain Types (after mapping)
// ============================================================================

export interface MetaLeadInternal {
    externalId: string;
    name: string;
    email: string;
    phone: string | null;
    company: string | null;
    campaignName: string | null;
    formId: string;
    createdAt: Date;
    rawFields: Record<string, string>;
}
