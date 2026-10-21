# Screenshots to capture (2025MT03083 / Ajeet Kumar Yadav)

Save each one here as a PNG with **exactly** this name. The documentation embeds them automatically.

| File | What to capture |
|---|---|
| `2025MT03083_Ajeet_Kumar_Yadav_01_minikube_status.png` | Terminal: `minikube status` and `kubectl get nodes` |
| `2025MT03083_Ajeet_Kumar_Yadav_02_kubectl_get_all.png` | Terminal: `kubectl -n foodexpress get deployments,pods,svc,hpa -o wide` |
| `2025MT03083_Ajeet_Kumar_Yadav_03_docker_images.png` | Terminal: after `eval $(minikube docker-env)`, `docker images \| grep service` |
| `2025MT03083_Ajeet_Kumar_Yadav_04_postman_search_restaurants.png` | Postman: Restaurant → 04 Search restaurants |
| `2025MT03083_Ajeet_Kumar_Yadav_05_postman_browse_menu.png` | Postman: Restaurant → 06 Browse menu |
| `2025MT03083_Ajeet_Kumar_Yadav_06_postman_register_restaurant.png` | Postman: Restaurant → 02 Register restaurant (201) |
| `2025MT03083_Ajeet_Kumar_Yadav_07_postman_place_order.png` | Postman: Order → 02 Place order (201, with prices from Restaurant Service) |
| `2025MT03083_Ajeet_Kumar_Yadav_08_postman_update_status.png` | Postman: Order → 04 Accept order |
| `2025MT03083_Ajeet_Kumar_Yadav_09_postman_track_order.png` | Postman: Order → 03 Track order, after all status updates |
| `2025MT03083_Ajeet_Kumar_Yadav_10_postman_order_rejected.png` | Postman: Order → 10 Negative (422) |
| `2025MT03083_Ajeet_Kumar_Yadav_11_dashboard_workloads.png` | Dashboard: Workloads overview, namespace foodexpress |
| `2025MT03083_Ajeet_Kumar_Yadav_12_dashboard_deployments.png` | Dashboard: Deployments list |
| `2025MT03083_Ajeet_Kumar_Yadav_13_dashboard_pods.png` | Dashboard: Pods list (6 Running) |
| `2025MT03083_Ajeet_Kumar_Yadav_14_dashboard_services.png` | Dashboard: Services (NodePort 30001/30002) |
| `2025MT03083_Ajeet_Kumar_Yadav_15_dashboard_pod_logs.png` | Dashboard: logs of an order-service pod showing `POST /api/orders` |
