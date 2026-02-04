/**
 * Insights Polling Job
 * Periodically fetches insights from Meta API and stores them
 */

import { Job } from 'bull';
import { insightsSyncService } from '../services/meta-ads/insights-sync.service.js';
import { insightsPollingQueue, reconstructionQueue, type InsightsPollingJobData, type ReconstructionJobData } from './queue.js';

// Process insights polling jobs
insightsPollingQueue.process(async (job: Job<InsightsPollingJobData>) => {
    const { organisationId, campaignId } = job.data;

    console.log(`[InsightsPolling] Processing job for org ${organisationId}, campaign: ${campaignId || 'all'}`);

    if (campaignId) {
        // Sync single campaign
        const result = await insightsSyncService.fetchAndIngestInsights(
            organisationId,
            campaignId
        );

        if (result) {
            // Queue reconstruction job
            await reconstructionQueue.add({
                organisationId,
                campaignId: result.campaignId,
            } as ReconstructionJobData);
        }

        return {
            synced: result ? 1 : 0,
            campaignId: result?.campaignId,
        };
    } else {
        // Sync all active campaigns
        const result = await insightsSyncService.syncAllActiveCampaigns(organisationId);

        // Queue reconstruction for each synced campaign
        const activeCampaigns = await insightsSyncService.getActiveCampaigns(organisationId);
        for (const campaign of activeCampaigns) {
            await reconstructionQueue.add({
                organisationId,
                campaignId: campaign.id,
            } as ReconstructionJobData);
        }

        return result;
    }
});

// Schedule repeating job for all active organisations
export async function scheduleInsightsPolling(
    organisationId: string,
    intervalMs: number = 60000 // Default: 1 minute
): Promise<void> {
    const jobId = `insights-polling-${organisationId}`;

    // Add new repeating job (will replace existing if same jobId)
    await insightsPollingQueue.add(
        { organisationId } as InsightsPollingJobData,
        {
            repeat: { every: intervalMs },
            jobId,
        }
    );

    console.log(`[InsightsPolling] Scheduled for org ${organisationId} every ${intervalMs}ms`);
}

export async function stopInsightsPolling(organisationId: string): Promise<void> {
    const jobId = `insights-polling-${organisationId}`;
    const jobs = await insightsPollingQueue.getRepeatableJobs();
    for (const job of jobs) {
        if (job.id === jobId) {
            await insightsPollingQueue.removeRepeatableByKey(job.key);
        }
    }
    console.log(`[InsightsPolling] Stopped for org ${organisationId}`);
}
