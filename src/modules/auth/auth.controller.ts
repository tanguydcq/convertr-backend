import { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from './auth.service.js';
import { LoginBody, RefreshBody, LogoutBody } from './auth.schemas.js';

export async function login(
  request: FastifyRequest<{ Body: LoginBody }>,
  reply: FastifyReply
): Promise<void> {
  const { email, password } = request.body;

  // Extract IP and UA for logging
  const ip = request.ip;
  const ua = request.headers['user-agent'];

  const result = await authService.login(email, password, ip, ua);

  reply.status(200).send({
    message: 'Login successful',
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
    expiresIn: result.tokens.expiresIn,
    account: result.account,
  });
}

export async function refresh(
  request: FastifyRequest<{ Body: RefreshBody }>,
  reply: FastifyReply
): Promise<void> {
  const { refreshToken } = request.body;
  const ip = request.ip;
  const ua = request.headers['user-agent'];

  const tokens = await authService.refresh(refreshToken, ip, ua);

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

export async function me(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const accountId = request.account?.accountId;

  if (!accountId) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Not authenticated',
    });
  }

  const account = await authService.getAccountProfile(accountId);

  reply.status(200).send(account);
}
