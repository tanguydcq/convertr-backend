/**
 * Meta Ads Data Mappers
 * Transforms Meta API responses to internal domain models
 */

import { Prisma } from '@prisma/client';
import { MetaLead, MetaLeadInternal, MetaFieldData } from './meta.types.js';

/**
 * Extract a field value from Meta lead field_data array
 */
function extractField(fieldData: MetaFieldData[], ...fieldNames: string[]): string | null {
    for (const name of fieldNames) {
        const field = fieldData.find((f: MetaFieldData) => f.name.toLowerCase() === name.toLowerCase());
        if (field && field.values.length > 0 && field.values[0]) {
            return field.values[0];
        }
    }
    return null;
}

/**
 * Convert all field_data to a flat object
 */
function fieldDataToRecord(fieldData: MetaFieldData[]): Record<string, string> {
    return fieldData.reduce(
        (acc: Record<string, string>, field: MetaFieldData) => {
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
    organisationId: string,
): Prisma.LeadCreateInput {
    const internal = mapMetaLeadToInternal(metaLead);

    // Split name into firstName and lastName
    const nameParts = internal.name.split(' ');
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || '';

    return {
        organisation: { connect: { id: organisationId } },
        firstName,
        lastName,
        email: internal.email,
        phone: internal.phone,
        company: internal.company,
        source: 'meta',
        status: 'new',
    };
}

/**
 * Map multiple Meta leads to Prisma create inputs
 */
export function mapMetaLeadsToPrismaInputs(
    metaLeads: MetaLead[],
    organisationId: string,
): Prisma.LeadCreateInput[] {
    return metaLeads.map((lead) => mapMetaLeadToPrismaInput(lead, organisationId));
}
