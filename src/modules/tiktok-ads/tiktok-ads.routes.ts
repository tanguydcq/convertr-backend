import { FastifyInstance } from 'fastify';
import { saveTikTokCredentials, listAdvertisers } from './tiktok-ads.controller.js';

export async function tiktokAdsRoutes(fastify: FastifyInstance) {
    fastify.post('/credentials', saveTikTokCredentials);
    fastify.get('/advertisers', listAdvertisers);
}
