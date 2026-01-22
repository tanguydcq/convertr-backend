import request from 'supertest';
import { createApp } from '../src/app';
import { setupTestData, cleanupTestData, TestData } from './helpers';
import { Express } from 'express';

describe('Authentication API', () => {
  let app: Express;
  let testData: TestData;

  beforeAll(async () => {
    app = createApp();
    testData = await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testData.clientAdmin.email,
          password: testData.clientAdmin.password,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(testData.clientAdmin.email);
      expect(response.body.user.role).toBe('CLIENT_ADMIN');
      expect(response.body.user.tenantId).toBe(testData.tenant.id);
    });

    it('should fail with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'anypassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('AuthError');
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should fail with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testData.clientAdmin.email,
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('AuthError');
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should fail with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'anypassword',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should fail with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'not-an-email',
          password: 'anypassword',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testData.clientUser.email,
          password: testData.clientUser.password,
        });
      refreshToken = loginResponse.body.refreshToken;
    });

    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.refreshToken).not.toBe(refreshToken); // Token rotation

      // Update for subsequent tests
      refreshToken = response.body.refreshToken;
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid refresh token');
    });

    it('should fail with missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout and invalidate refresh token', async () => {
      // Login first
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testData.clientUser.email,
          password: testData.clientUser.password,
        });

      const refreshToken = loginResponse.body.refreshToken;

      // Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.message).toBe('Logout successful');

      // Try to use the invalidated refresh token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(401);
    });
  });

  describe('GET /me', () => {
    let accessToken: string;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testData.clientAdmin.email,
          password: testData.clientAdmin.password,
        });
      accessToken = loginResponse.body.accessToken;
    });

    it('should return current user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.email).toBe(testData.clientAdmin.email);
      expect(response.body.role).toBe('CLIENT_ADMIN');
      expect(response.body.tenantId).toBe(testData.tenant.id);
      expect(response.body.tenant.name).toBe(testData.tenant.name);
    });

    it('should fail without authorization header', async () => {
      const response = await request(app).get('/api/me');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('No authorization header provided');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid token');
    });

    it('should fail with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/me')
        .set('Authorization', 'NotBearer token');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid authorization header format. Use: Bearer <token>');
    });
  });

  describe('GET /leads (Tenant Isolation)', () => {
    let tenant1Token: string;
    let tenant2Token: string;
    let superAdminToken: string;

    beforeAll(async () => {
      // Login as tenant 1 user
      const t1Response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testData.clientUser.email,
          password: testData.clientUser.password,
        });
      tenant1Token = t1Response.body.accessToken;

      // Login as tenant 2 user
      const t2Response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testData.otherTenantUser.email,
          password: testData.otherTenantUser.password,
        });
      tenant2Token = t2Response.body.accessToken;

      // Login as super admin
      const saResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testData.superAdmin.email,
          password: testData.superAdmin.password,
        });
      superAdminToken = saResponse.body.accessToken;
    });

    it('should return only leads for tenant 1', async () => {
      const response = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${tenant1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(2);
      response.body.leads.forEach((lead: any) => {
        expect(['Lead 1', 'Lead 2']).toContain(lead.name);
      });
    });

    it('should return only leads for tenant 2', async () => {
      const response = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${tenant2Token}`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
      expect(response.body.leads[0].name).toBe('Lead 3');
    });

    it('SUPER_ADMIN should see all leads', async () => {
      const response = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(3);
    });

    it('should not allow access without authentication', async () => {
      const response = await request(app).get('/api/leads');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /admin/tenants (Role-Based Access)', () => {
    let superAdminToken: string;
    let clientAdminToken: string;
    let clientUserToken: string;

    beforeAll(async () => {
      // Login as different roles
      const saResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testData.superAdmin.email,
          password: testData.superAdmin.password,
        });
      superAdminToken = saResponse.body.accessToken;

      const caResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testData.clientAdmin.email,
          password: testData.clientAdmin.password,
        });
      clientAdminToken = caResponse.body.accessToken;

      const cuResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testData.clientUser.email,
          password: testData.clientUser.password,
        });
      clientUserToken = cuResponse.body.accessToken;
    });

    it('SUPER_ADMIN should be able to create tenant', async () => {
      const response = await request(app)
        .post('/api/admin/tenants')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'New Test Tenant' });

      expect(response.status).toBe(201);
      expect(response.body.tenant.name).toBe('New Test Tenant');
    });

    it('CLIENT_ADMIN should be denied access', async () => {
      const response = await request(app)
        .post('/api/admin/tenants')
        .set('Authorization', `Bearer ${clientAdminToken}`)
        .send({ name: 'Another Tenant' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('CLIENT_USER should be denied access', async () => {
      const response = await request(app)
        .post('/api/admin/tenants')
        .set('Authorization', `Bearer ${clientUserToken}`)
        .send({ name: 'Another Tenant' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/admin/tenants')
        .send({ name: 'Another Tenant' });

      expect(response.status).toBe(401);
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});
