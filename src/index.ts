import 'dotenv/config'; // Schema Update Restart
import { buildApp } from './app.js';
import { config } from './config/index.js';
import prisma from './lib/prisma.js';
import { redis } from './lib/redis.js';
import { pollingScheduler } from './jobs/polling-scheduler.js';

async function main() {
  try {
    const app = await buildApp();

    // Test database connection
    await prisma.$connect();
    console.log('✓ PostgreSQL connected');

    // Test Redis connection
    await redis.connect();
    await redis.ping();
    console.log('✓ Redis connected');

    // Initialize automatic Meta Ads polling
    await pollingScheduler.initialize();

    // Start server
    await app.listen({ port: config.PORT, host: '0.0.0.0' });

    console.log(`\n🚀 Convertr Backend v2.0.0 running on http://localhost:${config.PORT}`);
    console.log(`   Environment: ${config.NODE_ENV}`);
    console.log(`   Health check: http://localhost:${config.PORT}/health\n`);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
async function shutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

  try {
    // Stop polling jobs first
    await pollingScheduler.shutdown();
    console.log('✓ Polling scheduler stopped');

    await prisma.$disconnect();
    console.log('✓ PostgreSQL disconnected');

    await redis.quit();
    console.log('✓ Redis disconnected');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main();

