# Order Service — FoodExpress
*2025MT03083 / Ajeet Kumar Yadav*

Owns orders and their lifecycle (PLACED → ACCEPTED → PREPARING → OUT_FOR_DELIVERY → DELIVERED, or CANCELLED). On `placeOrder` it calls the Restaurant Service over REST to validate items and get authoritative prices.

* **Stack:** Node.js 18, Express, axios, PostgreSQL (`order_db`)
* **Port:** 3002

```bash
npm install && npm test              # 9 tests, Restaurant Service stubbed
docker compose up --build            # expects Restaurant Service on host :3001
kubectl apply -f k8s/                # namespace foodexpress must exist
```

| Env var | Default |
|---|---|
| PORT | 3002 |
| DB_HOST / DB_PORT | localhost / 5432 |
| DB_USER / DB_PASSWORD / DB_NAME | order_user / order_pass / order_db |
| RESTAURANT_SERVICE_URL | http://localhost:3001 (K8s: http://restaurant-service:3001) |
| RESTAURANT_TIMEOUT_MS | 3000 |
