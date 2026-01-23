import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { setupTestData, cleanupTestData, TestData } from './helpers';

describe('Authentication API', () => {
  let app: FastifyInstance;
  let testData: TestData;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    testData = await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testData.account.email,
          password: testData.account.password,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
      expect(body).toHaveProperty('expiresIn');
      expect(body.account).toHaveProperty('id');
      expect(body.account.email).toBe(testData.account.email);
      expect(body.account.name).toBe(testData.account.name);
    });

    it('should fail with invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'nonexistent@test.com',
          password: 'anypassword',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should fail with invalid password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testData.account.email,
          password: 'wrongpassword',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should fail with missing email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          password: 'anypassword',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testData.account.email,
          password: testData.account.password,
        },
      });
      refreshToken = JSON.parse(loginResponse.body).refreshToken;
    });

    it('should refresh tokens with valid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: { refreshToken },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
      expect(body.refreshToken).not.toBe(refreshToken); // Token rotation

      // Update for subsequent tests
      refreshToken = body.refreshToken;
    });

    it('should fail with invalid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: { refreshToken: 'invalid-token' },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout and invalidate refresh token', async () => {
      // Login first
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testData.account.email,
          password: testData.account.password,
        },
      });

      const refreshToken = JSON.parse(loginResponse.body).refreshToken;

      // Logout
      const logoutResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        payload: { refreshToken },
      });

      expect(logoutResponse.statusCode).toBe(200);

      // Try to use the invalidated refresh token
      const refreshResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: { refreshToken },
      });

      expect(refreshResponse.statusCode).toBe(401);
    });
  });

  describe('GET /me', () => {
    let accessToken: string;

    beforeAll(async () => {
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testData.account.email,
          password: testData.account.password,
        },
      });
      accessToken = JSON.parse(loginResponse.body).accessToken;
    });

    it('should return current account profile with valid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.email).toBe(testData.account.email);
      expect(body.name).toBe(testData.account.name);
      expect(body.id).toBe(testData.account.id);
    });

    it('should fail without authorization header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should fail with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { Authorization: 'Bearer invalid-token' },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body).toHaveProperty('timestamp');
    });
  });
});
