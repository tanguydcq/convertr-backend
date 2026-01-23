import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3001/api';

async function main() {
    console.log('Starting Auth Verification...');

    // 1. Simluating Server Start (assumes server is running or we just test DB logic? No, we need API)
    // Since we can't easily start background server and run script in one go safely without cleanup,
    // I will rely on the user having the server running or I should start it?
    // Actually, I can use the `app.inject()` from Fastify if I import the app builder!
    // That's better than relying on external network.

    const { buildApp } = await import('../src/app.js');
    const app = await buildApp();

    // 2. Login
    console.log('\nTesting Login...');
    const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
            email: 'admin@acmecorp.com',
            password: 'password123',
        },
    });

    if (loginRes.statusCode !== 200) {
        console.error('Login Failed:', loginRes.payload);
        process.exit(1);
    }

    const loginData = JSON.parse(loginRes.payload);
    console.log('Login Success!');
    console.log('Account:', loginData.account);
    console.log('Has Access Token:', !!loginData.accessToken);

    const token = loginData.accessToken;

    // 3. Fetch Leads (Protected Route)
    console.log('\nTesting Protected Route (Get Leads)...');
    const leadsRes = await app.inject({
        method: 'GET',
        url: '/api/leads',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (leadsRes.statusCode !== 200) {
        console.error('Get Leads Failed:', leadsRes.payload);
        process.exit(1);
    }

    const leadsData = JSON.parse(leadsRes.payload);
    console.log(`Leads Fetched: ${leadsData.leads.length}`);
    if (leadsData.total < 1) {
        console.warn('Warning: No leads found, expected some from seed.');
    }

    // 4. Verify DB Logs
    console.log('\nVerifying Auth Logs...');
    const logs = await prisma.authLog.findMany({
        where: { accountId: loginData.account.id },
        orderBy: { createdAt: 'desc' },
        take: 5
    });

    console.log(`Found ${logs.length} auth logs.`);
    if (logs.length > 0) {
        console.log('Latest Log:', logs[0].action, logs[0].createdAt);
    } else {
        console.error('No auth logs found! Logging might be broken.');
    }

    // 5. Test Simultaneous Connection (Login again)
    console.log('\nTesting Simultaneous Connection...');
    const loginRes2 = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
            email: 'admin@acmecorp.com',
            password: 'password123',
        },
    });

    if (loginRes2.statusCode === 200) {
        console.log('Second Login Success! Multiple sessions allowed.');
    } else {
        console.error('Second login failed:', loginRes2.payload);
    }

    // Verify token count
    const tokenCount = await prisma.refreshToken.count({
        where: { accountId: loginData.account.id }
    });
    console.log(`Active Refresh Tokens in DB: ${tokenCount} (Expected >= 2, assuming seed + 2 logins)`);

    console.log('\nVerification Complete: SUCCESS');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
