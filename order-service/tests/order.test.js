const request = require('supertest');
const { newDb } = require('pg-mem');
const { createApp } = require('../src/app');
const { initSchema } = require('../src/db');
const { RestaurantServiceUnavailable, RestaurantNotFound } = require('../src/restaurantClient');

// Stub of the Restaurant Service so the Order Service can be tested independently.
const MENU = {
  'item-101': { name: 'Paneer Butter Masala', unitPrice: 249 },
  'item-102': { name: 'Butter Naan', unitPrice: 45 },
};

const stubClient = {
  mode: 'ok',
  async validateOrderItems(restaurantId, items) {
    if (this.mode === 'down') throw new RestaurantServiceUnavailable('Restaurant service unavailable');
    if (restaurantId !== 'rest-001') throw new RestaurantNotFound(`Restaurant ${restaurantId} not found`);
    const unknown = items.filter((i) => !MENU[i.menuItemId]);
    if (unknown.length) {
      return { valid: false, errors: unknown.map((i) => `Menu item ${i.menuItemId} does not belong to restaurant`), items: [] };
    }
    return {
      valid: true,
      restaurantId,
      restaurantName: 'Spice Garden',
      errors: [],
      items: items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity, ...MENU[i.menuItemId] })),
    };
  },
};

const ORDER = {
  customerId: 'cust-42',
  restaurantId: 'rest-001',
  deliveryAddress: '221B Baker Street, Bengaluru',
  items: [
    { menuItemId: 'item-101', quantity: 2 },
    { menuItemId: 'item-102', quantity: 4 },
  ],
};

let app;
let pool;

beforeEach(async () => {
  const { Pool } = newDb().adapters.createPg();
  pool = new Pool();
  await initSchema(pool);
  stubClient.mode = 'ok';
  app = createApp(pool, stubClient);
});

afterEach(() => pool.end());

describe('Order Service', () => {
  test('places an order with prices from restaurant service', async () => {
    const res = await request(app).post('/api/orders').send(ORDER);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PLACED');
    expect(res.body.restaurantName).toBe('Spice Garden');
    expect(res.body.totalAmount).toBe(2 * 249 + 4 * 45);
    expect(res.body.items).toHaveLength(2);
  });

  test('rejects missing fields', async () => {
    const res = await request(app).post('/api/orders').send({ customerId: 'c' });
    expect(res.status).toBe(400);
  });

  test('returns 422 when restaurant rejects items', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ ...ORDER, items: [{ menuItemId: 'item-999', quantity: 1 }] });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('ORDER_REJECTED');
  });

  test('returns 404 for unknown restaurant', async () => {
    const res = await request(app).post('/api/orders').send({ ...ORDER, restaurantId: 'rest-xyz' });
    expect(res.status).toBe(404);
  });

  test('returns 503 when restaurant service is down', async () => {
    stubClient.mode = 'down';
    const res = await request(app).post('/api/orders').send(ORDER);
    expect(res.status).toBe(503);
  });

  test('tracks order through full lifecycle', async () => {
    const { body: order } = await request(app).post('/api/orders').send(ORDER);
    for (const status of ['ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED']) {
      const res = await request(app).patch(`/api/orders/${order.id}/status`).send({ status });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(status);
    }
    const tracked = await request(app).get(`/api/orders/${order.id}`);
    expect(tracked.body.statusHistory.map((h) => h.status)).toEqual([
      'PLACED', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED',
    ]);
  });

  test('rejects invalid status transition', async () => {
    const { body: order } = await request(app).post('/api/orders').send(ORDER);
    const res = await request(app).patch(`/api/orders/${order.id}/status`).send({ status: 'DELIVERED' });
    expect(res.status).toBe(409);
  });

  test('cancels a placed order but not a delivered one', async () => {
    const { body: order } = await request(app).post('/api/orders').send(ORDER);
    const cancelled = await request(app).post(`/api/orders/${order.id}/cancel`);
    expect(cancelled.body.status).toBe('CANCELLED');
    const again = await request(app).post(`/api/orders/${order.id}/cancel`);
    expect(again.status).toBe(409);
  });

  test('lists order history by customer', async () => {
    await request(app).post('/api/orders').send(ORDER);
    await request(app).post('/api/orders').send({ ...ORDER, customerId: 'cust-7' });
    const res = await request(app).get('/api/orders?customerId=cust-42');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].customerId).toBe('cust-42');
  });
});
