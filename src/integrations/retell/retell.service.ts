/**
 * Retell AI Integration Service
 * Business logic for Retell AI integration
 */

import { RetellClient } from './retell.client';
import { mapRetellCallToInternal, mapRetellCallsToInternal } from './retell.mapper';
import {
    RetellApiConfig,
    RetellAgent,
    RetellAgentCreateInput,
    RetellCallInternal,
    RetellPhoneCallInput,
} from './retell.types';

export class RetellService {
    private client: RetellClient | null = null;

    /**
     * Initialize the client with tenant-specific configuration
     */
    private initClient(config: RetellApiConfig): void {
        this.client = new RetellClient(config);
    }

    /**
     * Ensure client is initialized
     */
    private ensureClient(): RetellClient {
        if (!this.client) {
            throw new Error('RetellService not initialized. Call initClient first.');
        }
        return this.client;
    }

    // ===========================================================================
    // Configuration Management
    // ===========================================================================

    /**
     * Get configuration for a tenant
     * TODO: Implement actual storage (database table for integration configs)
     */
    async getConfigForTenant(tenantId: string): Promise<RetellApiConfig | null> {
        // Placeholder - in production, fetch from database
        console.warn(`[RetellService] getConfigForTenant not implemented for tenant ${tenantId}`);
        return null;
    }

    /**
     * Save configuration for a tenant
     * TODO: Implement actual storage
     */
    async saveConfigForTenant(
        tenantId: string,
        _config: RetellApiConfig,
    ): Promise<void> {
        // Placeholder - in production, save to database
        console.warn(`[RetellService] saveConfigForTenant not implemented for tenant ${tenantId}`);
    }

    // ===========================================================================
    // Agents
    // ===========================================================================

    /**
     * Create a new AI agent for a tenant
     */
    async createAgent(
        tenantId: string,
        input: RetellAgentCreateInput,
    ): Promise<RetellAgent> {
        const config = await this.getConfigForTenant(tenantId);
        if (!config) {
            throw new Error('Retell integration not configured for this tenant');
        }

        this.initClient(config);
        return this.ensureClient().createAgent(input);
    }

    /**
     * List all agents for a tenant
     */
    async listAgents(tenantId: string): Promise<RetellAgent[]> {
        const config = await this.getConfigForTenant(tenantId);
        if (!config) {
            return [];
        }

        this.initClient(config);
        return this.ensureClient().listAgents();
    }

    /**
     * Get an agent by ID
     */
    async getAgent(tenantId: string, agentId: string): Promise<RetellAgent | null> {
        const config = await this.getConfigForTenant(tenantId);
        if (!config) {
            return null;
        }

        this.initClient(config);
        try {
            return await this.ensureClient().getAgent(agentId);
        } catch {
            return null;
        }
    }

    // ===========================================================================
    // Calls
    // ===========================================================================

    /**
     * Initiate an outbound phone call
     */
    async initiatePhoneCall(
        tenantId: string,
        input: Omit<RetellPhoneCallInput, 'agent_id'> & { agentId: string },
    ): Promise<RetellCallInternal> {
        const config = await this.getConfigForTenant(tenantId);
        if (!config) {
            throw new Error('Retell integration not configured for this tenant');
        }

        this.initClient(config);
        const call = await this.ensureClient().createPhoneCall({
            from_number: input.from_number,
            to_number: input.to_number,
            agent_id: input.agentId,
            metadata: input.metadata,
            retell_llm_dynamic_variables: input.retell_llm_dynamic_variables,
        });

        return mapRetellCallToInternal(call);
    }

    /**
     * Get a web call access token for browser SDK
     */
    async getWebCallToken(tenantId: string, agentId: string): Promise<string> {
        const config = await this.getConfigForTenant(tenantId);
        if (!config) {
            throw new Error('Retell integration not configured for this tenant');
        }

        this.initClient(config);
        const result = await this.ensureClient().createWebCall({ agent_id: agentId });
        return result.access_token;
    }

    /**
     * Get call details
     */
    async getCall(tenantId: string, callId: string): Promise<RetellCallInternal | null> {
        const config = await this.getConfigForTenant(tenantId);
        if (!config) {
            return null;
        }

        this.initClient(config);
        try {
            const call = await this.ensureClient().getCall(callId);
            return mapRetellCallToInternal(call);
        } catch {
            return null;
        }
    }

    /**
     * List recent calls for an agent
     */
    async listCallsForAgent(
        tenantId: string,
        agentId: string,
        limit = 50,
    ): Promise<RetellCallInternal[]> {
        const config = await this.getConfigForTenant(tenantId);
        if (!config) {
            return [];
        }

        this.initClient(config);
        const calls = await this.ensureClient().listCalls({
            agentId,
            limit,
            sortOrder: 'descending',
        });

        return mapRetellCallsToInternal(calls);
    }

    /**
     * List all recent calls for a tenant
     */
    async listRecentCalls(tenantId: string, limit = 100): Promise<RetellCallInternal[]> {
        const config = await this.getConfigForTenant(tenantId);
        if (!config) {
            return [];
        }

        this.initClient(config);
        const calls = await this.ensureClient().listCalls({
            limit,
            sortOrder: 'descending',
        });

        return mapRetellCallsToInternal(calls);
    }
}

// Singleton instance
export const retellService = new RetellService();
