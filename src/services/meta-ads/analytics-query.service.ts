/**
 * Analytics Query Service
 * ML-friendly query interface for time-series and structure data
 */

import prisma from '../../lib/prisma.js';
import { structureSyncService } from './structure-sync.service.js';

export interface TimeSeriesPoint {
    ts: Date;
    impressionsCum: bigint;
    spendCum: number;
    clicksCum: bigint;
    reachCum: bigint;
    isInterpolated: boolean;
}

export interface TimeSeriesWithStructure {
    timeSeries: TimeSeriesPoint[];
    structure: {
        campaign: any | null;
        adSets: any[];
        ads: any[];
    };
}

export class AnalyticsQueryService {
    /**
     * Get time-series data for a campaign
     */
    async getTimeSeries(
        campaignId: string,
        from: Date,
        to: Date,
        options?: {
            resolution?: 'second' | 'minute' | 'hour';
            limit?: number;
        }
    ): Promise<TimeSeriesPoint[]> {
        const resolution = options?.resolution ?? 'second';
        const limit = options?.limit;

        // For second resolution, return raw data
        if (resolution === 'second') {
            const data = await prisma.campaignKpiTimeSeries.findMany({
                where: {
                    campaignId,
                    ts: { gte: from, lte: to },
                },
                orderBy: { ts: 'asc' },
                take: limit,
                select: {
                    ts: true,
                    impressionsCum: true,
                    spendCum: true,
                    clicksCum: true,
                    reachCum: true,
                    isInterpolated: true,
                },
            });
            // Convert Decimal to number
            return data.map(point => ({
                ...point,
                spendCum: Number(point.spendCum),
            }));
        }

        // For minute/hour resolution, aggregate
        const intervalSeconds = resolution === 'minute' ? 60 : 3600;

        const data = await prisma.campaignKpiTimeSeries.findMany({
            where: {
                campaignId,
                ts: { gte: from, lte: to },
            },
            orderBy: { ts: 'asc' },
        });

        // Downsample by taking every nth point
        const result: TimeSeriesPoint[] = [];
        for (let i = 0; i < data.length; i += intervalSeconds) {
            const point = data[i];
            result.push({
                ts: point.ts,
                impressionsCum: point.impressionsCum,
                spendCum: Number(point.spendCum),
                clicksCum: point.clicksCum,
                reachCum: point.reachCum,
                isInterpolated: point.isInterpolated,
            });
        }

        return limit ? result.slice(0, limit) : result;
    }

    /**
     * Get structure valid at a specific timestamp
     */
    async getStructureAtTime(
        metaObjectId: string,
        type: 'campaign' | 'adset' | 'ad',
        ts: Date
    ) {
        switch (type) {
            case 'campaign':
                return structureSyncService.getCampaignStructureAt(metaObjectId, ts);
            case 'adset':
                return structureSyncService.getAdSetStructureAt(metaObjectId, ts);
            case 'ad':
                return structureSyncService.getAdStructureAt(metaObjectId, ts);
        }
    }

    /**
     * Get time-series with structure context for ML
     */
    async getTimeSeriesWithStructure(
        campaignId: string,
        from: Date,
        to: Date
    ): Promise<TimeSeriesWithStructure> {
        // Get the campaign to find meta object IDs
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            include: {
                adSets: {
                    include: { ads: true },
                },
            },
        });

        if (!campaign) {
            throw new Error(`Campaign ${campaignId} not found`);
        }

        // Get time-series
        const timeSeries = await this.getTimeSeries(campaignId, from, to);

        // Get structure at the midpoint of the time range
        const midTs = new Date((from.getTime() + to.getTime()) / 2);

        const campaignStructure = await structureSyncService.getCampaignStructureAt(
            campaign.externalId,
            midTs
        );

        const adSetStructures: any[] = [];
        const adStructures: any[] = [];

        for (const adSet of campaign.adSets) {
            const structure = await structureSyncService.getAdSetStructureAt(
                adSet.externalId,
                midTs
            );
            if (structure) adSetStructures.push(structure.payloadJson);

            for (const ad of adSet.ads) {
                const adStructure = await structureSyncService.getAdStructureAt(
                    ad.externalId,
                    midTs
                );
                if (adStructure) adStructures.push(adStructure.payloadJson);
            }
        }

        return {
            timeSeries,
            structure: {
                campaign: campaignStructure?.payloadJson ?? null,
                adSets: adSetStructures,
                ads: adStructures,
            },
        };
    }

    /**
     * Get active campaigns with latest metrics
     */
    async getActiveCampaignsWithMetrics(organisationId: string) {
        const campaigns = await prisma.campaign.findMany({
            where: {
                organisationId,
                status: 'ACTIVE',
            },
            include: {
                adAccount: {
                    select: { name: true, externalId: true },
                },
            },
        });

        const result = [];

        for (const campaign of campaigns) {
            // Get latest metrics
            const latestMetrics = await prisma.campaignKpiTimeSeries.findFirst({
                where: { campaignId: campaign.id },
                orderBy: { ts: 'desc' },
            });

            result.push({
                campaign,
                latestMetrics: latestMetrics ? {
                    ts: latestMetrics.ts,
                    impressionsCum: Number(latestMetrics.impressionsCum),
                    spendCum: Number(latestMetrics.spendCum),
                    clicksCum: Number(latestMetrics.clicksCum),
                    reachCum: Number(latestMetrics.reachCum),
                } : null,
            });
        }

        return result;
    }

    /**
     * Calculate metrics for a time window (for ML)
     * Returns deltas, not cumulative values
     */
    async getMetricsForWindow(
        campaignId: string,
        from: Date,
        to: Date
    ): Promise<{
        impressions: number;
        spend: number;
        clicks: number;
        reach: number;
        durationSeconds: number;
    } | null> {
        const startPoint = await prisma.campaignKpiTimeSeries.findFirst({
            where: { campaignId, ts: { gte: from } },
            orderBy: { ts: 'asc' },
        });

        const endPoint = await prisma.campaignKpiTimeSeries.findFirst({
            where: { campaignId, ts: { lte: to } },
            orderBy: { ts: 'desc' },
        });

        if (!startPoint || !endPoint) return null;

        return {
            impressions: Number(endPoint.impressionsCum - startPoint.impressionsCum),
            spend: Number(endPoint.spendCum) - Number(startPoint.spendCum),
            clicks: Number(endPoint.clicksCum - startPoint.clicksCum),
            reach: Number(endPoint.reachCum - startPoint.reachCum),
            durationSeconds: Math.floor((endPoint.ts.getTime() - startPoint.ts.getTime()) / 1000),
        };
    }
}

export const analyticsQueryService = new AnalyticsQueryService();
