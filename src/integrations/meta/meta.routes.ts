import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { metaService } from './meta.service.js';
import { authenticate } from '../../middleware/index.js';

export const metaRoutes: FastifyPluginAsync = async (app) => {
    // Helper to get organisation ID
    function getOrganisationId(request: any): string {
        const orgId = request.headers['x-organisation-id'];
        if (!orgId || typeof orgId !== 'string') {
            throw new Error('Missing or invalid x-organisation-id header');
        }
        return orgId;
    }

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
                },
                400: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        const { code, redirectUri } = request.body as { code: string; redirectUri: string };

        try {
            const organisationId = getOrganisationId(request);
            // TODO: Verify user has access to organisationId here (if not covered by middleware)

            await metaService.connectAccount(organisationId, code, redirectUri);
            return { status: 'ok' };
        } catch (error) {
            request.log.error(error);
            if (error instanceof Error && error.message.includes('x-organisation-id')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Internal Server Error' });
        }
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
                },
                400: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        try {
            const organisationId = getOrganisationId(request);
            const connected = await metaService.isConnected(organisationId);
            return { connected };
        } catch (error) {
            request.log.error(error);
            if (error instanceof Error && error.message.includes('x-organisation-id')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Internal Server Error' });
        }
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
                },
                400: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        try {
            const organisationId = getOrganisationId(request);
            const accounts = await metaService.getConnectedAccounts(organisationId);
            return accounts;
        } catch (error) {
            request.log.error(error);
            if (error instanceof Error && error.message.includes('x-organisation-id')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Internal Server Error' });
        }
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
                },
                401: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                },
                400: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        const { adAccountId } = request.body as { adAccountId: string };

        try {
            const organisationId = getOrganisationId(request);
            await metaService.selectAdAccount(organisationId, adAccountId);
            return { status: 'ok' };
        } catch (error) {
            request.log.error(error);
            if (error instanceof Error && error.message.includes('x-organisation-id')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Internal Server Error' });
        }
    });
};
