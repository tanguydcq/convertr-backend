
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const john = await prisma.lead.findFirst({
        where: { email: 'john.doe@example.com' }
    });
    console.log('John Doe DB:', JSON.stringify(john, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
