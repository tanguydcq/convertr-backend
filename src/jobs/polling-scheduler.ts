/**
 * Polling Scheduler
 * Manages automatic Meta Ads data polling for all connected organisations
 */

import prisma from '../lib/prisma.js';
import { scheduleInsightsPolling, stopInsightsPolling } from './insights-polling.job.js';
import { scheduleStructurePolling, stopStructurePolling } from './structure-polling.job.js';
import {
    insightsPollingQueue,
    structurePollingQueue,
    reconstructionQueue,
} from './queue.js';

// Polling intervals (in milliseconds)
const INSIGHTS_POLLING_INTERVAL = 2 * 60 * 1000; // 2 minutes
const STRUCTURE_POLLING_INTERVAL = 10 * 60 * 1000; // 10 minutes

interface ActivePolling {
    organisationId: string;
    adAccountId: string;
}

class PollingScheduler {
    private activePollings: ActivePolling[] = [];
    private isInitialized = false;

    /**
     * Initialize polling for all organisations with Meta credentials
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            console.log('[PollingScheduler] Already initialized');
            return;
        }

        console.log('[PollingScheduler] Initializing automatic data polling...');

        try {
            // Find all organisations with Meta credentials
            const credentials = await prisma.credential.findMany({
                where: { provider: 'meta_ads' },
                select: { organisationId: true },
            });

            const uniqueOrgIds = [...new Set(credentials.map(c => c.organisationId))];
            console.log(`[PollingScheduler] Found ${uniqueOrgIds.length} organisations with Meta credentials`);

            for (const organisationId of uniqueOrgIds) {
                await this.startPollingForOrganisation(organisationId);
            }

            this.isInitialized = true;
            console.log(`[PollingScheduler] ✓ Initialized with ${this.activePollings.length} active polling jobs`);
        } catch (error) {
            console.error('[PollingScheduler] Failed to initialize:', error);
        }
    }

    /**
     * Start polling for a specific organisation
     */
    async startPollingForOrganisation(organisationId: string): Promise<void> {
        try {
            // Get the organisation's connected ad accounts
            const adAccounts = await prisma.adAccount.findMany({
                where: { organisationId },
                select: { id: true, externalId: true, name: true },
            });

            if (adAccounts.length === 0) {
                console.log(`[PollingScheduler] No ad accounts for org ${organisationId}, skipping`);
                return;
            }

            // Schedule insights polling (org-level - syncs all campaigns)
            await scheduleInsightsPolling(organisationId, INSIGHTS_POLLING_INTERVAL);

            // Schedule structure polling for each ad account
            for (const account of adAccounts) {
                await scheduleStructurePolling(
                    organisationId,
                    account.externalId,
                    STRUCTURE_POLLING_INTERVAL
                );

                this.activePollings.push({
                    organisationId,
                    adAccountId: account.externalId,
                });

                console.log(`[PollingScheduler] Started polling for account ${account.name} (${account.externalId})`);
            }
        } catch (error) {
            console.error(`[PollingScheduler] Failed to start polling for org ${organisationId}:`, error);
        }
    }

    /**
     * Stop polling for a specific organisation
     */
    async stopPollingForOrganisation(organisationId: string): Promise<void> {
        try {
            await stopInsightsPolling(organisationId);

            const orgPollings = this.activePollings.filter(p => p.organisationId === organisationId);
            for (const polling of orgPollings) {
                await stopStructurePolling(organisationId, polling.adAccountId);
            }

            this.activePollings = this.activePollings.filter(p => p.organisationId !== organisationId);
            console.log(`[PollingScheduler] Stopped polling for org ${organisationId}`);
        } catch (error) {
            console.error(`[PollingScheduler] Failed to stop polling for org ${organisationId}:`, error);
        }
    }

    /**
     * Trigger immediate sync for an organisation (on-demand)
     */
    async triggerImmediateSync(organisationId: string): Promise<void> {
        const adAccounts = await prisma.adAccount.findMany({
            where: { organisationId },
            select: { externalId: true },
        });

        // Trigger structure sync for each account
        for (const account of adAccounts) {
            await structurePollingQueue.add({
                organisationId,
                adAccountId: account.externalId,
            });
        }

        // Trigger insights sync
        await insightsPollingQueue.add({ organisationId });

        console.log(`[PollingScheduler] Triggered immediate sync for org ${organisationId}`);
    }

    /**
     * Graceful shutdown - stop all polling jobs
     */
    async shutdown(): Promise<void> {
        console.log('[PollingScheduler] Shutting down...');

        try {
            // Close all queues
            await insightsPollingQueue.close();
            await structurePollingQueue.close();
            await reconstructionQueue.close();

            this.activePollings = [];
            this.isInitialized = false;

            console.log('[PollingScheduler] ✓ Shutdown complete');
        } catch (error) {
            console.error('[PollingScheduler] Error during shutdown:', error);
        }
    }

    /**
     * Get status of all active pollings
     */
    getStatus(): { isInitialized: boolean; activePollings: ActivePolling[] } {
        return {
            isInitialized: this.isInitialized,
            activePollings: [...this.activePollings],
        };
    }
}

export const pollingScheduler = new PollingScheduler();
