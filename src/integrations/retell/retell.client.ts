/**
 * Retell AI API Client
 * Pure HTTP layer - no business logic
 */

import {
    RetellApiConfig,
    RetellAgent,
    RetellAgentCreateInput,
    RetellCall,
    RetellPhoneCallInput,
    RetellWebCallInput,
} from './retell.types';
import { IntegrationApiError } from '../types';

const RETELL_API_BASE_URL = 'https://api.retellai.com';

interface RetellErrorResponse {
    error_code?: string;
    message?: string;
}

export class RetellClient {
    private readonly baseUrl: string;

    constructor(private readonly config: RetellApiConfig) {
        this.baseUrl = config.baseUrl || RETELL_API_BASE_URL;
    }

    // ===========================================================================
    // Agents
    // ===========================================================================

    /**
     * Create a new agent
     */
    async createAgent(input: RetellAgentCreateInput): Promise<RetellAgent> {
        return this.post<RetellAgent>('/create-agent', input);
    }

    /**
     * Get an agent by ID
     */
    async getAgent(agentId: string): Promise<RetellAgent> {
        return this.get<RetellAgent>(`/get-agent/${agentId}`);
    }

    /**
     * List all agents
     */
    async listAgents(): Promise<RetellAgent[]> {
        return this.get<RetellAgent[]>('/list-agents');
    }

    /**
     * Delete an agent
     */
    async deleteAgent(agentId: string): Promise<void> {
        await this.delete(`/delete-agent/${agentId}`);
    }

    // ===========================================================================
    // Calls
    // ===========================================================================

    /**
     * Create a phone call
     */
    async createPhoneCall(input: RetellPhoneCallInput): Promise<RetellCall> {
        return this.post<RetellCall>('/create-phone-call', input);
    }

    /**
     * Create a web call (returns access token for browser SDK)
     */
    async createWebCall(input: RetellWebCallInput): Promise<{ access_token: string }> {
        return this.post<{ access_token: string }>('/create-web-call', input);
    }

    /**
     * Get a call by ID
     */
    async getCall(callId: string): Promise<RetellCall> {
        return this.get<RetellCall>(`/get-call/${callId}`);
    }

    /**
     * List calls with optional filters
     */
    async listCalls(options?: {
        agentId?: string;
        limit?: number;
        sortOrder?: 'ascending' | 'descending';
    }): Promise<RetellCall[]> {
        const body: Record<string, unknown> = {};

        if (options?.agentId) {
            body.filter_criteria = [{ member: ['agent_id'], operator: 'eq', value: [options.agentId] }];
        }
        if (options?.limit) {
            body.limit = options.limit;
        }
        if (options?.sortOrder) {
            body.sort_order = options.sortOrder;
        }

        return this.post<RetellCall[]>('/list-calls', body);
    }

    // ===========================================================================
    // HTTP Layer
    // ===========================================================================

    private async get<T>(endpoint: string): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        return this.handleResponse<T>(response);
    }

    private async post<T>(endpoint: string, body: unknown): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(body),
        });

        return this.handleResponse<T>(response);
    }

    private async delete(endpoint: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({})) as RetellErrorResponse;
            throw new IntegrationApiError(
                response.status,
                'RETELL',
                error.error_code || 'UNKNOWN',
                error.message || 'Unknown Retell API error',
                error,
            );
        }
    }

    private getHeaders(): Record<string, string> {
        return {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };
    }

    private async handleResponse<T>(response: Response): Promise<T> {
        const json = await response.json() as (T & RetellErrorResponse);

        if (!response.ok) {
            const errorResponse = json as RetellErrorResponse;
            throw new IntegrationApiError(
                response.status,
                'RETELL',
                errorResponse.error_code || 'UNKNOWN',
                errorResponse.message || 'Unknown Retell API error',
                json,
            );
        }

        return json as T;
    }
}

