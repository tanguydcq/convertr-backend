import { FastifyRequest, FastifyReply } from 'fastify';
import { usersService } from './users.service.js';

export async function getMe(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.user) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'User not authenticated',
    });
  }

  const profile = await usersService.getProfile(request.user.userId);

  if (!profile) {
    return reply.status(404).send({
      error: 'Not Found',
      message: 'User not found',
    });
  }

  reply.status(200).send(profile);
}
