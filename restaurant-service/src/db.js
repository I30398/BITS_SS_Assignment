const { Pool } = require('pg');

function createPool() {
  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'restaurant_user',
    password: process.env.DB_PASSWORD || 'restaurant_pass',
    database: process.env.DB_NAME || 'restaurant_db',
    max: 10,
  });
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS restaurants (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    cuisine     TEXT NOT NULL,
    city        TEXT NOT NULL,
    address     TEXT,
    rating      NUMERIC(2,1) DEFAULT 0,
    is_open     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id             TEXT PRIMARY KEY,
    restaurant_id  TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    description    TEXT,
    category       TEXT,
    price          NUMERIC(10,2) NOT NULL,
    is_veg         BOOLEAN NOT NULL DEFAULT TRUE,
    available      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

async function initSchema(pool) {
  await pool.query(SCHEMA);
}

// Retries the initial connection so the service survives the DB pod starting later.
async function waitForDb(pool, retries = 20, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      console.log(`[db] not ready (attempt ${attempt}/${retries}): ${err.message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('Database not reachable');
}

module.exports = { createPool, initSchema, waitForDb };
