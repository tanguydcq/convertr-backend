/**
 * Structure Polling Job
 * Periodically fetches campaign structure from Meta API and creates snapshots
 */

import { Job } from 'bull';
import { structureSyncService } from '../services/meta-ads/structure-sync.service.js';
import { structurePollingQueue, type StructurePollingJobData } from './queue.js';

// Process structure polling jobs
structurePollingQueue.process(async (job: Job<StructurePollingJobData>) => {
    const { organisationId, adAccountId } = job.data;

    console.log(`[StructurePolling] Processing job for org ${organisationId}, account: ${adAccountId}`);

    const result = await structureSyncService.syncAccountStructure(
        organisationId,
        adAccountId
    );

    return {
        campaigns: {
            total: result.campaigns.length,
            created: result.campaigns.filter(r => r.created).length,
        },
        adSets: {
            total: result.adSets.length,
            created: result.adSets.filter(r => r.created).length,
        },
        ads: {
            total: result.ads.length,
            created: result.ads.filter(r => r.created).length,
        },
    };
});

// Schedule repeating job for an ad account
export async function scheduleStructurePolling(
    organisationId: string,
    adAccountId: string,
    intervalMs: number = 600000 // Default: 10 minutes
): Promise<void> {
    const jobId = `structure-polling-${organisationId}-${adAccountId}`;

    // Add new repeating job (will replace existing if same jobId)
    await structurePollingQueue.add(
        { organisationId, adAccountId } as StructurePollingJobData,
        {
            repeat: { every: intervalMs },
            jobId,
        }
    );

    console.log(`[StructurePolling] Scheduled for account ${adAccountId} every ${intervalMs}ms`);
}

export async function stopStructurePolling(
    organisationId: string,
    adAccountId: string
): Promise<void> {
    const jobId = `structure-polling-${organisationId}-${adAccountId}`;
    const jobs = await structurePollingQueue.getRepeatableJobs();
    for (const job of jobs) {
        if (job.id === jobId) {
            await structurePollingQueue.removeRepeatableByKey(job.key);
        }
    }
    console.log(`[StructurePolling] Stopped for account ${adAccountId}`);
}
