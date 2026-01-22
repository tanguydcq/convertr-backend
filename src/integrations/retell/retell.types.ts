/**
 * Retell AI API Types
 * Based on Retell AI API documentation
 */

// ============================================================================
// API Configuration
// ============================================================================

export interface RetellApiConfig {
    apiKey: string;
    baseUrl?: string;
}

// ============================================================================
// Agent Types
// ============================================================================

export interface RetellAgent {
    agent_id: string;
    agent_name: string;
    voice_id: string;
    language: string;
    llm_websocket_url: string;
    webhook_url?: string;
    created_at: string;
    last_modification_timestamp: number;
}

export interface RetellAgentCreateInput {
    agent_name: string;
    voice_id: string;
    language?: string;
    llm_websocket_url: string;
    webhook_url?: string;
}

// ============================================================================
// Call Types
// ============================================================================

export interface RetellCall {
    call_id: string;
    agent_id: string;
    call_status: 'registered' | 'ongoing' | 'ended' | 'error';
    call_type: 'web_call' | 'phone_call';
    from_number?: string;
    to_number?: string;
    direction?: 'inbound' | 'outbound';
    start_timestamp?: number;
    end_timestamp?: number;
    transcript?: string;
    recording_url?: string;
    disconnection_reason?: string;
    call_analysis?: RetellCallAnalysis;
}

export interface RetellCallAnalysis {
    call_summary?: string;
    user_sentiment?: 'positive' | 'neutral' | 'negative';
    call_successful?: boolean;
    custom_analysis_data?: Record<string, unknown>;
}

export interface RetellPhoneCallInput {
    from_number: string;
    to_number: string;
    agent_id: string;
    metadata?: Record<string, string>;
    retell_llm_dynamic_variables?: Record<string, string>;
}

export interface RetellWebCallInput {
    agent_id: string;
    metadata?: Record<string, string>;
    retell_llm_dynamic_variables?: Record<string, string>;
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface RetellWebhookPayload {
    event: 'call_started' | 'call_ended' | 'call_analyzed';
    call: RetellCall;
}

// ============================================================================
// Internal Domain Types (after mapping)
// ============================================================================

export interface RetellCallInternal {
    externalId: string;
    agentId: string;
    status: 'pending' | 'active' | 'completed' | 'failed';
    direction: 'inbound' | 'outbound' | null;
    fromNumber: string | null;
    toNumber: string | null;
    startedAt: Date | null;
    endedAt: Date | null;
    durationSeconds: number | null;
    transcript: string | null;
    recordingUrl: string | null;
    summary: string | null;
    sentiment: 'positive' | 'neutral' | 'negative' | null;
    successful: boolean | null;
}
