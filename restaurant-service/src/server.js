const { createApp } = require('./app');
const { createPool, initSchema, waitForDb } = require('./db');
const { seed } = require('./seed');

const PORT = parseInt(process.env.PORT || '3001', 10);

async function main() {
  const pool = createPool();
  await waitForDb(pool);
  await initSchema(pool);
  if (process.env.SEED_DATA !== 'false') await seed(pool);

  const server = createApp(pool).listen(PORT, () => {
    console.log(`[restaurant-service] listening on port ${PORT}`);
  });

  const shutdown = () => {
    console.log('[restaurant-service] shutting down');
    server.close(() => pool.end().then(() => process.exit(0)));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('[restaurant-service] failed to start:', err);
  process.exit(1);
});
