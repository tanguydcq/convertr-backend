import rateLimit from 'express-rate-limit';
import { config } from '../config';

/**
 * Rate limiter specifically for authentication endpoints.
 * Prevents brute force attacks on login.
 */
export const authRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS, // 15 minutes by default
  max: config.RATE_LIMIT_MAX_REQUESTS, // 5 requests by default
  message: {
    error: 'Too Many Requests',
    message: 'Too many login attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in test and development environment
  skip: () => config.NODE_ENV === 'test' || config.NODE_ENV === 'development',
});

/**
 * General API rate limiter.
 * More permissive than auth limiter.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.NODE_ENV === 'test',
});
