import prisma from '../../lib/prisma.js';
import { Tenant } from '@prisma/client';

export interface TenantDTO {
  id: string;
  name: string;
  createdAt: Date;
  userCount?: number;
}

class AdminService {
  /**
   * Create a new tenant
   */
  async createTenant(name: string): Promise<TenantDTO> {
    const tenant = await prisma.tenant.create({
      data: { name },
    });

    return this.toDTO(tenant);
  }

  /**
   * Get all tenants with user counts
   */
  async getAllTenants(): Promise<TenantDTO[]> {
    const tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tenants.map((tenant) => ({
      ...this.toDTO(tenant),
      userCount: tenant._count.users,
    }));
  }

  /**
   * Get a single tenant by ID
   */
  async getTenantById(id: string): Promise<TenantDTO | null> {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!tenant) {
      return null;
    }

    return {
      ...this.toDTO(tenant),
      userCount: tenant._count.users,
    };
  }

  /**
   * Delete a tenant (and all associated data)
   */
  async deleteTenant(id: string): Promise<void> {
    await prisma.tenant.delete({
      where: { id },
    });
  }

  private toDTO(tenant: Tenant): TenantDTO {
    return {
      id: tenant.id,
      name: tenant.name,
      createdAt: tenant.createdAt,
    };
  }
}

export const adminService = new AdminService();
