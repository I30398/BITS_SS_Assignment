const express = require('express');
const { randomUUID } = require('crypto');
const { STATUSES, TRANSITIONS, canTransition } = require('../orderStatus');
const { RestaurantServiceUnavailable, RestaurantNotFound } = require('../restaurantClient');

function badRequest(res, message, details) {
  return res.status(400).json({ error: 'BAD_REQUEST', message, details });
}

function notFound(res, message) {
  return res.status(404).json({ error: 'NOT_FOUND', message });
}

function toOrder(row, items, history) {
  return {
    id: row.id,
    customerId: row.customer_id,
    restaurantId: row.restaurant_id,
    restaurantName: row.restaurant_name,
    deliveryAddress: row.delivery_address,
    status: row.status,
    totalAmount: Number(row.total_amount),
    items: items.map((i) => ({
      menuItemId: i.menu_item_id,
      name: i.name,
      unitPrice: Number(i.unit_price),
      quantity: i.quantity,
      lineTotal: Number(i.unit_price) * i.quantity,
    })),
    statusHistory: history.map((h) => ({ status: h.status, changedAt: h.changed_at })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = function orderRoutes(pool, restaurantClient) {
  const router = express.Router();

  async function loadOrder(id) {
    const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (!rows[0]) return null;
    const items = await pool.query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [id]);
    const history = await pool.query(
      'SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY id',
      [id]
    );
    return toOrder(rows[0], items.rows, history.rows);
  }

  async function changeStatus(id, newStatus) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT status FROM orders WHERE id = $1', [id]);
      if (!rows[0]) {
        await client.query('ROLLBACK');
        return { notFound: true };
      }
      if (!canTransition(rows[0].status, newStatus)) {
        await client.query('ROLLBACK');
        return { invalid: true, from: rows[0].status };
      }
      await client.query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', [newStatus, id]);
      await client.query('INSERT INTO order_status_history (order_id, status) VALUES ($1, $2)', [id, newStatus]);
      await client.query('COMMIT');
      return { ok: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // COMMAND: placeOrder
  // Collaborates synchronously with Restaurant Service to validate items and obtain prices.
  router.post('/', async (req, res, next) => {
    try {
      const { customerId, restaurantId, deliveryAddress, items } = req.body || {};
      if (!customerId || !restaurantId || !deliveryAddress) {
        return badRequest(res, 'customerId, restaurantId and deliveryAddress are required');
      }
      if (!Array.isArray(items) || items.length === 0) {
        return badRequest(res, 'items must be a non-empty array of { menuItemId, quantity }');
      }

      let validation;
      try {
        validation = await restaurantClient.validateOrderItems(restaurantId, items);
      } catch (err) {
        if (err instanceof RestaurantNotFound) return notFound(res, err.message);
        if (err instanceof RestaurantServiceUnavailable) {
          return res.status(503).json({ error: 'SERVICE_UNAVAILABLE', message: err.message });
        }
        if (err.response && err.response.status === 400) {
          return badRequest(res, 'Order items rejected by restaurant service', err.response.data);
        }
        throw err;
      }

      if (!validation.valid) {
        return res.status(422).json({
          error: 'ORDER_REJECTED',
          message: 'Order could not be validated by restaurant service',
          details: validation.errors,
        });
      }

      const total = validation.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
      const id = `ord-${randomUUID().slice(0, 8)}`;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `INSERT INTO orders (id, customer_id, restaurant_id, restaurant_name, delivery_address, status, total_amount)
           VALUES ($1, $2, $3, $4, $5, 'PLACED', $6)`,
          [id, customerId, restaurantId, validation.restaurantName, deliveryAddress, total]
        );
        for (const i of validation.items) {
          await client.query(
            `INSERT INTO order_items (order_id, menu_item_id, name, unit_price, quantity)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, i.menuItemId, i.name, i.unitPrice, i.quantity]
          );
        }
        await client.query('INSERT INTO order_status_history (order_id, status) VALUES ($1, $2)', [id, 'PLACED']);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      res.status(201).json(await loadOrder(id));
    } catch (err) {
      next(err);
    }
  });

  // QUERY: getOrderHistory (by customer and/or restaurant, optional status)
  router.get('/', async (req, res, next) => {
    try {
      const clauses = [];
      const params = [];
      for (const [param, column] of [['customerId', 'customer_id'], ['restaurantId', 'restaurant_id'], ['status', 'status']]) {
        if (req.query[param]) {
          params.push(req.query[param]);
          clauses.push(`${column} = $${params.length}`);
        }
      }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const { rows } = await pool.query(`SELECT id FROM orders ${where} ORDER BY created_at DESC`, params);
      const orders = [];
      for (const r of rows) orders.push(await loadOrder(r.id));
      res.json(orders);
    } catch (err) {
      next(err);
    }
  });

  // QUERY: trackOrder
  router.get('/:id', async (req, res, next) => {
    try {
      const order = await loadOrder(req.params.id);
      if (!order) return notFound(res, `Order ${req.params.id} not found`);
      res.json(order);
    } catch (err) {
      next(err);
    }
  });

  // COMMAND: updateOrderStatus (restaurant accepts / prepares, delivery agent delivers)
  router.patch('/:id/status', async (req, res, next) => {
    try {
      const { status } = req.body || {};
      if (!STATUSES.includes(status)) {
        return badRequest(res, `status must be one of ${STATUSES.join(', ')}`);
      }
      const result = await changeStatus(req.params.id, status);
      if (result.notFound) return notFound(res, `Order ${req.params.id} not found`);
      if (result.invalid) {
        return res.status(409).json({
          error: 'INVALID_TRANSITION',
          message: `Cannot move order from ${result.from} to ${status}`,
          allowed: TRANSITIONS[result.from],
        });
      }
      res.json(await loadOrder(req.params.id));
    } catch (err) {
      next(err);
    }
  });

  // COMMAND: cancelOrder
  router.post('/:id/cancel', async (req, res, next) => {
    try {
      const result = await changeStatus(req.params.id, 'CANCELLED');
      if (result.notFound) return notFound(res, `Order ${req.params.id} not found`);
      if (result.invalid) {
        return res.status(409).json({
          error: 'INVALID_TRANSITION',
          message: `Order in status ${result.from} can no longer be cancelled`,
        });
      }
      res.json(await loadOrder(req.params.id));
    } catch (err) {
      next(err);
    }
  });

  return router;
};
