// Error handling is now done in app.ts using Fastify's built-in error handler
// This file is kept for backwards compatibility and custom error types

import { ZodError } from 'zod';
import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config/index.js';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Fastify error handler
 * Handles ZodError, Prisma errors, and generic errors
 */
export function errorHandler(
  error: FastifyError | AppError | ZodError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  // Log error in development
  if (config.NODE_ENV === 'development') {
    request.log.error(error);
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    reply.status(400).send({
      error: 'Validation Error',
      message: 'Invalid request data',
      details: error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  const appError = error as AppError;

  // Handle known errors with status codes
  if (appError.statusCode) {
    reply.status(appError.statusCode).send({
      error: appError.name || 'Error',
      message: appError.message,
    });
    return;
  }

  // Handle Prisma errors
  if (appError.code?.startsWith('P')) {
    switch (appError.code) {
      case 'P2002':
        reply.status(409).send({
          error: 'Conflict',
          message: 'A record with this value already exists',
        });
        return;
      case 'P2025':
        reply.status(404).send({
          error: 'Not Found',
          message: 'Record not found',
        });
        return;
      default:
        reply.status(500).send({
          error: 'Database Error',
          message: 'A database error occurred',
        });
        return;
    }
  }

  // Default to 500 for unknown errors
  reply.status(500).send({
    error: 'Internal Server Error',
    message: config.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : appError.message,
  });
}

/**
 * Create a custom error with status code
 */
export function createError(statusCode: number, message: string): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  return error;
}
