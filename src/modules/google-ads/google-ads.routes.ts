import { FastifyInstance } from 'fastify';
import { saveGoogleCredentials, listAccessibleCustomers } from './google-ads.controller.js';

export async function googleAdsRoutes(fastify: FastifyInstance) {
    fastify.post('/credentials', saveGoogleCredentials);
    fastify.get('/customers', listAccessibleCustomers);
}
