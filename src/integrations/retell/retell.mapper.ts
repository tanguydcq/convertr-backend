/**
 * Retell AI Data Mappers
 * Transforms Retell API responses to internal domain models
 */

import { RetellCall, RetellCallInternal } from './retell.types';

/**
 * Map call status from Retell to internal representation
 */
function mapCallStatus(status: RetellCall['call_status']): RetellCallInternal['status'] {
    switch (status) {
        case 'registered':
            return 'pending';
        case 'ongoing':
            return 'active';
        case 'ended':
            return 'completed';
        case 'error':
            return 'failed';
        default:
            return 'pending';
    }
}

/**
 * Calculate call duration in seconds
 */
function calculateDuration(startTimestamp?: number, endTimestamp?: number): number | null {
    if (!startTimestamp || !endTimestamp) {
        return null;
    }
    return Math.round((endTimestamp - startTimestamp) / 1000);
}

/**
 * Map a Retell call to our internal representation
 */
export function mapRetellCallToInternal(call: RetellCall): RetellCallInternal {
    return {
        externalId: call.call_id,
        agentId: call.agent_id,
        status: mapCallStatus(call.call_status),
        direction: call.direction || null,
        fromNumber: call.from_number || null,
        toNumber: call.to_number || null,
        startedAt: call.start_timestamp ? new Date(call.start_timestamp) : null,
        endedAt: call.end_timestamp ? new Date(call.end_timestamp) : null,
        durationSeconds: calculateDuration(call.start_timestamp, call.end_timestamp),
        transcript: call.transcript || null,
        recordingUrl: call.recording_url || null,
        summary: call.call_analysis?.call_summary || null,
        sentiment: call.call_analysis?.user_sentiment || null,
        successful: call.call_analysis?.call_successful ?? null,
    };
}

/**
 * Map multiple Retell calls to internal representation
 */
export function mapRetellCallsToInternal(calls: RetellCall[]): RetellCallInternal[] {
    return calls.map(mapRetellCallToInternal);
}
