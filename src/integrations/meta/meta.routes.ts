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

    // GET /api/integrations/meta/campaigns
    app.get('/campaigns', {
        preHandler: [authenticate],
        schema: {
            response: {
                200: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            status: { type: 'string' },
                            objective: { type: 'string' },
                            created_time: { type: 'string' },
                            updated_time: { type: 'string' }
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
                },
                500: {
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
            const campaigns = await metaService.getCampaigns(organisationId);
            return campaigns;
        } catch (error) {
            request.log.error(error);
            if (error instanceof Error && error.message.includes('x-organisation-id')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Internal Server Error' });
        }
    });

    // GET /api/integrations/meta/campaigns/:id
    app.get('/campaigns/:id', {
        preHandler: [authenticate],
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        status: { type: 'string' },
                        objective: { type: 'string' },
                        created_time: { type: 'string' },
                        updated_time: { type: 'string' },
                        insights: {
                            type: 'object',
                            properties: {
                                spend: { type: 'string' },
                                reach: { type: 'string' },
                                impressions: { type: 'string' },
                                cpm: { type: 'string' },
                                cpc: { type: 'string' },
                                ctr: { type: 'string' }
                            }
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
                },
                404: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                },
                500: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        const { id } = request.params as { id: string };
        try {
            const organisationId = getOrganisationId(request);
            const campaign = await metaService.getCampaign(organisationId, id);
            return campaign;
        } catch (error) {
            request.log.error(error);
            if (error instanceof Error && error.message.includes('x-organisation-id')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Internal Server Error' });
        }
    });



    // POST /api/integrations/meta/campaigns/sync
    app.post('/campaigns/sync', {
        preHandler: [authenticate],
        schema: {
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
                },
                500: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                }
            }
        }
    }, async (_request, _reply) => {
        // Since getCampaigns fetches live data, we don't strictly need to sync campaigns to DB yet.
        // This endpoint acknowledges the sync request.
        return { status: 'ok' };
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
