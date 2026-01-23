import { FastifyRequest, FastifyReply } from 'fastify';

type Role = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'CLIENT_USER';

/**
 * Creates a Fastify preHandler hook for role-based authorization
 */
export function authorize(...allowedRoles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    if (!allowedRoles.includes(request.user.role as Role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
      });
    }
  };
}
