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
  source?: string;
}

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
   * Get leads for a specific tenant with pagination
   */
  async getLeadsByTenant(
    tenantId: string,
    pagination: PaginationParams
  ): Promise<PaginatedLeads> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where: { tenantId } }),
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
   * Get all leads (for SUPER_ADMIN) with pagination
   */
  async getAllLeads(pagination: PaginationParams): Promise<PaginatedLeads & { leads: (LeadDTO & { tenantId: string })[] }> {
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
        tenantId: lead.tenantId,
      })),
      total,
      page,
      limit,
      hasMore: skip + leads.length < total,
    };
  }

  /**
   * Get a single lead by ID and tenant
   */
  async getLeadById(id: string, tenantId: string | null): Promise<LeadDTO | null> {
    const where = tenantId ? { id, tenantId } : { id };

    const lead = await prisma.lead.findFirst({ where });

    return lead ? this.toDTO(lead) : null;
  }

  /**
   * Create a new lead for a tenant
   */
  async createLead(tenantId: string, input: CreateLeadInput): Promise<LeadDTO> {
    const lead = await prisma.lead.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone ?? null,
        company: input.company ?? null,
        source: input.source ?? 'manual',
        tenantId,
      },
    });

    return this.toDTO(lead);
  }

  private toDTO(lead: Lead): LeadDTO {
    return {
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      source: lead.source,
      status: lead.status,
      createdAt: lead.createdAt,
    };
  }
}

export const leadsService = new LeadsService();
