import { FastifyRequest, FastifyReply } from 'fastify';
import { adminService } from './admin.service.js';
import { CreateTenantBody } from './admin.schemas.js';

export async function createTenant(
  request: FastifyRequest<{ Body: CreateTenantBody }>,
  reply: FastifyReply
): Promise<void> {
  const { name } = request.body;
  const tenant = await adminService.createTenant(name);

  reply.status(201).send({
    message: 'Tenant created successfully',
    tenant,
  });
}

export async function getAllTenants(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const tenants = await adminService.getAllTenants();

  reply.status(200).send({
    count: tenants.length,
    tenants,
  });
}

export async function getTenantById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { id } = request.params;
  const tenant = await adminService.getTenantById(id);

  if (!tenant) {
    return reply.status(404).send({
      error: 'Not Found',
      message: 'Tenant not found',
    });
  }

  reply.status(200).send(tenant);
}

export async function deleteTenant(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { id } = request.params;
  await adminService.deleteTenant(id);

  reply.status(200).send({
    message: 'Tenant deleted successfully',
  });
}
