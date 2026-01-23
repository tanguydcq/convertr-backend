
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
    });
    console.log('DB Leads Sample:', JSON.stringify(leads, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
