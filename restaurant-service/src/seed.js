// Seeds demo data on first start so the demo has restaurants to order from.
const SEED = [
  {
    id: 'rest-001', name: 'Spice Garden', cuisine: 'North Indian', city: 'Bengaluru',
    address: '12 MG Road', rating: 4.5,
    items: [
      { id: 'item-101', name: 'Paneer Butter Masala', category: 'Main Course', price: 249, isVeg: true },
      { id: 'item-102', name: 'Butter Naan', category: 'Breads', price: 45, isVeg: true },
      { id: 'item-103', name: 'Chicken Biryani', category: 'Rice', price: 299, isVeg: false },
    ],
  },
  {
    id: 'rest-002', name: 'Dragon Wok', cuisine: 'Chinese', city: 'Bengaluru',
    address: '45 Indiranagar', rating: 4.2,
    items: [
      { id: 'item-201', name: 'Veg Hakka Noodles', category: 'Noodles', price: 189, isVeg: true },
      { id: 'item-202', name: 'Chilli Chicken', category: 'Starters', price: 259, isVeg: false },
    ],
  },
];

async function seed(pool) {
  const { rows } = await pool.query('SELECT COUNT(*) AS count FROM restaurants');
  if (Number(rows[0].count) > 0) return;
  for (const r of SEED) {
    await pool.query(
      `INSERT INTO restaurants (id, name, cuisine, city, address, rating) VALUES ($1, $2, $3, $4, $5, $6)`,
      [r.id, r.name, r.cuisine, r.city, r.address, r.rating]
    );
    for (const i of r.items) {
      await pool.query(
        `INSERT INTO menu_items (id, restaurant_id, name, category, price, is_veg) VALUES ($1, $2, $3, $4, $5, $6)`,
        [i.id, r.id, i.name, i.category, i.price, i.isVeg]
      );
    }
  }
  console.log('[restaurant-service] seeded demo data');
}

module.exports = { seed };
