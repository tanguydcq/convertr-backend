// Fastify schemas for admin routes

export const createTenantSchema = {
    type: 'object',
    required: ['name', 'email'],
    properties: {
        name: { type: 'string', minLength: 1 },
        email: { type: 'string', format: 'email' },
    },
};

export type CreateTenantBody = {
    name: string;
    email: string;
};
