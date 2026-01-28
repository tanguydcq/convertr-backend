import { FastifyRequest, FastifyReply } from 'fastify';
import { leadsService, CreateLeadInput, UpdateLeadInput } from './leads.service.js';

function getOrganisationId(request: FastifyRequest): string {
  const orgId = request.headers['x-organisation-id'];
  if (!orgId || typeof orgId !== 'string') {
    throw new Error('Missing or invalid x-organisation-id header');
  }
  return orgId;
}

export async function getLeads(
  request: FastifyRequest<{ Querystring: { page?: number; limit?: number } }>,
  reply: FastifyReply
): Promise<void> {
  const { page: queryPage, limit: queryLimit } = request.query;
  const page = queryPage ? parseInt(String(queryPage), 10) : 1;
  const limit = queryLimit ? parseInt(String(queryLimit), 10) : 10;

  try {
    const organisationId = getOrganisationId(request);
    const result = await leadsService.getLeadsByOrganisation(organisationId, { page, limit });
    reply.status(200).send(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes('x-organisation-id')) {
      reply.status(400).send({ error: error.message });
      return;
    }
    throw error;
  }
}

export async function getLeadById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { id } = request.params;

  try {
    const organisationId = getOrganisationId(request);
    const lead = await leadsService.getLeadById(id, organisationId);

    if (!lead) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Lead not found',
      });
    }

    reply.status(200).send(lead);
  } catch (error) {
    if (error instanceof Error && error.message.includes('x-organisation-id')) {
      reply.status(400).send({ error: error.message });
      return;
    }
    throw error;
  }
}

export async function createLead(
  request: FastifyRequest<{ Body: CreateLeadInput }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const organisationId = getOrganisationId(request);
    const lead = await leadsService.createLead(organisationId, request.body);
    reply.status(201).send(lead);
  } catch (error) {
    if (error instanceof Error && error.message.includes('x-organisation-id')) {
      reply.status(400).send({ error: error.message });
      return;
    }
    throw error;
  }
}

export async function updateLead(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateLeadInput }>,
  reply: FastifyReply
): Promise<void> {
  const { id } = request.params;

  try {
    const organisationId = getOrganisationId(request);
    const lead = await leadsService.updateLead(organisationId, id, request.body);
    reply.status(200).send(lead);
  } catch (error) {
    if (error instanceof Error && error.message === 'Lead not found') {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Lead not found',
      });
    }
    if (error instanceof Error && error.message.includes('x-organisation-id')) {
      reply.status(400).send({ error: error.message });
      return;
    }
    throw error;
  }
}

export async function deleteLead(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { id } = request.params;

  try {
    const organisationId = getOrganisationId(request);
    await leadsService.deleteLead(organisationId, id);
    reply.status(200).send({ message: 'Lead deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Lead not found') {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Lead not found',
      });
    }
    if (error instanceof Error && error.message.includes('x-organisation-id')) {
      reply.status(400).send({ error: error.message });
      return;
    }
    throw error;
  }
}
