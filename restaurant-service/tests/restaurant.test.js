const request = require('supertest');
const { newDb } = require('pg-mem');
const { createApp } = require('../src/app');
const { initSchema } = require('../src/db');
const { seed } = require('../src/seed');

let app;
let pool;

beforeEach(async () => {
  const { Pool } = newDb().adapters.createPg();
  pool = new Pool();
  await initSchema(pool);
  await seed(pool);
  app = createApp(pool);
});

afterEach(() => pool.end());

describe('Restaurant Service', () => {
  test('GET /health reports UP', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
  });

  test('lists seeded restaurants and filters by cuisine', async () => {
    const all = await request(app).get('/api/restaurants');
    expect(all.body).toHaveLength(2);
    const chinese = await request(app).get('/api/restaurants?cuisine=chinese');
    expect(chinese.body).toHaveLength(1);
    expect(chinese.body[0].name).toBe('Dragon Wok');
  });

  test('registers a restaurant and adds a menu item', async () => {
    const created = await request(app)
      .post('/api/restaurants')
      .send({ name: 'Dosa Corner', cuisine: 'South Indian', city: 'Chennai', rating: 4.1 });
    expect(created.status).toBe(201);
    expect(created.body.id).toMatch(/^rest-/);

    const item = await request(app)
      .post(`/api/restaurants/${created.body.id}/menu`)
      .send({ name: 'Masala Dosa', price: 99, category: 'Breakfast' });
    expect(item.status).toBe(201);
    expect(item.body.price).toBe(99);

    const menu = await request(app).get(`/api/restaurants/${created.body.id}/menu`);
    expect(menu.body.items).toHaveLength(1);
  });

  test('rejects invalid restaurant payload', async () => {
    const res = await request(app).post('/api/restaurants').send({ name: 'X' });
    expect(res.status).toBe(400);
  });

  test('returns 404 for unknown restaurant', async () => {
    const res = await request(app).get('/api/restaurants/rest-nope');
    expect(res.status).toBe(404);
  });

  test('validate returns authoritative prices', async () => {
    const res = await request(app)
      .post('/api/restaurants/rest-001/menu/validate')
      .send({ items: [{ menuItemId: 'item-101', quantity: 2 }, { menuItemId: 'item-102', quantity: 3 }] });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.items).toEqual([
      { menuItemId: 'item-101', name: 'Paneer Butter Masala', unitPrice: 249, quantity: 2 },
      { menuItemId: 'item-102', name: 'Butter Naan', unitPrice: 45, quantity: 3 },
    ]);
  });

  test('validate flags items from another restaurant and unavailable items', async () => {
    await request(app).patch('/api/restaurants/rest-001/menu/item-102').send({ available: false });
    const res = await request(app)
      .post('/api/restaurants/rest-001/menu/validate')
      .send({ items: [{ menuItemId: 'item-201', quantity: 1 }, { menuItemId: 'item-102', quantity: 1 }] });
    expect(res.body.valid).toBe(false);
    expect(res.body.errors).toHaveLength(2);
  });

  test('validate rejects orders when restaurant is closed', async () => {
    await request(app).patch('/api/restaurants/rest-002/status').send({ isOpen: false });
    const res = await request(app)
      .post('/api/restaurants/rest-002/menu/validate')
      .send({ items: [{ menuItemId: 'item-201', quantity: 1 }] });
    expect(res.body.valid).toBe(false);
    expect(res.body.errors).toContain('Restaurant is currently closed');
  });
});
