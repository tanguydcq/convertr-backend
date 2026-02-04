/**
 * Analytics API Routes
 * ML-focused endpoints for time-series and structure queries
 */

import { FastifyInstance } from 'fastify';
import { analyticsQueryService } from '../../services/meta-ads/analytics-query.service.js';
import { authenticate } from '../../middleware/authenticate.js';

interface TimeSeriesParams {
    campaignId: string;
}

interface TimeSeriesQuery {
    from?: string;
    to?: string;
    resolution?: 'second' | 'minute' | 'hour';
    limit?: string;
}

interface SnapshotParams {
    type: 'campaign' | 'adset' | 'ad';
    metaObjectId: string;
}

interface SnapshotQuery {
    ts?: string;
}

export async function analyticsRoutes(app: FastifyInstance) {
    // Apply authentication to all routes
    app.addHook('onRequest', authenticate);

    /**
     * GET /analytics/campaigns/:campaignId/timeseries
     * Get time-series data for ML consumption
     */
    app.get<{
        Params: TimeSeriesParams;
        Querystring: TimeSeriesQuery;
    }>('/campaigns/:campaignId/timeseries', async (request, reply) => {
        const { campaignId } = request.params;
        const { from, to, resolution, limit } = request.query;

        // Default to last 24 hours if not specified
        const now = new Date();
        const fromDate = from ? new Date(from) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : now;

        const timeSeries = await analyticsQueryService.getTimeSeries(
            campaignId,
            fromDate,
            toDate,
            {
                resolution: resolution || 'second',
                limit: limit ? parseInt(limit, 10) : undefined,
            }
        );

        // Convert BigInt to string for JSON serialization
        const serialized = timeSeries.map(point => ({
            ...point,
            impressionsCum: point.impressionsCum.toString(),
            clicksCum: point.clicksCum.toString(),
            reachCum: point.reachCum.toString(),
        }));

        return reply.send({
            campaignId,
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
            resolution: resolution || 'second',
            count: serialized.length,
            data: serialized,
        });
    });

    /**
     * GET /analytics/campaigns/:campaignId/timeseries-with-structure
     * Get time-series with structure context for ML
     */
    app.get<{
        Params: TimeSeriesParams;
        Querystring: TimeSeriesQuery;
    }>('/campaigns/:campaignId/timeseries-with-structure', async (request, reply) => {
        const { campaignId } = request.params;
        const { from, to } = request.query;

        const now = new Date();
        const fromDate = from ? new Date(from) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : now;

        const result = await analyticsQueryService.getTimeSeriesWithStructure(
            campaignId,
            fromDate,
            toDate
        );

        // Convert BigInt to string for JSON serialization
        const serialized = {
            ...result,
            timeSeries: result.timeSeries.map(point => ({
                ...point,
                impressionsCum: point.impressionsCum.toString(),
                clicksCum: point.clicksCum.toString(),
                reachCum: point.reachCum.toString(),
            })),
        };

        return reply.send(serialized);
    });

    /**
     * GET /analytics/campaigns/:campaignId/metrics
     * Get delta metrics for a time window (not cumulative)
     */
    app.get<{
        Params: TimeSeriesParams;
        Querystring: TimeSeriesQuery;
    }>('/campaigns/:campaignId/metrics', async (request, reply) => {
        const { campaignId } = request.params;
        const { from, to } = request.query;

        const now = new Date();
        const fromDate = from ? new Date(from) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : now;

        const metrics = await analyticsQueryService.getMetricsForWindow(
            campaignId,
            fromDate,
            toDate
        );

        if (!metrics) {
            return reply.status(404).send({
                error: 'No data found for the specified time window',
            });
        }

        return reply.send({
            campaignId,
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
            metrics,
        });
    });

    /**
     * GET /analytics/snapshots/:type/:metaObjectId
     * Get structure snapshot at a specific time
     */
    app.get<{
        Params: SnapshotParams;
        Querystring: SnapshotQuery;
    }>('/snapshots/:type/:metaObjectId', async (request, reply) => {
        const { type, metaObjectId } = request.params;
        const { ts } = request.query;

        const timestamp = ts ? new Date(ts) : new Date();

        const snapshot = await analyticsQueryService.getStructureAtTime(
            metaObjectId,
            type,
            timestamp
        );

        if (!snapshot) {
            return reply.status(404).send({
                error: `No ${type} snapshot found for ${metaObjectId} at ${timestamp.toISOString()}`,
            });
        }

        return reply.send({
            type,
            metaObjectId,
            ts: timestamp.toISOString(),
            snapshot: snapshot.payloadJson,
            validFrom: snapshot.validFrom,
            validTo: snapshot.validTo,
            version: snapshot.snapshotVersion,
        });
    });

    /**
     * GET /analytics/campaigns/active
     * Get all active campaigns with latest metrics
     */
    app.get('/campaigns/active', async (request, reply) => {
        const organisationId = request.headers['x-organisation-id'] as string;

        if (!organisationId) {
            return reply.status(400).send({ error: 'x-organisation-id header required' });
        }

        const campaigns = await analyticsQueryService.getActiveCampaignsWithMetrics(organisationId);

        return reply.send({
            organisationId,
            count: campaigns.length,
            campaigns,
        });
    });
}

export default analyticsRoutes;
