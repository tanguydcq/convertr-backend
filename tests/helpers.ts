import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

export interface TestAccount {
  id: string;
  email: string;
  password: string;
  name: string;
}

export interface TestData {
  account: TestAccount;
  otherAccount: TestAccount;
}

export async function setupTestData(): Promise<TestData> {
  // Clean existing data
  await prisma.refreshToken.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.externalCredential.deleteMany();
  await prisma.authLog.deleteMany();
  await prisma.account.deleteMany();

  // Create main account
  const accountPassword = 'AccountPassword123!';
  const account = await prisma.account.create({
    data: {
      name: 'Acme Corp',
      email: 'acme@test.com',
      passwordHash: await argon2.hash(accountPassword),
    },
  });

  // Create second account (for isolation tests)
  const otherAccountPassword = 'OtherPassword123!';
  const otherAccount = await prisma.account.create({
    data: {
      name: 'Other Corp',
      email: 'other@test.com',
      passwordHash: await argon2.hash(otherAccountPassword),
    },
  });

  // Create sample leads for main account
  await prisma.lead.createMany({
    data: [
      { firstName: 'Lead', lastName: 'One', email: 'lead1@test.com', accountId: account.id },
      { firstName: 'Lead', lastName: 'Two', email: 'lead2@test.com', accountId: account.id },
    ],
  });

  // Create sample leads for other account
  await prisma.lead.createMany({
    data: [
      { firstName: 'Lead', lastName: 'Three', email: 'lead3@test.com', accountId: otherAccount.id },
    ],
  });

  return {
    account: {
      id: account.id,
      email: account.email,
      name: account.name,
      password: accountPassword,
    },
    otherAccount: {
      id: otherAccount.id,
      email: otherAccount.email,
      name: otherAccount.name,
      password: otherAccountPassword,
    },
  };
}

export async function cleanupTestData(): Promise<void> {
  await prisma.refreshToken.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.externalCredential.deleteMany();
  await prisma.authLog.deleteMany();
  await prisma.account.deleteMany();
}

export async function getRefreshTokenCount(accountId: string): Promise<number> {
  return prisma.refreshToken.count({ where: { accountId } });
}

export { prisma };

