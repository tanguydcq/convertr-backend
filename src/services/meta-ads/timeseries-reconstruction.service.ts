/**
 * Time-series Reconstruction Service
 * Interpolates raw insights into second-level granularity for ML consumption
 */

import prisma from '../../lib/prisma.js';
import type { CampaignInsightRaw } from '@prisma/client';

export interface ReconstructionResult {
    pointsCreated: number;
    fromTs: Date;
    toTs: Date;
}

interface InsightMetrics {
    impressions: number;
    spend: number;
    clicks: number;
    reach: number;
    timestamp: Date;
}

export class TimeSeriesReconstructionService {
    /**
     * Reconstruct time-series between two raw insight points
     * Uses linear interpolation for cumulative metrics
     */
    async reconstructTimeSeries(
        organisationId: string,
        campaignId: string,
        fromTs?: Date,
        toTs?: Date
    ): Promise<ReconstructionResult> {
        // Get relevant raw insights
        const insights = await this.getRawInsightsForReconstruction(campaignId, fromTs, toTs);

        if (insights.length < 2) {
            return { pointsCreated: 0, fromTs: new Date(), toTs: new Date() };
        }

        let pointsCreated = 0;
        const startTime = insights[0].fetchedAt;
        const endTime = insights[insights.length - 1].fetchedAt;

        // Process consecutive pairs of insights
        for (let i = 0; i < insights.length - 1; i++) {
            const current = insights[i];
            const next = insights[i + 1];

            const currentMetrics = this.extractMetrics(current);
            const nextMetrics = this.extractMetrics(next);

            if (!currentMetrics || !nextMetrics) continue;

            // Interpolate between points
            const created = await this.interpolateBetweenPoints(
                organisationId,
                campaignId,
                currentMetrics,
                nextMetrics,
                current.id,
                next.id
            );

            pointsCreated += created;
        }

        return {
            pointsCreated,
            fromTs: startTime,
            toTs: endTime,
        };
    }

    /**
     * Get raw insights for reconstruction
     */
    private async getRawInsightsForReconstruction(
        campaignId: string,
        fromTs?: Date,
        toTs?: Date
    ): Promise<CampaignInsightRaw[]> {
        const where: any = { campaignId };

        if (fromTs || toTs) {
            where.fetchedAt = {};
            if (fromTs) where.fetchedAt.gte = fromTs;
            if (toTs) where.fetchedAt.lte = toTs;
        }

        return prisma.campaignInsightRaw.findMany({
            where,
            orderBy: { fetchedAt: 'asc' },
        });
    }

    /**
     * Extract cumulative metrics from raw insight payload
     */
    private extractMetrics(insight: CampaignInsightRaw): InsightMetrics | null {
        try {
            const payload = insight.metaPayloadJson as any;
            const insightsData = payload.insights;

            if (!insightsData || !Array.isArray(insightsData) || insightsData.length === 0) {
                return null;
            }

            // Sum all data points (daily insights are cumulative)
            let impressions = 0;
            let spend = 0;
            let clicks = 0;
            let reach = 0;

            for (const data of insightsData) {
                impressions += parseInt(data.impressions || '0', 10);
                spend += parseFloat(data.spend || '0');
                reach += parseInt(data.reach || '0', 10);

                // Extract clicks from actions
                if (data.actions) {
                    for (const action of data.actions) {
                        if (action.action_type === 'link_click') {
                            clicks += parseInt(action.value || '0', 10);
                        }
                    }
                }
            }

            return {
                impressions,
                spend,
                clicks,
                reach,
                timestamp: insight.fetchedAt,
            };
        } catch {
            return null;
        }
    }

    /**
     * Interpolate metrics between two points and create time-series entries
     */
    private async interpolateBetweenPoints(
        organisationId: string,
        campaignId: string,
        point1: InsightMetrics,
        point2: InsightMetrics,
        sourceId1: string,
        sourceId2: string
    ): Promise<number> {
        const startTs = point1.timestamp.getTime();
        const endTs = point2.timestamp.getTime();
        const diffSeconds = Math.floor((endTs - startTs) / 1000);

        if (diffSeconds <= 0) return 0;

        // Calculate deltas per second
        const impressionsDelta = (point2.impressions - point1.impressions) / diffSeconds;
        const spendDelta = (point2.spend - point1.spend) / diffSeconds;
        const clicksDelta = (point2.clicks - point1.clicks) / diffSeconds;
        const reachDelta = (point2.reach - point1.reach) / diffSeconds;

        let created = 0;

        // Batch inserts for performance
        const batchSize = 1000;
        const records: any[] = [];

        for (let i = 0; i <= diffSeconds; i++) {
            const ts = new Date(startTs + i * 1000);
            const isExact = i === 0 || i === diffSeconds;

            records.push({
                organisationId,
                campaignId,
                ts,
                impressionsCum: BigInt(Math.floor(point1.impressions + impressionsDelta * i)),
                spendCum: point1.spend + spendDelta * i,
                clicksCum: BigInt(Math.floor(point1.clicks + clicksDelta * i)),
                reachCum: BigInt(Math.floor(point1.reach + reachDelta * i)),
                isInterpolated: !isExact,
                sourceInsightId: isExact ? (i === 0 ? sourceId1 : sourceId2) : null,
            });

            // Batch insert
            if (records.length >= batchSize) {
                await this.batchUpsert(records);
                created += records.length;
                records.length = 0;
            }
        }

        // Insert remaining records
        if (records.length > 0) {
            await this.batchUpsert(records);
            created += records.length;
        }

        return created;
    }

    /**
     * Batch upsert time-series records (skip duplicates)
     */
    private async batchUpsert(records: any[]): Promise<void> {
        // Use createMany with skipDuplicates for append-only behavior
        await prisma.campaignKpiTimeSeries.createMany({
            data: records,
            skipDuplicates: true,
        });
    }

    /**
     * Get latest timestamp in time-series for incremental processing
     */
    async getLatestTimestamp(campaignId: string): Promise<Date | null> {
        const latest = await prisma.campaignKpiTimeSeries.findFirst({
            where: { campaignId },
            orderBy: { ts: 'desc' },
            select: { ts: true },
        });

        return latest?.ts ?? null;
    }

    /**
     * Reconstruct incrementally from last known point
     */
    async reconstructIncremental(
        organisationId: string,
        campaignId: string
    ): Promise<ReconstructionResult> {
        const lastTs = await this.getLatestTimestamp(campaignId);
        return this.reconstructTimeSeries(organisationId, campaignId, lastTs ?? undefined);
    }
}

export const timeSeriesReconstructionService = new TimeSeriesReconstructionService();
