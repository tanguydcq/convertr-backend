import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Authorization middleware stub.
 * In the new Account-centric model, we assume the authenticated account
 * has full access to its own resources.
 * If we add system-wide admins later, we can re-implement this.
 */
export async function authorize(
  _allowRoles: string[]
): Promise<(request: FastifyRequest, reply: FastifyReply) => Promise<void>> {
  return async (_request: FastifyRequest, _reply: FastifyReply) => {
    // No-op for now
  };
}
