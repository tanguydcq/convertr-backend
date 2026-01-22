import prisma from '../../lib/prisma';
import { Lead } from '@prisma/client';

export interface LeadDTO {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  status: string;
  createdAt: Date;
}

class LeadsService {
  /**
   * Get all leads for a specific tenant
   */
  async getLeadsByTenant(tenantId: string): Promise<LeadDTO[]> {
    const leads = await prisma.lead.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return leads.map(this.toDTO);
  }

  /**
   * Get all leads (for SUPER_ADMIN)
   */
  async getAllLeads(): Promise<(LeadDTO & { tenantId: string })[]> {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return leads.map((lead) => ({
      ...this.toDTO(lead),
      tenantId: lead.tenantId,
    }));
  }

  /**
   * Get a single lead by ID and tenant
   */
  async getLeadById(id: string, tenantId: string | null): Promise<LeadDTO | null> {
    const where = tenantId ? { id, tenantId } : { id };
    
    const lead = await prisma.lead.findFirst({ where });

    return lead ? this.toDTO(lead) : null;
  }

  private toDTO(lead: Lead): LeadDTO {
    return {
      id: lead.id,
      name: lead.name,
      email: lead.email,
      company: lead.company,
      phone: lead.phone,
      status: lead.status,
      createdAt: lead.createdAt,
    };
  }
}

export const leadsService = new LeadsService();
