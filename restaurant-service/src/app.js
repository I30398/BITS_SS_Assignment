const express = require('express');
const os = require('os');
const restaurantRoutes = require('./routes/restaurants');

function createApp(pool) {
  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'test') console.log(`[restaurant-service] ${req.method} ${req.originalUrl}`);
    next();
  });

  app.get('/health', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ service: 'restaurant-service', status: 'UP', db: 'UP', pod: os.hostname() });
    } catch (err) {
      res.status(503).json({ service: 'restaurant-service', status: 'DOWN', db: 'DOWN', pod: os.hostname() });
    }
  });

  app.use('/api/restaurants', restaurantRoutes(pool));

  app.use((req, res) => res.status(404).json({ error: 'NOT_FOUND', message: 'Route not found' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Malformed JSON body' });
    }
    console.error('[restaurant-service] error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Unexpected server error' });
  });

  return app;
}

module.exports = { createApp };
