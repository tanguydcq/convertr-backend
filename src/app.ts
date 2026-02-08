import Fastify, { FastifyInstance, FastifyError } from 'fastify';

// ... (existing imports, but we need to add metaRoutes import at top and registration here)
// Wait, I can't easily add import at top and code at bottom with one block if they are far apart.
// I'll do two replaces or one multi_replace.
// I'll use multi_replace.

import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { config } from './config/index.js';
import { authRoutes } from './modules/auth/index.js';
import { leadsRoutes } from './modules/leads/index.js';
import { adminRoutes } from './modules/admin/index.js';
import { metaRoutes } from './integrations/meta/index.js';
import { googleAdsRoutes } from './modules/google-ads/google-ads.routes.js';

// Extend Fastify types (see src/types/fastify.d.ts)

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: config.NODE_ENV === 'development' ? {
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    } : true,
    ajv: {
      customOptions: {
        strict: 'log',
        keywords: ['kind', 'modifier'],
      },
    },
  });

  // Register CORS
  await app.register(cors, {
    origin: config.CORS_ORIGIN,
    credentials: true,
  });

  // Register cookie parser
  await app.register(cookie);

  // Register rate limiter
  await app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX_REQUESTS,
    timeWindow: config.RATE_LIMIT_WINDOW_MS,
    errorResponseBuilder: () => ({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    }),
  });

  // Health check endpoint
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  }));

  // API Routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(leadsRoutes, { prefix: '/api/leads' });
  await app.register(adminRoutes, { prefix: '/api/admin' });
  await app.register(metaRoutes, { prefix: '/api/integrations/meta' });
  await app.register(googleAdsRoutes, { prefix: '/api/integrations/google' });

  // Global error handler
  app.setErrorHandler((error: FastifyError, request, reply) => {
    const statusCode = error.statusCode || 500;

    // Log server errors
    if (statusCode >= 500) {
      request.log.error(error);
    }

    reply.status(statusCode).send({
      error: error.name || 'Internal Server Error',
      message: error.message || 'An unexpected error occurred',
      ...(config.NODE_ENV === 'development' && { stack: error.stack }),
    });
  });

  // 404 handler
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
    });
  });

  return app;
}

export default buildApp;
