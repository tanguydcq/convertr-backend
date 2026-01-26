
import { FastifyInstance } from 'fastify';
import { metaController } from './meta.controller.js';
import { authenticate } from '../../middleware/index.js';

export async function metaRoutes(app: FastifyInstance) {
    // All routes require authentication
    app.addHook('preHandler', authenticate);

    app.get('/status', metaController.getStatus);
    app.get('/ad-accounts', metaController.getAdAccounts);
    app.post('/connect', metaController.connect);
    app.post('/disconnect', metaController.disconnect);
    app.get('/campaigns', metaController.getCampaigns);
    app.get('/insights', metaController.getInsights);
}
