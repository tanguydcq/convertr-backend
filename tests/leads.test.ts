import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { setupTestData, cleanupTestData, TestData } from './helpers';

describe('Leads API', () => {
    let app: FastifyInstance;
    let testData: TestData;
    let accountToken: string;
    let otherAccountToken: string;

    beforeAll(async () => {
        app = await buildApp();
        await app.ready();
        testData = await setupTestData();

        // Login as account 1
        const t1Response = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: {
                email: testData.account.email,
                password: testData.account.password,
            },
        });
        accountToken = JSON.parse(t1Response.body).accessToken;

        // Login as account 2
        const t2Response = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: {
                email: testData.otherAccount.email,
                password: testData.otherAccount.password,
            },
        });
        otherAccountToken = JSON.parse(t2Response.body).accessToken;
    });

    afterAll(async () => {
        await cleanupTestData();
        await app.close();
    });

    // ==========================================
    // GET /api/leads - List Leads
    // ==========================================
    describe('GET /api/leads', () => {
        it('should return paginated leads for account 1', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/leads',
                headers: { Authorization: `Bearer ${accountToken}` },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);

            expect(body).toHaveProperty('leads');
            expect(body).toHaveProperty('total');
            expect(body).toHaveProperty('page');
            expect(body).toHaveProperty('limit');
            expect(body).toHaveProperty('hasMore');
            expect(body.page).toBe(1);
            expect(body.limit).toBe(20);
            expect(body.leads.length).toBe(2); // Account 1 has 2 leads
        });

        it('should return only leads for account 2', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/leads',
                headers: { Authorization: `Bearer ${otherAccountToken}` },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);

            expect(body.leads.length).toBe(1); // Account 2 has 1 lead
            expect(body.leads[0].firstName).toBe('Lead');
            expect(body.leads[0].lastName).toBe('Three');
        });

        it('should support pagination with page and limit', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/leads?page=1&limit=1',
                headers: { Authorization: `Bearer ${accountToken}` },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);

            expect(body.leads.length).toBe(1);
            expect(body.page).toBe(1);
            expect(body.limit).toBe(1);
            expect(body.total).toBe(2);
            expect(body.hasMore).toBe(true);
        });

        it('should fail without authentication', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/leads',
            });

            expect(response.statusCode).toBe(401);
        });
    });

    // ==========================================
    // GET /api/leads/:id - Get Lead by ID
    // ==========================================
    describe('GET /api/leads/:id', () => {
        let leadId: string;

        beforeAll(async () => {
            // Get a lead ID from account 1
            const response = await app.inject({
                method: 'GET',
                url: '/api/leads',
                headers: { Authorization: `Bearer ${accountToken}` },
            });
            const body = JSON.parse(response.body);
            leadId = body.leads[0].id;
        });

        it('should return a specific lead', async () => {
            const response = await app.inject({
                method: 'GET',
                url: `/api/leads/${leadId}`,
                headers: { Authorization: `Bearer ${accountToken}` },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);

            expect(body.id).toBe(leadId);
            expect(body).toHaveProperty('firstName');
            expect(body).toHaveProperty('lastName');
            expect(body).toHaveProperty('email');
            expect(body).toHaveProperty('status');
            expect(body).toHaveProperty('source');
        });

        it('should not allow account 2 to access account 1 lead', async () => {
            const response = await app.inject({
                method: 'GET',
                url: `/api/leads/${leadId}`,
                headers: { Authorization: `Bearer ${otherAccountToken}` },
            });

            expect(response.statusCode).toBe(404);
        });

        it('should return 404 for non-existent lead', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/leads/00000000-0000-0000-0000-000000000000',
                headers: { Authorization: `Bearer ${accountToken}` },
            });

            expect(response.statusCode).toBe(404);
        });
    });

    // ==========================================
    // POST /api/leads - Create Lead
    // ==========================================
    describe('POST /api/leads', () => {
        it('should create a new lead', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/leads',
                headers: { Authorization: `Bearer ${accountToken}` },
                payload: {
                    firstName: 'New',
                    lastName: 'Lead',
                    email: 'newlead@test.com',
                    phone: '+33612345678',
                    company: 'Test Company',
                    source: 'manual',
                },
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);

            expect(body).toHaveProperty('id');
            expect(body.firstName).toBe('New');
            expect(body.lastName).toBe('Lead');
            expect(body.email).toBe('newlead@test.com');
            expect(body.phone).toBe('+33612345678');
            expect(body.company).toBe('Test Company');
            expect(body.source).toBe('manual');
            expect(body.status).toBe('new');
        });

        it('should create lead with minimal data', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/leads',
                headers: { Authorization: `Bearer ${accountToken}` },
                payload: {
                    firstName: 'Minimal',
                    lastName: 'Test',
                    email: 'minimal@test.com',
                },
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);

            expect(body.firstName).toBe('Minimal');
            expect(body.source).toBe('manual'); // Default value
        });

        it('should fail without required fields', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/leads',
                headers: { Authorization: `Bearer ${accountToken}` },
                payload: {
                    firstName: 'Missing',
                    // Missing lastName and email
                },
            });

            expect(response.statusCode).toBe(400);
        });

        it('should fail with invalid email format', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/leads',
                headers: { Authorization: `Bearer ${accountToken}` },
                payload: {
                    firstName: 'Test',
                    lastName: 'User',
                    email: 'not-an-email',
                },
            });

            expect(response.statusCode).toBe(400);
        });

        it('should fail without authentication', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/leads',
                payload: {
                    firstName: 'Test',
                    lastName: 'User',
                    email: 'test@test.com',
                },
            });

            expect(response.statusCode).toBe(401);
        });

        it('created lead should be visible in list', async () => {
            // Create a lead with unique email
            const uniqueEmail = `unique-${Date.now()}@test.com`;
            await app.inject({
                method: 'POST',
                url: '/api/leads',
                headers: { Authorization: `Bearer ${accountToken}` },
                payload: {
                    firstName: 'Unique',
                    lastName: 'Lead',
                    email: uniqueEmail,
                },
            });

            // Verify it's in the list
            const listResponse = await app.inject({
                method: 'GET',
                url: '/api/leads',
                headers: { Authorization: `Bearer ${accountToken}` },
            });

            const body = JSON.parse(listResponse.body);
            const found = body.leads.find((l: any) => l.email === uniqueEmail);
            expect(found).toBeDefined();
        });
    });

    // ==========================================
    // Multi-tenancy Isolation (Account Isolation)
    // ==========================================
    describe('Multi-tenancy Isolation', () => {
        it('account 1 cannot see account 2 leads in list', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/leads',
                headers: { Authorization: `Bearer ${accountToken}` },
            });

            const body = JSON.parse(response.body);
            const account2Lead = body.leads.find((l: any) => l.lastName === 'Three');
            expect(account2Lead).toBeUndefined();
        });

        it('created leads are isolated per account', async () => {
            // Create lead as account 1
            const createResponse = await app.inject({
                method: 'POST',
                url: '/api/leads',
                headers: { Authorization: `Bearer ${accountToken}` },
                payload: {
                    firstName: 'Isolated',
                    lastName: 'Lead',
                    email: 'isolated@account1.com',
                },
            });

            const createdId = JSON.parse(createResponse.body).id;

            // Account 2 should not be able to access it
            const getResponse = await app.inject({
                method: 'GET',
                url: `/api/leads/${createdId}`,
                headers: { Authorization: `Bearer ${otherAccountToken}` },
            });

            expect(getResponse.statusCode).toBe(404);
        });
    });
});
