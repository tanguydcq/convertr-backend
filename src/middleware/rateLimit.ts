// Rate limiting is now configured directly in app.ts using @fastify/rate-limit
// This file provides auth-specific rate limit config

import { config } from '../config/index.js';

/**
 * Auth rate limit configuration
 * Used for login/register endpoints to prevent brute force attacks
 */
export const authRateLimitConfig = {
  max: config.RATE_LIMIT_MAX_REQUESTS,
  timeWindow: config.RATE_LIMIT_WINDOW_MS,
  errorResponseBuilder: () => ({
    error: 'Too Many Requests',
    message: 'Too many login attempts. Please try again later.',
  }),
  // Skip rate limiting in test environment
  skip: () => config.NODE_ENV === 'test',
};

/**
 * API rate limit configuration
 * More permissive than auth limiter
 */
export const apiRateLimitConfig = {
  max: 100,
  timeWindow: 60 * 1000, // 1 minute
  errorResponseBuilder: () => ({
    error: 'Too Many Requests',
    message: 'Too many requests. Please slow down.',
  }),
  skip: () => config.NODE_ENV === 'test',
};
