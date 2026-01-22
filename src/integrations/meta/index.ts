/**
 * Meta Ads Integration Module
 */

export { MetaClient } from './meta.client';
export { MetaService, metaService } from './meta.service';
export {
    mapMetaLeadToInternal,
    mapMetaLeadToPrismaInput,
    mapMetaLeadsToPrismaInputs,
} from './meta.mapper';
export type {
    MetaApiConfig,
    MetaAdAccount,
    MetaCampaign,
    MetaLead,
    MetaLeadGenForm,
    MetaLeadInternal,
} from './meta.types';
