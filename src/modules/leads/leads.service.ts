import { Lead } from '@prisma/client';
import { withRLS } from '../../lib/rls.js';


// DTO for API responses
export interface LeadDTO {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  company: string | null;
  budget: number | null;
  score: number;
  source: string;
  status: string;
  createdAt: Date;
}

// Input for creating a lead
export interface CreateLeadInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  budget?: number;
  score?: number;
  source?: string;
  status?: string;
}

// Input for updating a lead
export interface UpdateLeadInput extends Partial<CreateLeadInput> { }

// Pagination params
export interface PaginationParams {
  page: number;
  limit: number;
}

// Paginated response
export interface PaginatedLeads {
  leads: LeadDTO[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

class LeadsService {
  /**
   * Get leads for a specific organisation with pagination
   * USES RLS: The query is wrapped in a transaction that sets app.org_id
   */
  async getLeadsByOrganisation(
    organisationId: string,
    pagination: PaginationParams
  ): Promise<PaginatedLeads> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    return withRLS(organisationId, async (tx) => {
      // Note: We MUST filter by organisationId in the WHERE clause even with RLS 
      // because RLS is a safety net, but explicit filtering is better for performance optimization queries.
      // However, if RLS works, even `where: {}` would return only the org's leads.
      // Let's rely on both for safety + explicitness.
      const [leads, total] = await Promise.all([
        tx.lead.findMany({
          where: { organisationId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        tx.lead.count({ where: { organisationId } }),
      ]);

      return {
        leads: leads.map(this.toDTO),
        total,
        page,
        limit,
        hasMore: skip + leads.length < total,
      };
    });
  }

  /**
   * Get a single lead by ID and organisation
   */
  async getLeadById(id: string, organisationId: string): Promise<LeadDTO | null> {
    return withRLS(organisationId, async (tx) => {
      const lead = await tx.lead.findFirst({
        where: {
          id,
          organisationId
        }
      });

      return lead ? this.toDTO(lead) : null;
    });
  }

  /**
   * Create a new lead for an organisation
   */
  async createLead(organisationId: string, input: CreateLeadInput): Promise<LeadDTO> {
    return withRLS(organisationId, async (tx) => {
      const lead = await tx.lead.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone ?? null,
          company: input.company ?? null,
          budget: input.budget ?? null,
          score: input.score ?? 0,
          source: input.source ?? 'manual',
          status: input.status ?? 'NEW_LEAD',
          organisationId,
        },
      });

      return this.toDTO(lead);
    });
  }

  async updateLead(organisationId: string, leadId: string, input: UpdateLeadInput): Promise<LeadDTO> {
    return withRLS(organisationId, async (tx) => {
      // Check existence first within RLS context
      const lead = await tx.lead.findUnique({
        where: { id: leadId },
      });

      if (!lead || lead.organisationId !== organisationId) {
        throw new Error('Lead not found');
      }

      const updatedLead = await tx.lead.update({
        where: { id: leadId },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          company: input.company,
          budget: input.budget,
          score: input.score,
          status: input.status,
        },
      });

      return this.toDTO(updatedLead);
    });
  }

  async deleteLead(organisationId: string, leadId: string): Promise<void> {
    return withRLS(organisationId, async (tx) => {
      const lead = await tx.lead.findUnique({
        where: { id: leadId },
      });

      if (!lead || lead.organisationId !== organisationId) {
        throw new Error('Lead not found'); // Generic error to not leak existence
      }

      await tx.lead.delete({
        where: { id: leadId },
      });
    });
  }

  private toDTO(lead: Lead): LeadDTO {
    return {
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      budget: lead.budget,
      score: lead.score,
      source: lead.source,
      status: lead.status,
      createdAt: lead.createdAt,
    };
  }
}

export const leadsService = new LeadsService();
