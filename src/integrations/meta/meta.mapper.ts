/**
 * Meta Ads Data Mappers
 * Transforms Meta API responses to internal domain models
 */

import { Prisma } from '@prisma/client';
import { MetaLead, MetaLeadInternal } from './meta.types';

/**
 * Extract a field value from Meta lead field_data array
 */
function extractField(fieldData: MetaLead['field_data'], ...fieldNames: string[]): string | null {
    for (const name of fieldNames) {
        const field = fieldData.find((f) => f.name.toLowerCase() === name.toLowerCase());
        if (field && field.values.length > 0 && field.values[0]) {
            return field.values[0];
        }
    }
    return null;
}

/**
 * Convert all field_data to a flat object
 */
function fieldDataToRecord(fieldData: MetaLead['field_data']): Record<string, string> {
    return fieldData.reduce(
        (acc, field) => {
            if (field.values.length > 0) {
                acc[field.name] = field.values[0];
            }
            return acc;
        },
        {} as Record<string, string>,
    );
}

/**
 * Map a Meta lead to our internal representation
 */
export function mapMetaLeadToInternal(metaLead: MetaLead): MetaLeadInternal {
    const fields = fieldDataToRecord(metaLead.field_data);

    // Try common field name variations
    const firstName = extractField(metaLead.field_data, 'first_name', 'firstname', 'prenom');
    const lastName = extractField(metaLead.field_data, 'last_name', 'lastname', 'nom');
    const fullName = extractField(metaLead.field_data, 'full_name', 'fullname', 'name', 'nom_complet');

    const name = fullName || [firstName, lastName].filter(Boolean).join(' ') || 'Unknown';

    return {
        externalId: metaLead.id,
        name,
        email: extractField(metaLead.field_data, 'email', 'mail', 'e-mail') || '',
        phone: extractField(metaLead.field_data, 'phone_number', 'phone', 'telephone', 'tel'),
        company: extractField(metaLead.field_data, 'company', 'company_name', 'entreprise', 'societe'),
        campaignName: metaLead.campaign_name || null,
        formId: metaLead.form_id,
        createdAt: new Date(metaLead.created_time),
        rawFields: fields,
    };
}

/**
 * Map a Meta lead directly to Prisma Lead create input
 */
export function mapMetaLeadToPrismaInput(
    metaLead: MetaLead,
    tenantId: string,
): Prisma.LeadCreateInput {
    const internal = mapMetaLeadToInternal(metaLead);

    return {
        tenant: { connect: { id: tenantId } },
        name: internal.name,
        email: internal.email,
        phone: internal.phone,
        company: internal.company,
        status: 'NEW',
        // Note: You may want to add these fields to your Prisma schema:
        // source: 'META_ADS',
        // externalId: internal.externalId,
        // metadata: internal.rawFields,
    };
}

/**
 * Map multiple Meta leads to Prisma create inputs
 */
export function mapMetaLeadsToPrismaInputs(
    metaLeads: MetaLead[],
    tenantId: string,
): Prisma.LeadCreateInput[] {
    return metaLeads.map((lead) => mapMetaLeadToPrismaInput(lead, tenantId));
}
