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
    // GET /api/integrations/meta/status
    app.get('/status', {
        preHandler: [authenticate],
        schema: {
            response: {
                200: {
                    type: 'object',
                    properties: {
                        connected: { type: 'boolean' }
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
        const accountId = request.account?.accountId;
        if (!accountId) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }

        const connected = await metaService.isConnected(accountId);
        return { connected };
    });
    // GET /api/integrations/meta/ad-accounts
    app.get('/ad-accounts', {
        preHandler: [authenticate],
        schema: {
            response: {
                200: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            account_id: { type: 'string' },
                            name: { type: 'string' }
                        }
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
        const accountId = request.account?.accountId;
        if (!accountId) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }

        const accounts = await metaService.getConnectedAccounts(accountId);
        return accounts;
    });

    // POST /api/integrations/meta/select-account
    app.post('/select-account', {
        preHandler: [authenticate],
        schema: {
            body: {
                type: 'object',
                required: ['adAccountId'],
                properties: {
                    adAccountId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        const { adAccountId } = request.body as { adAccountId: string };
        const accountId = request.account?.accountId;

        if (!accountId) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }

        await metaService.selectAdAccount(accountId, adAccountId);
        return { status: 'ok' };
    });
};
