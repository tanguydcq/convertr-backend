/**
 * Meta Ads Integration Module
 */

export { MetaClient } from './meta.client.js';
export { MetaService, metaService } from './meta.service.js';
export {
    mapMetaLeadToInternal,
    mapMetaLeadToPrismaInput,
    mapMetaLeadsToPrismaInputs,
} from './meta.mapper.js';
export type {
    MetaApiConfig,
    MetaAdAccount,
    MetaCampaign,
    MetaLead,
    MetaLeadGenForm,
    MetaLeadInternal,
} from './meta.types.js';
