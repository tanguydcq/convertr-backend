import { FastifyRequest, FastifyReply } from 'fastify';
import { leadsService, CreateLeadInput } from './leads.service.js';

// Query params for pagination
interface GetLeadsQuery {
  page?: string;
  limit?: string;
}

// Body for creating a lead
interface CreateLeadBody {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  source?: string;
}

/**
 * GET /leads - List leads with pagination
 */
export async function getLeads(
  request: FastifyRequest<{ Querystring: GetLeadsQuery }>,
  reply: FastifyReply
): Promise<void> {
  if (!request.user) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'User not authenticated',
    });
  }

  const page = Math.max(1, parseInt(request.query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(request.query.limit || '20', 10)));

  // SUPER_ADMIN can see all leads
  if (request.user.role === 'SUPER_ADMIN') {
    const result = await leadsService.getAllLeads({ page, limit });
    return reply.status(200).send(result);
  }

  // Other users can only see their tenant's leads
  if (!request.user.tenantId) {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'User has no associated tenant',
    });
  }

  const result = await leadsService.getLeadsByTenant(request.user.tenantId, { page, limit });
  reply.status(200).send(result);
}

/**
 * GET /leads/:id - Get a single lead
 */
export async function getLeadById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  if (!request.user) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'User not authenticated',
    });
  }

  const { id } = request.params;
  const tenantId = request.user.role === 'SUPER_ADMIN' ? null : request.user.tenantId;

  const lead = await leadsService.getLeadById(id, tenantId || null);

  if (!lead) {
    return reply.status(404).send({
      error: 'Not Found',
      message: 'Lead not found',
    });
  }

  reply.status(200).send(lead);
}

/**
 * POST /leads - Create a new lead
 */
export async function createLead(
  request: FastifyRequest<{ Body: CreateLeadBody }>,
  reply: FastifyReply
): Promise<void> {
  if (!request.user) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'User not authenticated',
    });
  }

  if (!request.user.tenantId) {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'User has no associated tenant',
    });
  }

  const input: CreateLeadInput = {
    firstName: request.body.firstName,
    lastName: request.body.lastName,
    email: request.body.email,
    phone: request.body.phone,
    company: request.body.company,
    source: request.body.source,
  };

  const lead = await leadsService.createLead(request.user.tenantId, input);

  reply.status(201).send(lead);
}
