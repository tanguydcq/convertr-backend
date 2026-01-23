import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from '../lib/jwt.js';

/**
 * Fastify preHandler hook for authentication
 * Verifies JWT token and attaches account to request
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'No authorization header provided',
    });
  }

  if (!authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid authorization header format. Use: Bearer <token>',
    });
  }

  const token = authHeader.substring(7);

  if (!token) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'No token provided',
    });
  }

  try {
    const decoded = verifyToken(token);

    request.account = {
      accountId: decoded.accountId,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Token has expired',
      });
    }

    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid token',
      });
    }

    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication failed',
    });
  }
}
