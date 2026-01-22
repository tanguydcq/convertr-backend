/**
 * External Integrations Module
 *
 * This module provides a clean abstraction layer for external service integrations.
 * Business modules should ONLY import from this barrel export - never call external
 * APIs directly.
 *
 * Architecture:
 * - Client: Pure HTTP layer (fetch calls, no business logic)
 * - Mapper: JSON transformation (external → internal models)
 * - Service: Business logic orchestration
 * - Types: TypeScript definitions
 *
 * Usage:
 * ```typescript
 * import { metaService, retellService } from '../integrations';
 *
 * // In your business service
 * const leads = await metaService.syncLeadsFromForm(tenantId, formId);
 * const call = await retellService.initiatePhoneCall(tenantId, {...});
 * ```
 */

// Common types
export {
    PaginatedResponse,
    SyncResult,
    SyncError,
    IntegrationConfig,
    IntegrationApiError,
} from './types';

// Meta Ads Integration
export {
    metaService,
    MetaService,
    MetaClient,
    mapMetaLeadToInternal,
    mapMetaLeadToPrismaInput,
    mapMetaLeadsToPrismaInputs,
} from './meta';
export type {
    MetaApiConfig,
    MetaAdAccount,
    MetaCampaign,
    MetaLead,
    MetaLeadGenForm,
    MetaLeadInternal,
} from './meta';

// Retell AI Integration
export {
    retellService,
    RetellService,
    RetellClient,
    mapRetellCallToInternal,
    mapRetellCallsToInternal,
} from './retell';
export type {
    RetellApiConfig,
    RetellAgent,
    RetellAgentCreateInput,
    RetellCall,
    RetellCallInternal,
    RetellPhoneCallInput,
    RetellWebCallInput,
    RetellWebhookPayload,
} from './retell';
