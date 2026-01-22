import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No authorization header provided',
      });
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid authorization header format. Use: Bearer <token>',
      });
      return;
    }

    const token = authHeader.substring(7);

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided',
      });
      return;
    }

    const decoded = verifyToken(token);

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      tenantId: decoded.tenantId,
    };

    next();
  } catch (error) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Token has expired',
      });
      return;
    }

    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token',
      });
      return;
    }

    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed',
    });
  }
}
