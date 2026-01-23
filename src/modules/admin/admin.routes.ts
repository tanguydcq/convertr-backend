import { FastifyInstance } from 'fastify';
import { createAccount, getAllAccounts, getAccountById, deleteAccount } from './admin.controller.js';
import { createTenantSchema } from './admin.schemas.js'; // naming might be old, check schemas

export async function adminRoutes(app: FastifyInstance): Promise<void> {
    // We might want to protect these with a system-secret or similar, 
    // but for now we just expose them (maybe behind basic auth later?)
    // or assuming this is internal or restricted by network.

    app.post('/', { schema: { body: createTenantSchema } }, createAccount);
    app.get('/', getAllAccounts);
    app.get('/:id', getAccountById);
    app.delete('/:id', deleteAccount);
}
