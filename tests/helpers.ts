import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

export interface TestUser {
  id: string;
  email: string;
  password: string;
  role: string;
  tenantId: string | null;
}

export interface TestData {
  tenant: { id: string; name: string };
  tenant2: { id: string; name: string };
  superAdmin: TestUser;
  clientAdmin: TestUser;
  clientUser: TestUser;
  otherTenantUser: TestUser;
}

export async function setupTestData(): Promise<TestData> {
  // Clean existing data
  await prisma.refreshToken.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // Create tenants
  const tenant = await prisma.tenant.create({
    data: { name: 'Test Tenant 1' },
  });

  const tenant2 = await prisma.tenant.create({
    data: { name: 'Test Tenant 2' },
  });


  // Create SUPER_ADMIN
  const superAdminPassword = 'SuperAdmin123!';
  const superAdmin = await prisma.user.create({
    data: {
      email: 'super@test.com',
      passwordHash: await argon2.hash(superAdminPassword),
      role: 'SUPER_ADMIN',
      tenantId: null,
    },
  });

  // Create CLIENT_ADMIN
  const clientAdminPassword = 'ClientAdmin123!';
  const clientAdmin = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      passwordHash: await argon2.hash(clientAdminPassword),
      role: 'CLIENT_ADMIN',
      tenantId: tenant.id,
    },
  });

  // Create CLIENT_USER
  const clientUserPassword = 'ClientUser123!';
  const clientUser = await prisma.user.create({
    data: {
      email: 'user@test.com',
      passwordHash: await argon2.hash(clientUserPassword),
      role: 'CLIENT_USER',
      tenantId: tenant.id,
    },
  });

  // Create user in second tenant (for isolation tests)
  const otherTenantUserPassword = 'OtherUser123!';
  const otherTenantUser = await prisma.user.create({
    data: {
      email: 'other@test.com',
      passwordHash: await argon2.hash(otherTenantUserPassword),
      role: 'CLIENT_USER',
      tenantId: tenant2.id,
    },
  });

  // Create sample leads for tenant 1
  await prisma.lead.createMany({
    data: [
      { firstName: 'Lead', lastName: 'One', email: 'lead1@test.com', tenantId: tenant.id },
      { firstName: 'Lead', lastName: 'Two', email: 'lead2@test.com', tenantId: tenant.id },
    ],
  });

  // Create sample leads for tenant 2
  await prisma.lead.createMany({
    data: [
      { firstName: 'Lead', lastName: 'Three', email: 'lead3@test.com', tenantId: tenant2.id },
    ],
  });

  return {
    tenant: { id: tenant.id, name: tenant.name },
    tenant2: { id: tenant2.id, name: tenant2.name },
    superAdmin: {
      id: superAdmin.id,
      email: superAdmin.email,
      password: superAdminPassword,
      role: superAdmin.role,
      tenantId: superAdmin.tenantId,
    },
    clientAdmin: {
      id: clientAdmin.id,
      email: clientAdmin.email,
      password: clientAdminPassword,
      role: clientAdmin.role,
      tenantId: clientAdmin.tenantId,
    },
    clientUser: {
      id: clientUser.id,
      email: clientUser.email,
      password: clientUserPassword,
      role: clientUser.role,
      tenantId: clientUser.tenantId,
    },
    otherTenantUser: {
      id: otherTenantUser.id,
      email: otherTenantUser.email,
      password: otherTenantUserPassword,
      role: otherTenantUser.role,
      tenantId: otherTenantUser.tenantId,
    },
  };
}

export async function cleanupTestData(): Promise<void> {
  await prisma.refreshToken.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
}

export async function getRefreshTokenCount(userId: string): Promise<number> {
  return prisma.refreshToken.count({ where: { userId } });
}

export { prisma };
