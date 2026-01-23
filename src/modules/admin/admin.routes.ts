import { FastifyPluginAsync } from 'fastify';
import { createTenant, getAllTenants, getTenantById, deleteTenant } from './admin.controller.js';
import { authenticate, authorize } from '../../middleware/index.js';
import { CreateTenantBody } from './admin.schemas.js';

export const adminRoutes: FastifyPluginAsync = async (app) => {
    // All admin routes require SUPER_ADMIN role
    const superAdminHooks = [authenticate, authorize('SUPER_ADMIN')];

    // POST /api/admin/tenants - Create a new tenant
    app.post<{ Body: CreateTenantBody }>('/tenants', {
        preHandler: superAdminHooks,
        schema: {
            body: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string', minLength: 1, maxLength: 255 },
                },
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        tenant: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                name: { type: 'string' },
                                createdAt: { type: 'string' },
                            },
                        },
                    },
                },
            },
        },
    }, createTenant);

    // GET /api/admin/tenants - Get all tenants
    app.get('/tenants', {
        preHandler: superAdminHooks,
        schema: {
            response: {
                200: {
                    type: 'object',
                    properties: {
                        count: { type: 'integer' },
                        tenants: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    name: { type: 'string' },
                                    createdAt: { type: 'string' },
                                    userCount: { type: 'integer' },
                                },
                            },
                        },
                    },
                },
            },
        },
    }, getAllTenants);

    // GET /api/admin/tenants/:id - Get a specific tenant
    app.get<{ Params: { id: string } }>('/tenants/:id', {
        preHandler: superAdminHooks,
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' },
                },
            },
        },
    }, getTenantById);

    // DELETE /api/admin/tenants/:id - Delete a tenant
    app.delete<{ Params: { id: string } }>('/tenants/:id', {
        preHandler: superAdminHooks,
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' },
                },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                    },
                },
            },
        },
    }, deleteTenant);
};

export default adminRoutes;
