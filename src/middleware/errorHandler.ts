import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { config } from '../config';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error in development
  if (config.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid request data',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Handle known errors with status codes
  if (err.statusCode) {
    res.status(err.statusCode).json({
      error: err.name || 'Error',
      message: err.message,
    });
    return;
  }

  // Handle Prisma errors
  if (err.code?.startsWith('P')) {
    switch (err.code) {
      case 'P2002':
        res.status(409).json({
          error: 'Conflict',
          message: 'A record with this value already exists',
        });
        return;
      case 'P2025':
        res.status(404).json({
          error: 'Not Found',
          message: 'Record not found',
        });
        return;
      default:
        res.status(500).json({
          error: 'Database Error',
          message: 'A database error occurred',
        });
        return;
    }
  }

  // Default to 500 for unknown errors
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message,
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
  });
}
