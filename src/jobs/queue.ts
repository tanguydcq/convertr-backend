/**
 * Job Queue Setup
 * Bull queue configuration for Meta Ads polling and reconstruction jobs
 */

import Bull from 'bull';
import { config } from '../config/index.js';

// Queue configuration
const queueOptions: Bull.QueueOptions = {
    redis: config.REDIS_URL,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 100, // Keep last 100 failed jobs for debugging
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
    },
};

// Create queues
export const insightsPollingQueue = new Bull('insights-polling', queueOptions);
export const structurePollingQueue = new Bull('structure-polling', queueOptions);
export const reconstructionQueue = new Bull('timeseries-reconstruction', queueOptions);

// Job data types
export interface InsightsPollingJobData {
    organisationId: string;
    campaignId?: string; // If not specified, sync all active campaigns
}

export interface StructurePollingJobData {
    organisationId: string;
    adAccountId: string;
}

export interface ReconstructionJobData {
    organisationId: string;
    campaignId: string;
}

// Queue event handlers for logging
const setupQueueLogging = (queue: Bull.Queue, name: string) => {
    queue.on('active', (job) => {
        console.log(`[${name}] Job ${job.id} started`);
    });

    queue.on('completed', (job) => {
        console.log(`[${name}] Job ${job.id} completed`);
    });

    queue.on('failed', (job, err) => {
        console.error(`[${name}] Job ${job?.id} failed:`, err.message);
    });

    queue.on('stalled', (job) => {
        console.warn(`[${name}] Job ${job.id} stalled`);
    });
};

// Initialize queue logging
setupQueueLogging(insightsPollingQueue, 'InsightsPolling');
setupQueueLogging(structurePollingQueue, 'StructurePolling');
setupQueueLogging(reconstructionQueue, 'Reconstruction');

export default {
    insightsPollingQueue,
    structurePollingQueue,
    reconstructionQueue,
};
