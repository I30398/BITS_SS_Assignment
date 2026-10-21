# Restaurant Service — FoodExpress
*2025MT03083 / Ajeet Kumar Yadav*

Owns restaurants and menus. Exposes the commands and queries for restaurants and menus, plus the internal `POST /api/restaurants/{id}/menu/validate` query used by the Order Service.

* **Stack:** Node.js 18, Express, PostgreSQL (`restaurant_db`)
* **Port:** 3001

```bash
npm install && npm test              # 8 tests, in-memory Postgres
docker compose up --build            # service + its own Postgres on :3001
# Kubernetes (namespace foodexpress must exist)
kubectl apply -f k8s/
```

| Env var | Default |
|---|---|
| PORT | 3001 |
| DB_HOST / DB_PORT | localhost / 5432 |
| DB_USER / DB_PASSWORD / DB_NAME | restaurant_user / restaurant_pass / restaurant_db |
| SEED_DATA | true |
