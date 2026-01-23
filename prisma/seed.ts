import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password.js';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean up existing data
  await prisma.lead.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.externalCredential.deleteMany();
  await prisma.authLog.deleteMany();
  await prisma.account.deleteMany();

  const passwordHash = await hashPassword('password123');

  // --- 1. Create Main Test Account (Acme Corp) ---
  const acmeAccount = await prisma.account.create({
    data: {
      name: 'Acme Corp',
      email: 'admin@acmecorp.com',
      passwordHash,
      leads: {
        create: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            source: 'website',
            status: 'new',
            company: 'TechCorp',
          },
          {
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@example.com',
            source: 'linkedin',
            status: 'contacted',
            company: 'BizInc',
          },
        ],
      },
    },
  });

  console.log(`Created main account: ${acmeAccount.name} (${acmeAccount.email})`);

  // --- 2. Generate Random Accounts and Leads ---
  const NUM_ACCOUNTS = 15;
  const MIN_LEADS_PER_ACCOUNT = 20;
  const MAX_LEADS_PER_ACCOUNT = 50;

  console.log(`Generating ${NUM_ACCOUNTS} random accounts with leads...`);

  for (let i = 0; i < NUM_ACCOUNTS; i++) {
    const companyName = faker.company.name();
    const firstName = faker.person.firstName();

    // Create Account
    const account = await prisma.account.create({
      data: {
        name: companyName,
        email: faker.internet.email({ firstName, provider: companyName.toLowerCase().replace(/[^a-z]/g, '') + '.com' }),
        passwordHash,
      },
    });

    // Generate Leads for this Account
    const numLeads = faker.number.int({ min: MIN_LEADS_PER_ACCOUNT, max: MAX_LEADS_PER_ACCOUNT });
    const leadsData = [];

    for (let j = 0; j < numLeads; j++) {
      leadsData.push({
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        company: faker.company.name(),
        source: faker.helpers.arrayElement(['website', 'linkedin', 'referral', 'cold_call', 'ad_campaign']),
        status: faker.helpers.arrayElement(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed', 'lost']),
        accountId: account.id,
      });
    }

    await prisma.lead.createMany({
      data: leadsData,
    });

    // console.log(`  - Created account "${companyName}" with ${numLeads} leads.`);
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
