import './types/express.d.ts';
import { createApp } from './app';
import { config } from './config';
import prisma from './lib/prisma';

const app = createApp();

async function main() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✓ Database connected');

    // Start server
    app.listen(config.PORT, () => {
      console.log(`\n🚀 Convertr Backend running on http://localhost:${config.PORT}`);
      console.log(`   Environment: ${config.NODE_ENV}`);
      console.log(`   Health check: http://localhost:${config.PORT}/health\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

main();
