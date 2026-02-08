import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { credentialsService } from '../credentials/credentials.service.js';
import { tiktokAdsService } from './tiktok-ads.service.js';

const saveCredentialsSchema = z.object({
    tokens: z.object({
        access_token: z.string(),
        refresh_token: z.string(),
        scope: z.string().optional(),
        open_id: z.string(),
        expires_in: z.number(),
        refresh_expires_in: z.number(),
    }),
});

export async function saveTikTokCredentials(
    request: FastifyRequest<{ Body: z.infer<typeof saveCredentialsSchema> }>,
    reply: FastifyReply
) {
    const organisationId = request.headers['x-organisation-id'] as string;

    if (!organisationId) {
        return reply.status(400).send({ error: 'Missing x-organisation-id header' });
    }

    const { tokens } = request.body;

    try {
        const secrets = {
            ...tokens,
            scope: tokens.scope || 'ads.management,user.info.basic'
        };

        await credentialsService.saveCredentials(organisationId, 'tiktok_ads', secrets);
        return reply.send({ success: true });
    } catch (error: any) {
        if (error.code === 'ALREADY_EXISTS') {
            const secrets = {
                ...tokens,
                scope: tokens.scope || 'ads.management,user.info.basic'
            };
            await credentialsService.rotateCredentials(organisationId, 'tiktok_ads', secrets);
            return reply.send({ success: true, rotated: true });
        }
        request.log.error(error);
        return reply.status(500).send({ error: 'Failed to save credentials' });
    }
}

export async function listAdvertisers(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const organisationId = request.headers['x-organisation-id'] as string;

    if (!organisationId) {
        return reply.status(400).send({ error: 'Missing x-organisation-id header' });
    }

    try {
        const advertisers = await tiktokAdsService.listAdvertisers(organisationId);
        return reply.send(advertisers);
    } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Failed to list advertisers' });
    }
}
