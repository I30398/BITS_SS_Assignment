#!/usr/bin/env bash
# FoodExpress - end-to-end smoke test against the cluster (use during demo video)
# 2025MT03083 / Ajeet Kumar Yadav
# Usage: ./smoke-test.sh [RESTAURANT_URL] [ORDER_URL]
set -euo pipefail

IP="$(minikube ip 2>/dev/null || echo localhost)"
R="${1:-http://$IP:30001}"
O="${2:-http://$IP:30002}"
J='Content-Type: application/json'

show() { echo; echo "### $1"; shift; curl -s "$@"; echo; }

show "Health - restaurant-service" "$R/health"
show "Health - order-service" "$O/health"
show "Query: searchRestaurants (city=Bengaluru)" "$R/api/restaurants?city=Bengaluru"
show "Query: browseMenu (rest-001)" "$R/api/restaurants/rest-001/menu"

ORDER=$(curl -s -X POST "$O/api/orders" -H "$J" -d '{
  "customerId": "cust-2025MT03083",
  "restaurantId": "rest-001",
  "deliveryAddress": "BITS Pilani WILP, Bengaluru",
  "items": [{"menuItemId":"item-101","quantity":2},{"menuItemId":"item-102","quantity":4}]
}')
echo; echo "### Command: placeOrder (order-service -> restaurant-service)"; echo "$ORDER"
ID=$(echo "$ORDER" | sed -E 's/.*"id":"(ord-[a-z0-9]+)".*/\1/')

for s in ACCEPTED PREPARING OUT_FOR_DELIVERY DELIVERED; do
  show "Command: updateOrderStatus -> $s" -X PATCH "$O/api/orders/$ID/status" -H "$J" -d "{\"status\":\"$s\"}"
done

show "Query: trackOrder $ID" "$O/api/orders/$ID"
show "Negative: item from another restaurant (expect 422)" -X POST "$O/api/orders" -H "$J" \
  -d '{"customerId":"c1","restaurantId":"rest-001","deliveryAddress":"x","items":[{"menuItemId":"item-201","quantity":1}]}'
