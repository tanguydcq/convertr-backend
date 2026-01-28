import { Prisma } from '@prisma/client';
import prisma from './prisma.js';

/**
 * Execute a function within a transaction that has RLS context set.
 * 
 * @param organisationId - The UUID of the organisation to impersonate
 * @param callback - The async function to execute. Uses the transactional prisma client.
 */
export async function withRLS<T>(
    organisationId: string,
    callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
    return prisma.$transaction(async (tx) => {
        // 1. Set the session variable for the current transaction
        // We use executeRawUnsafe because parametrizing SET commands is sometimes tricky in PG, 
        // but UUID validation should be ensured by caller or we can sanitize.
        // Ideally use a parameterized query if possible: `SELECT set_config('app.org_id', $1, true)`
        await tx.$executeRaw`SELECT set_config('app.org_id', ${organisationId}, true)`;

        // 2. Execute the callback
        return callback(tx);
    });
}
