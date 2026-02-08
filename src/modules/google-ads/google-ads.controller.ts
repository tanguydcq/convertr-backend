import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { credentialsService } from '../credentials/credentials.service.js';
import { googleAdsService } from './google-ads.service.js';

// Schema for saving credentials
const saveCredentialsSchema = z.object({
    tokens: z.object({
        access_token: z.string(),
        refresh_token: z.string(), // Critical
        scope: z.string(),
        token_type: z.string(),
        expiry_date: z.number(),
    }),
});

export async function saveGoogleCredentials(
    request: FastifyRequest<{ Body: z.infer<typeof saveCredentialsSchema> }>,
    reply: FastifyReply
) {
    // TODO: Extract organisation ID from authenticated user
    // For now, we mock or expect it in headers if trusted
    // In real implementation, request.user.organisationId

    // MOCK for development: assume the user has an organisationId 'default-org-id' or check headers
    // You should replace this with actual auth logic
    const organisationId = request.headers['x-organisation-id'] as string;

    if (!organisationId) {
        return reply.status(400).send({ error: 'Missing x-organisation-id header' });
    }

    const { tokens } = request.body;

    try {
        await credentialsService.saveCredentials(organisationId, 'google_ads', tokens);
        return reply.send({ success: true });
    } catch (error: any) {
        if (error.code === 'ALREADY_EXISTS') {
            // Rotate if exists
            await credentialsService.rotateCredentials(organisationId, 'google_ads', tokens);
            return reply.send({ success: true, rotated: true });
        }
        request.log.error(error);
        return reply.status(500).send({ error: 'Failed to save credentials' });
    }
}

export async function listAccessibleCustomers(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const organisationId = request.headers['x-organisation-id'] as string;

    if (!organisationId) {
        return reply.status(400).send({ error: 'Missing x-organisation-id header' });
    }

    try {
        const customers = await googleAdsService.listAccessibleCustomers(organisationId);
        return reply.send(customers);
    } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Failed to list customers' });
    }
}
