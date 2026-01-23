import { FastifyRequest, FastifyReply } from 'fastify';
import { adminService } from './admin.service.js';

// Note: CreateAccountBody is likely not needed if we disable creation via admin for now,
// or we make a simple one.
interface CreateAccountBody {
  name: string;
  email: string;
}

export async function createAccount(
  request: FastifyRequest<{ Body: CreateAccountBody }>,
  reply: FastifyReply
): Promise<void> {
  const { name, email } = request.body;
  try {
    const account = await adminService.createAccount(name, email);
    reply.status(201).send({
      message: 'Account created successfully',
      account,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Not implemented')) {
      reply.status(501).send({
        error: 'Not Implemented',
        message: error.message
      });
      return;
    }
    throw error;
  }
}

export async function getAllAccounts(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const accounts = await adminService.getAllAccounts();

  reply.status(200).send({
    count: accounts.length,
    accounts,
  });
}

export async function getAccountById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { id } = request.params;
  const account = await adminService.getAccountById(id);

  if (!account) {
    return reply.status(404).send({
      error: 'Not Found',
      message: 'Account not found',
    });
  }

  reply.status(200).send(account);
}

export async function deleteAccount(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { id } = request.params;
  await adminService.deleteAccount(id);

  reply.status(200).send({
    message: 'Account deleted successfully',
  });
}
