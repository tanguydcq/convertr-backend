import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Set test environment variables
  process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long';
  process.env.JWT_EXPIRES_IN = '15m';
  process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Export for use in tests
export { prisma };
