/**
 * Jobs Module
 * Barrel export and initialization for all worker jobs
 */

// Import job handlers to register processors
import './insights-polling.job.js';
import './structure-polling.job.js';
import './timeseries-reconstruction.job.js';

// Export queue functions
export {
    insightsPollingQueue,
    structurePollingQueue,
    reconstructionQueue,
} from './queue.js';

export { scheduleInsightsPolling, stopInsightsPolling } from './insights-polling.job.js';
export { scheduleStructurePolling, stopStructurePolling } from './structure-polling.job.js';
export { queueReconstruction } from './timeseries-reconstruction.job.js';

console.log('✓ Job workers initialized');
