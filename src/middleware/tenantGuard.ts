import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Fastify preHandler hook to ensure request is scoped to current user's tenant
 */
export async function tenantGuard(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.user) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'User not authenticated'
    });
  }

  // SUPER_ADMIN can access everything
  if (request.user.role === 'SUPER_ADMIN') {
    return;
  }

  // Check if user has a tenant
  if (!request.user.tenantId) {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'User does not belong to any tenant',
    });
  }

  // Get tenantId from params
  const params = request.params as { tenantId?: string };
  const tenantId = params.tenantId;

  if (tenantId && tenantId !== request.user.tenantId) {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'Access denied to this tenant',
    });
  }

  // Also check body tenantId if present
  const body = request.body as { tenantId?: string } | undefined;
  if (body?.tenantId && body.tenantId !== request.user.tenantId) {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'Cannot modify resources of another tenant',
    });
  }
}

/**
 * Helper to get tenant ID from request.
 * For SUPER_ADMIN, uses the requested tenant or null.
 * For other users, always uses their own tenant.
 */
export function getTenantIdFromRequest(request: FastifyRequest): string | null {
  if (!request.user) {
    return null;
  }

  if (request.user.role === 'SUPER_ADMIN') {
    const params = request.params as { tenantId?: string };
    const query = request.query as { tenantId?: string };
    return params.tenantId || query.tenantId || null;
  }

  return request.user.tenantId || null;
}
