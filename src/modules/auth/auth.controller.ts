import { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from './auth.service.js';
import { LoginBody, RefreshBody, LogoutBody } from './auth.schemas.js';

export async function login(
  request: FastifyRequest<{ Body: LoginBody }>,
  reply: FastifyReply
): Promise<void> {
  const { email, password } = request.body;
  const result = await authService.login(email, password);

  reply.status(200).send({
    message: 'Login successful',
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
    expiresIn: result.tokens.expiresIn,
    user: result.user,
  });
}

export async function refresh(
  request: FastifyRequest<{ Body: RefreshBody }>,
  reply: FastifyReply
): Promise<void> {
  const { refreshToken } = request.body;
  const tokens = await authService.refresh(refreshToken);

  reply.status(200).send({
    message: 'Token refreshed successfully',
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
  });
}

export async function logout(
  request: FastifyRequest<{ Body: LogoutBody }>,
  reply: FastifyReply
): Promise<void> {
  const { refreshToken } = request.body;
  await authService.logout(refreshToken);

  reply.status(200).send({
    message: 'Logout successful',
  });
}
