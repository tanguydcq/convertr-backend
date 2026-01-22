import { z } from 'zod';

export const createTenantSchema = z.object({
  name: z.string().min(1, 'Tenant name is required').max(255),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
