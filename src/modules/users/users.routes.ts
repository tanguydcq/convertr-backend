import { FastifyPluginAsync } from 'fastify';
import { getMe } from './users.controller.js';
import { authenticate } from '../../middleware/index.js';

export const usersRoutes: FastifyPluginAsync = async (app) => {
    // GET /api/me - Get current user profile
    app.get('/me', {
        preHandler: [authenticate],
        schema: {
            response: {
                200: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        role: { type: 'string' },
                        tenantId: { type: ['string', 'null'] },
                        tenant: {
                            type: ['object', 'null'],
                            properties: {
                                id: { type: 'string' },
                                name: { type: 'string' },
                            },
                        },
                        createdAt: { type: 'string' },
                    },
                },
            },
        },
    }, getMe);
};

export default usersRoutes;
