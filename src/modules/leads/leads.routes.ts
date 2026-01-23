import { FastifyPluginAsync } from 'fastify';
import { getLeads, getLeadById, createLead } from './leads.controller.js';
import { authenticate } from '../../middleware/index.js';

export const leadsRoutes: FastifyPluginAsync = async (app) => {
    // GET /api/leads - Get all leads for the account (paginated)
    app.get<{ Querystring: { page?: string; limit?: string } }>('/', {
        preHandler: [authenticate],
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    page: { type: 'string' },
                    limit: { type: 'string' },
                },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        leads: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    firstName: { type: 'string' },
                                    lastName: { type: 'string' },
                                    email: { type: 'string' },
                                    phone: { type: ['string', 'null'] },
                                    company: { type: ['string', 'null'] },
                                    budget: { type: ['string', 'null'] },
                                    score: { type: 'integer' },
                                    source: { type: 'string' },
                                    status: { type: 'string' },
                                    createdAt: { type: 'string' },
                                },
                            },
                        },
                        total: { type: 'integer' },
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        hasMore: { type: 'boolean' },
                    },
                },
            },
        },
    }, getLeads as any);

    // GET /api/leads/:id - Get a specific lead
    app.get<{ Params: { id: string } }>('/:id', {
        preHandler: [authenticate],
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' },
                },
            },
        },
    }, getLeadById);

    // POST /api/leads - Create a new lead
    app.post('/', {
        preHandler: [authenticate],
        schema: {
            body: {
                type: 'object',
                required: ['firstName', 'lastName', 'email'],
                properties: {
                    firstName: { type: 'string', minLength: 1 },
                    lastName: { type: 'string', minLength: 1 },
                    email: { type: 'string', format: 'email' },
                    phone: { type: 'string' },
                    company: { type: 'string' },
                    budget: { type: 'string' },
                    score: { type: 'integer', minimum: 0, maximum: 100 },
                    status: { type: 'string' },
                    source: { type: 'string', default: 'manual' },
                },
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        email: { type: 'string' },
                        phone: { type: ['string', 'null'] },
                        company: { type: ['string', 'null'] },
                        budget: { type: ['string', 'null'] },
                        score: { type: 'integer' },
                        source: { type: 'string' },
                        status: { type: 'string' },
                        createdAt: { type: 'string' },
                    },
                },
            },
        },
    }, createLead as any);
};

export default leadsRoutes;
