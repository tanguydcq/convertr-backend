
import { FastifyRequest, FastifyReply } from 'fastify';
import { metaService } from '../../integrations/meta/meta.service.js';
import { credentialsService } from '../credentials/credentials.service.js';
import { z } from 'zod';

// Validation schemas
const connectSchema = z.object({
    accessToken: z.string().min(1),
    adAccountId: z.string().min(1),
});

export class MetaController {
    /**
     * Check if Meta is connected for the current account
     */
    async getStatus(request: FastifyRequest, reply: FastifyReply) {
        const accountId = request.account!.accountId;
        const hasCredentials = await credentialsService.hasCredentials(accountId, 'meta_ads');

        return reply.send({ connected: hasCredentials });
    }

    /**
     * Get available ad accounts from Meta using a provided access token
     * Used during the connection flow to let user pick an account
     */
    async getAdAccounts(request: FastifyRequest, reply: FastifyReply) {
        const accountId = request.account!.accountId;
        const { accessToken } = request.query as { accessToken?: string };

        if (!accessToken) {
            // If no explicit token provided, try to use stored credentials
            // This supports re-fetching accounts for already connected users
            const hasCredentials = await credentialsService.hasCredentials(accountId, 'meta_ads');
            if (!hasCredentials) {
                return reply.status(400).send({
                    error: 'Missing Access Token',
                    message: 'Please provide an accessToken query parameter or connect first.'
                });
            }
        }

        try {
            const accounts = await metaService.getConnectedAccounts(accountId, accessToken);
            return reply.send(accounts);
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                error: 'Meta API Error',
                message: error instanceof Error ? error.message : 'Failed to fetch ad accounts'
            });
        }
    }

    /**
     * Connect Meta integration (save credentials)
     */
    async connect(request: FastifyRequest, reply: FastifyReply) {
        const accountId = request.account!.accountId;

        const result = connectSchema.safeParse(request.body);
        if (!result.success) {
            return reply.status(400).send({
                error: 'Validation Error',
                message: result.error.errors[0].message
            });
        }

        const { accessToken, adAccountId } = result.data;

        try {
            // Verify the credentials work by fetching something small (e.g. campaigns or just the account itself)
            // For now, we trust the inputs but in a real app we should validate them against Meta API here

            await metaService.saveConfigForAccount(accountId, {
                accessToken,
                adAccountId,
            });

            return reply.send({ success: true });
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                error: 'Connection Failed',
                message: error instanceof Error ? error.message : 'Failed to save credentials'
            });
        }
    }

    /**
     * Disconnect Meta integration
     */
    async disconnect(request: FastifyRequest, reply: FastifyReply) {
        const accountId = request.account!.accountId;

        try {
            await credentialsService.deleteCredentials(accountId, 'meta_ads');
            return reply.send({ success: true });
        } catch (error) {
            // If we can't find them, it's effectively disconnected anyway, catch 404s if needed
            // But existing service throws specific errors.
            request.log.error(error);
            return reply.status(500).send({
                error: 'Disconnect Failed',
                message: error instanceof Error ? error.message : 'Failed to delete credentials'
            });
        }
    }

    /**
     * Get campaigns
     */
    async getCampaigns(request: FastifyRequest, reply: FastifyReply) {
        const accountId = request.account!.accountId;

        try {
            const campaigns = await metaService.getCampaigns(accountId);
            return reply.send(campaigns);
        } catch (error) {
            request.log.error(error);
            // Distinguish between Not Configured (400/404) and API Error (502)
            return reply.status(500).send({
                error: 'Fetch Failed',
                message: error instanceof Error ? error.message : 'Failed to fetch campaigns'
            });
        }
    }

    /**
     * Get insights
     */
    async getInsights(request: FastifyRequest, reply: FastifyReply) {
        const accountId = request.account!.accountId;
        const { datePreset } = request.query as { datePreset?: string };

        try {
            const insights = await metaService.getInsights(
                accountId,
                undefined,
                datePreset as any // validated by service or defaults
            );
            return reply.send(insights);
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                error: 'Fetch Failed',
                message: error instanceof Error ? error.message : 'Failed to fetch insights'
            });
        }
    }
}

export const metaController = new MetaController();
