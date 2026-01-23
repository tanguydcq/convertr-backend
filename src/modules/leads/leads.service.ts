import prisma from '../../lib/prisma.js';
import { Lead } from '@prisma/client';

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
   * Get leads for a specific account with pagination
   */
  async getLeadsByAccount(
    accountId: string,
    pagination: PaginationParams
  ): Promise<PaginatedLeads> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where: { accountId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where: { accountId } }),
    ]);

    return {
      leads: leads.map(this.toDTO),
      total,
      page,
      limit,
      hasMore: skip + leads.length < total,
    };
  }

  /**
   * Get all leads (for system admin, if implemented later) with pagination
   */
  async getAllLeads(pagination: PaginationParams): Promise<PaginatedLeads & { leads: (LeadDTO & { accountId: string })[] }> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.lead.count(),
    ]);

    return {
      leads: leads.map((lead) => ({
        ...this.toDTO(lead),
        accountId: lead.accountId,
      })),
      total,
      page,
      limit,
      hasMore: skip + leads.length < total,
    };
  }

  /**
   * Get a single lead by ID and account
   */
  async getLeadById(id: string, accountId: string): Promise<LeadDTO | null> {
    // We enforce accountId check to ensure isolation
    const lead = await prisma.lead.findFirst({
      where: {
        id,
        accountId
      }
    });

    return lead ? this.toDTO(lead) : null;
  }

  /**
   * Create a new lead for an account
   */
  async createLead(accountId: string, input: CreateLeadInput): Promise<LeadDTO> {
    const lead = await prisma.lead.create({
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
        accountId,
      },
    });

    return this.toDTO(lead);
  }

  async updateLead(accountId: string, leadId: string, input: UpdateLeadInput): Promise<LeadDTO> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead || lead.accountId !== accountId) {
      throw new Error('Lead not found');
    }

    console.log(`[Service] Updating lead ${leadId} for account ${accountId}`);
    const updatedLead = await prisma.lead.update({
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
    console.log(`[Service] Update successful for lead ${leadId}`);

    return this.toDTO(updatedLead);
  }

  async deleteLead(accountId: string, leadId: string): Promise<void> {
    console.log(`[Service] Deleting lead ${leadId} for account ${accountId}`);
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead || lead.accountId !== accountId) {
      console.error(`[Service] Delete failed: Lead not found or unauthorized. Lead: ${lead?.id}, Account: ${lead?.accountId} vs ${accountId}`);
      throw new Error('Lead not found');
    }

    await prisma.lead.delete({
      where: { id: leadId },
    });
    console.log(`[Service] Delete successful for lead ${leadId}`);
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
