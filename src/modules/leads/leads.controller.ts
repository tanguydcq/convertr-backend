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
  budget?: number;
  score?: number;
  source?: string;
  status?: string;
}

interface UpdateLeadBody extends Partial<CreateLeadBody> { }

/**
 * GET /leads - List leads with pagination
 */
export async function getLeads(
  request: FastifyRequest<{ Querystring: GetLeadsQuery }>,
  reply: FastifyReply
): Promise<void> {
  if (!request.account) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Not authenticated',
    });
  }

  const page = Math.max(1, parseInt(request.query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(request.query.limit || '20', 10)));

  // For MVP B2B, every login is an Account admin for their own data.
  // No SUPER_ADMIN role logic for now, or if needed can add back later.
  // We strictly scope to the authenticated account.

  const result = await leadsService.getLeadsByAccount(request.account.accountId, { page, limit });
  reply.status(200).send(result);
}

/**
 * GET /leads/:id - Get a single lead
 */
export async function getLeadById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  if (!request.account) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Not authenticated',
    });
  }

  const { id } = request.params;

  const lead = await leadsService.getLeadById(id, request.account.accountId);

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
  if (!request.account) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Not authenticated',
    });
  }

  const input: CreateLeadInput = {
    firstName: request.body.firstName,
    lastName: request.body.lastName,
    email: request.body.email,
    phone: request.body.phone,
    company: request.body.company,
    budget: request.body.budget,
    score: request.body.score,
    source: request.body.source,
    status: request.body.status,
  };

  const lead = await leadsService.createLead(request.account.accountId, input);

  reply.status(201).send(lead);
}

/**
 * PUT /leads/:id - Update an existing lead
 */
export async function updateLead(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateLeadBody }>,
  reply: FastifyReply
): Promise<void> {
  if (!request.account) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Not authenticated',
    });
  }

  const { id } = request.params;


  // Actually, let's just pass the body as partial since service UpdateLeadInput is partial CreateLeadInput
  try {
    const updatedLead = await leadsService.updateLead(request.account.accountId, id, request.body);
    reply.send(updatedLead);
  } catch (error) {
    reply.status(404).send({ error: 'Not Found', message: 'Lead not found' });
  }
}

/**
 * DELETE /leads/:id - Delete a lead
 */
export async function deleteLead(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  if (!request.account) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Not authenticated',
    });
  }

  const { id } = request.params;

  try {
    await leadsService.deleteLead(request.account.accountId, id);
    reply.status(204).send();
  } catch (error) {
    reply.status(404).send({ error: 'Not Found', message: 'Lead not found' });
  }
}
