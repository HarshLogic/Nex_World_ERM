const app = require('./app');
const env = require('./config/env');
const prisma = require('./config/prisma');
const bootstrapAdmin = require('../scripts/bootstrap-admin');

const port = env.PORT || 5000;
const instanceId = process.env.INSTANCE_ID || 'api-standalone';

const server = app.listen(port, async () => {
  console.log(`[ERP REST API] Instance ${instanceId} listening on port ${port} in ${env.NODE_ENV} mode`);

  // Non-blocking database connection check & automatic admin bootstrap
  try {
    if (prisma && typeof prisma.$connect === 'function') {
      await prisma.$connect();
      console.log('[DATABASE] PostgreSQL connected successfully.');

      try {
        await bootstrapAdmin();
      } catch (bootErr) {
        console.warn('[ADMIN BOOTSTRAP NOTICE]:', bootErr.message);
      }
    }
  } catch (dbErr) {
    console.warn('[DATABASE WARNING] PostgreSQL not reachable on startup:', dbErr.message);
    console.warn('[DATABASE WARNING] Server remains active; queries will retry automatically upon request.');
  }
});

// Graceful Shutdown
function handleShutdown(signal) {
  console.log(`[SHUTDOWN] Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    console.log('[SHUTDOWN] Closed all active HTTP connections.');

    try {
      if (prisma && typeof prisma.$disconnect === 'function') {
        await prisma.$disconnect();
        console.log('[SHUTDOWN] Prisma database connection pool closed.');
      }
    } catch (e) {
      console.error('[SHUTDOWN ERROR]:', e);
    }

    process.exit(0);
  });

  // Force exit after 10 seconds if hanging
  setTimeout(() => {
    console.error('[SHUTDOWN] Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
