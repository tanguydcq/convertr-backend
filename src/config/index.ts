import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().default('5').transform(Number),
  ENCRYPTION_MASTER_KEY: z.string()
    .min(1, 'ENCRYPTION_MASTER_KEY is required')
    .refine(
      (val) => {
        if (!val.startsWith('base64:')) return false;
        try {
          return Buffer.from(val.slice(7), 'base64').length === 32;
        } catch {
          return false;
        }
      },
      'ENCRYPTION_MASTER_KEY must be "base64:" followed by 32 base64-encoded bytes'
    ),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();

export type Config = typeof config;
