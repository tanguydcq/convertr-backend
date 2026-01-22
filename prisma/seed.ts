import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  await prisma.refreshToken.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  console.log('✓ Cleaned existing data');

  // Create tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Acme Corp',
    },
  });
  console.log(`✓ Created tenant: ${tenant.name}`);

  // Hash passwords
  const superAdminPassword = await hashPassword('SuperAdmin123!');
  const clientAdminPassword = await hashPassword('ClientAdmin123!');
  const clientUserPassword = await hashPassword('ClientUser123!');

  // Create SUPER_ADMIN (no tenant - Convertr internal)
  const superAdmin = await prisma.user.create({
    data: {
      email: 'super@convertr.io',
      passwordHash: superAdminPassword,
      role: 'SUPER_ADMIN',
      tenantId: null,
    },
  });
  console.log(`✓ Created SUPER_ADMIN: ${superAdmin.email}`);

  // Create CLIENT_ADMIN
  const clientAdmin = await prisma.user.create({
    data: {
      email: 'admin@acme.com',
      passwordHash: clientAdminPassword,
      role: 'CLIENT_ADMIN',
      tenantId: tenant.id,
    },
  });
  console.log(`✓ Created CLIENT_ADMIN: ${clientAdmin.email}`);

  // Create CLIENT_USER
  const clientUser = await prisma.user.create({
    data: {
      email: 'user@acme.com',
      passwordHash: clientUserPassword,
      role: 'CLIENT_USER',
      tenantId: tenant.id,
    },
  });
  console.log(`✓ Created CLIENT_USER: ${clientUser.email}`);

  // Create sample leads for the tenant
  const leads = await prisma.lead.createMany({
    data: [
      {
        name: 'John Doe',
        email: 'john.doe@example.com',
        company: 'TechCorp',
        phone: '+1-555-0101',
        status: 'new',
        tenantId: tenant.id,
      },
      {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        company: 'StartupXYZ',
        phone: '+1-555-0102',
        status: 'contacted',
        tenantId: tenant.id,
      },
      {
        name: 'Bob Johnson',
        email: 'bob.johnson@example.com',
        company: 'Enterprise Ltd',
        phone: '+1-555-0103',
        status: 'qualified',
        tenantId: tenant.id,
      },
    ],
  });
  console.log(`✓ Created ${leads.count} sample leads`);

  console.log('\n✅ Database seeded successfully!');
  console.log('\n📋 Test Credentials:');
  console.log('  SUPER_ADMIN:  super@convertr.io / SuperAdmin123!');
  console.log('  CLIENT_ADMIN: admin@acme.com / ClientAdmin123!');
  console.log('  CLIENT_USER:  user@acme.com / ClientUser123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
