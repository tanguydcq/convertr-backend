
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const acme = await prisma.account.findUnique({ where: { email: 'admin@acmecorp.com' } });
    const random = await prisma.account.findFirst({ where: { NOT: { email: 'admin@acmecorp.com' } } });

    console.log(JSON.stringify({
        acme: { email: acme?.email, id: acme?.id },
        random: { email: random?.email, id: random?.id }
    }));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
