#!/usr/bin/env bash
# Creates ../2025MT03083_FoodExpress.zip (excludes node_modules) - 2025MT03083 / Ajeet Kumar Yadav
set -euo pipefail
cd "$(dirname "$0")/.."
rm -f 2025MT03083_FoodExpress.zip
zip -rq 2025MT03083_FoodExpress.zip 2025MT03083_FoodExpress \
  -x '*/node_modules/*' '*/coverage/*' '*.log'
ls -lh 2025MT03083_FoodExpress.zip
