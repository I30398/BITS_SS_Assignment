const axios = require('axios');

class RestaurantServiceUnavailable extends Error {}
class RestaurantNotFound extends Error {}

// Synchronous REST client for the Restaurant Service.
// Resolved through Kubernetes DNS (http://restaurant-service:3001) inside the cluster.
function createRestaurantClient({
  baseURL = process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3001',
  timeoutMs = parseInt(process.env.RESTAURANT_TIMEOUT_MS || '3000', 10),
  retries = 2,
} = {}) {
  const http = axios.create({ baseURL, timeout: timeoutMs });

  async function validateOrderItems(restaurantId, items) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const { data } = await http.post(
          `/api/restaurants/${encodeURIComponent(restaurantId)}/menu/validate`,
          { items }
        );
        return data;
      } catch (err) {
        if (err.response && err.response.status === 404) {
          throw new RestaurantNotFound(`Restaurant ${restaurantId} not found`);
        }
        if (err.response && err.response.status < 500) throw err;
        lastError = err;
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      }
    }
    throw new RestaurantServiceUnavailable(`Restaurant service unavailable: ${lastError.message}`);
  }

  return { validateOrderItems };
}

module.exports = { createRestaurantClient, RestaurantServiceUnavailable, RestaurantNotFound };
