/**
 * Time-series Reconstruction Job
 * Reconstructs second-level time-series from raw insights
 */

import { Job } from 'bull';
import { timeSeriesReconstructionService } from '../services/meta-ads/timeseries-reconstruction.service.js';
import { reconstructionQueue, type ReconstructionJobData } from './queue.js';

// Process reconstruction jobs
reconstructionQueue.process(async (job: Job<ReconstructionJobData>) => {
    const { organisationId, campaignId } = job.data;

    console.log(`[Reconstruction] Processing job for campaign ${campaignId}`);

    const result = await timeSeriesReconstructionService.reconstructIncremental(
        organisationId,
        campaignId
    );

    console.log(`[Reconstruction] Created ${result.pointsCreated} points for campaign ${campaignId}`);

    return {
        campaignId,
        pointsCreated: result.pointsCreated,
        fromTs: result.fromTs.toISOString(),
        toTs: result.toTs.toISOString(),
    };
});

// Queue a reconstruction job
export async function queueReconstruction(
    organisationId: string,
    campaignId: string
): Promise<void> {
    await reconstructionQueue.add({
        organisationId,
        campaignId,
    } as ReconstructionJobData);

    console.log(`[Reconstruction] Queued for campaign ${campaignId}`);
}
