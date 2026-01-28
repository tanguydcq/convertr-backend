import { PrismaClient, Role } from '@prisma/client'
import { hashPassword } from '../src/lib/password.js'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // 1. Create Account
  const email = 'user@convertr.io'
  const account = await prisma.account.upsert({
    where: { email },
    update: {},
    create: {
      name: 'Demo User',
      email,
      passwordHash: await hashPassword('password123'), // Valid password for login
    },
  })
  console.log(`👤 Created Account: ${account.email}`)

  // 2. Create Organisation
  const orgSlug = 'demo-org'
  const organisation = await prisma.organisation.upsert({
    where: { slug: orgSlug },
    update: {},
    create: {
      name: 'Demo Organisation',
      slug: orgSlug,
    },
  })
  console.log(`🏢 Created Organisation: ${organisation.name}`)

  // 3. Create Membership
  await prisma.membership.upsert({
    where: {
      accountId_organisationId: {
        accountId: account.id,
        organisationId: organisation.id,
      },
    },
    update: {},
    create: {
      accountId: account.id,
      organisationId: organisation.id,
      role: Role.OWNER,
    },
  })
  console.log(`🤝 Membership created`)

  // 4. Create Leads (CRM)
  // note: If RLS is enforced for the connection used by seeding, we need to bypass it or set context.
  // The default connection is usually admin/superuser which bypasses RLS by default on Postgres.
  // If not, we might need: await prisma.$executeRaw`SET app.org_id = '${organisation.id}'`

  // Checking if we need to set context (Preemptively doing it just in case non-superuser is used)
  // We wrap in a transaction if we needed strict session context, but here we just try direct create.

  try {
    const leadEmail = 'lead@example.com'
    // CRM tables access might be restricted if RLS is on and we are not superuser
    // Trying to set the variable for the current session:
    await prisma.$executeRawUnsafe(`SET app.org_id = '${organisation.id}';`)

    await prisma.lead.create({
      data: {
        organisationId: organisation.id,
        firstName: 'John',
        lastName: 'Doe',
        email: leadEmail,
        status: 'NEW_LEAD',
        source: 'seed',
        score: 50,
      },
    })
    console.log(`📈 Created Lead for Org 1: ${leadEmail}`)

    // 5. Create Second Organisation (competitor) to verify isolation
    const org2Slug = 'competitor-org'
    const org2 = await prisma.organisation.upsert({
      where: { slug: org2Slug },
      update: {},
      create: {
        name: 'Competitor Inc',
        slug: org2Slug,
      },
    })
    console.log(`🏢 Created Organisation 2: ${org2.name}`)

    // Create Lead for Org 2
    // Switch context for Org 2
    await prisma.$executeRawUnsafe(`SET app.org_id = '${org2.id}';`)

    await prisma.lead.create({
      data: {
        organisationId: org2.id,
        firstName: 'Secret',
        lastName: 'Agent',
        email: 'secret@competitor.com',
        status: 'NEW_LEAD',
        source: 'seed',
        score: 99,
      },
    })
    console.log(`🔒 Created Lead for Org 2: secret@competitor.com`)

  } catch (e) {
    console.warn('⚠️  Could not create lead (probably RLS restriction or duplicate). Error ignored for seed.', e);
  }

  console.log('✅ Seed finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
