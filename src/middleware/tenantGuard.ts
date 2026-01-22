import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to ensure request is scoped to current user's tenant
 */
export const tenantGuard = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // SUPER_ADMIN can access everything
  if (req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  // Check if user has a tenant
  if (!req.user.tenantId) {
    return res.status(403).json({
      message: 'User does not belong to any tenant'
    });
  }

  // If request has tenantId param, verify match
  const { tenantId } = req.params;
  if (tenantId && tenantId !== req.user.tenantId) {
    // EXCEPT if SUPER_ADMIN
    if (req.user.role === 'SUPER_ADMIN') return next();

    return res.status(403).json({
      message: 'Access denied to this tenant'
    });
  }

  // Also check body tenantId if present
  if (req.body.tenantId && req.body.tenantId !== req.user.tenantId) {
    if (req.user.role === 'SUPER_ADMIN') return next();

    return res.status(403).json({
      message: 'Cannot modify resources of another tenant'
    });
  }

  next();
};

/**
 * Helper to get tenant ID from request.
 * For SUPER_ADMIN, uses the requested tenant or null.
 * For other users, always uses their own tenant.
 */
export function getTenantIdFromRequest(req: Request): string | null {
  if (!req.user) {
    return null;
  }

  if (req.user.role === 'SUPER_ADMIN') {
    return req.params.tenantId || req.query.tenantId as string || null;
  }

  return req.user.tenantId;
}
