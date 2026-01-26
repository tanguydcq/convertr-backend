import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { metaService } from './meta.service.js';
import { authenticate } from '../../middleware/index.js';

export const metaRoutes: FastifyPluginAsync = async (app) => {
    // POST /api/integrations/meta/connect
    app.post('/connect', {
        preHandler: [authenticate],
        schema: {
            body: {
                type: 'object',
                required: ['code', 'redirectUri'],
                properties: {
                    code: { type: 'string' },
                    redirectUri: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' }
                    }
                },
                401: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        const { code, redirectUri } = request.body as { code: string; redirectUri: string };
        const accountId = request.account?.accountId;

        if (!accountId) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }

        await metaService.connectAccount(accountId, code, redirectUri);

        return { status: 'ok' };
    });
};
