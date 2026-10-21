const express = require('express');
const { randomUUID } = require('crypto');
const { toRestaurant, toMenuItem } = require('../mappers');

function badRequest(res, message) {
  return res.status(400).json({ error: 'BAD_REQUEST', message });
}

function notFound(res, message) {
  return res.status(404).json({ error: 'NOT_FOUND', message });
}

module.exports = function restaurantRoutes(pool) {
  const router = express.Router();

  async function findRestaurant(id) {
    const { rows } = await pool.query('SELECT * FROM restaurants WHERE id = $1', [id]);
    return rows[0];
  }

  // COMMAND: registerRestaurant
  router.post('/', async (req, res, next) => {
    try {
      const { name, cuisine, city, address, rating } = req.body || {};
      if (!name || !cuisine || !city) {
        return badRequest(res, 'name, cuisine and city are required');
      }
      if (rating !== undefined && (typeof rating !== 'number' || rating < 0 || rating > 5)) {
        return badRequest(res, 'rating must be a number between 0 and 5');
      }
      const id = `rest-${randomUUID().slice(0, 8)}`;
      const { rows } = await pool.query(
        `INSERT INTO restaurants (id, name, cuisine, city, address, rating)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [id, name, cuisine, city, address || null, rating || 0]
      );
      res.status(201).json(toRestaurant(rows[0]));
    } catch (err) {
      next(err);
    }
  });

  // QUERY: searchRestaurants (optional filters: city, cuisine, open)
  router.get('/', async (req, res, next) => {
    try {
      const clauses = [];
      const params = [];
      if (req.query.city) {
        params.push(req.query.city.toLowerCase());
        clauses.push(`LOWER(city) = $${params.length}`);
      }
      if (req.query.cuisine) {
        params.push(req.query.cuisine.toLowerCase());
        clauses.push(`LOWER(cuisine) = $${params.length}`);
      }
      if (req.query.open !== undefined) {
        params.push(req.query.open === 'true');
        clauses.push(`is_open = $${params.length}`);
      }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const { rows } = await pool.query(
        `SELECT * FROM restaurants ${where} ORDER BY created_at`,
        params
      );
      res.json(rows.map(toRestaurant));
    } catch (err) {
      next(err);
    }
  });

  // QUERY: getRestaurantDetails
  router.get('/:id', async (req, res, next) => {
    try {
      const restaurant = await findRestaurant(req.params.id);
      if (!restaurant) return notFound(res, `Restaurant ${req.params.id} not found`);
      res.json(toRestaurant(restaurant));
    } catch (err) {
      next(err);
    }
  });

  // COMMAND: openOrCloseRestaurant
  router.patch('/:id/status', async (req, res, next) => {
    try {
      const { isOpen } = req.body || {};
      if (typeof isOpen !== 'boolean') return badRequest(res, 'isOpen (boolean) is required');
      const { rows } = await pool.query(
        'UPDATE restaurants SET is_open = $1 WHERE id = $2 RETURNING *',
        [isOpen, req.params.id]
      );
      if (!rows[0]) return notFound(res, `Restaurant ${req.params.id} not found`);
      res.json(toRestaurant(rows[0]));
    } catch (err) {
      next(err);
    }
  });

  // COMMAND: addMenuItem
  router.post('/:id/menu', async (req, res, next) => {
    try {
      const restaurant = await findRestaurant(req.params.id);
      if (!restaurant) return notFound(res, `Restaurant ${req.params.id} not found`);
      const { name, description, category, price, isVeg } = req.body || {};
      if (!name || typeof price !== 'number' || price <= 0) {
        return badRequest(res, 'name and a positive numeric price are required');
      }
      const id = `item-${randomUUID().slice(0, 8)}`;
      const { rows } = await pool.query(
        `INSERT INTO menu_items (id, restaurant_id, name, description, category, price, is_veg)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [id, req.params.id, name, description || null, category || null, price, isVeg !== false]
      );
      res.status(201).json(toMenuItem(rows[0]));
    } catch (err) {
      next(err);
    }
  });

  // QUERY: browseMenu
  router.get('/:id/menu', async (req, res, next) => {
    try {
      const restaurant = await findRestaurant(req.params.id);
      if (!restaurant) return notFound(res, `Restaurant ${req.params.id} not found`);
      const { rows } = await pool.query(
        'SELECT * FROM menu_items WHERE restaurant_id = $1 ORDER BY created_at',
        [req.params.id]
      );
      res.json({ restaurant: toRestaurant(restaurant), items: rows.map(toMenuItem) });
    } catch (err) {
      next(err);
    }
  });

  // COMMAND: updateMenuItem (price / availability)
  router.patch('/:id/menu/:itemId', async (req, res, next) => {
    try {
      const { price, available } = req.body || {};
      if (price === undefined && available === undefined) {
        return badRequest(res, 'price and/or available must be provided');
      }
      if (price !== undefined && (typeof price !== 'number' || price <= 0)) {
        return badRequest(res, 'price must be a positive number');
      }
      if (available !== undefined && typeof available !== 'boolean') {
        return badRequest(res, 'available must be boolean');
      }
      const { rows: existing } = await pool.query(
        'SELECT * FROM menu_items WHERE id = $1 AND restaurant_id = $2',
        [req.params.itemId, req.params.id]
      );
      if (!existing[0]) return notFound(res, `Menu item ${req.params.itemId} not found`);
      const newPrice = price !== undefined ? price : Number(existing[0].price);
      const newAvailable = available !== undefined ? available : existing[0].available;
      const { rows } = await pool.query(
        'UPDATE menu_items SET price = $1, available = $2 WHERE id = $3 RETURNING *',
        [newPrice, newAvailable, req.params.itemId]
      );
      res.json(toMenuItem(rows[0]));
    } catch (err) {
      next(err);
    }
  });

  // INTERNAL QUERY used by Order Service: validateOrderItems.
  // Body: { items: [{ menuItemId, quantity }] }
  // Returns authoritative names/prices so the Order Service never trusts client prices.
  router.post('/:id/menu/validate', async (req, res, next) => {
    try {
      const restaurant = await findRestaurant(req.params.id);
      if (!restaurant) return notFound(res, `Restaurant ${req.params.id} not found`);
      const items = (req.body && req.body.items) || [];
      if (!Array.isArray(items) || items.length === 0) {
        return badRequest(res, 'items must be a non-empty array');
      }

      const errors = [];
      if (!restaurant.is_open) errors.push('Restaurant is currently closed');

      const ids = items.map((i) => i.menuItemId);
      const placeholders = ids.map((_, idx) => `$${idx + 2}`).join(', ');
      const { rows } = await pool.query(
        `SELECT * FROM menu_items WHERE restaurant_id = $1 AND id IN (${placeholders})`,
        [req.params.id, ...ids]
      );
      const byId = new Map(rows.map((r) => [r.id, r]));

      const pricedItems = [];
      for (const item of items) {
        const row = byId.get(item.menuItemId);
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
          errors.push(`Invalid quantity for ${item.menuItemId}`);
        } else if (!row) {
          errors.push(`Menu item ${item.menuItemId} does not belong to restaurant`);
        } else if (!row.available) {
          errors.push(`Menu item ${row.name} is not available`);
        } else {
          pricedItems.push({
            menuItemId: row.id,
            name: row.name,
            unitPrice: Number(row.price),
            quantity: item.quantity,
          });
        }
      }

      res.json({
        valid: errors.length === 0,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        errors,
        items: errors.length === 0 ? pricedItems : [],
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
