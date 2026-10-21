# Demo video script (about 8–10 min) — 2025MT03083 / Ajeet Kumar Yadav

Save the recording as `2025MT03083_Ajeet_Kumar_Yadav_FoodExpress_Demo.mp4`. OBS Studio, SimpleScreenRecorder or the Windows/macOS built-in recorder all work.

1. **Intro (30 s).** State your name and ID, the app (FoodExpress), and show the architecture diagram.
2. **Code (1 min).** Show the two separate repos, `restaurant-service/` and `order-service/`. Open `restaurantClient.js` (the inter-service REST call) and each Dockerfile.
3. **Tests (30 s).** Run `npm test` in both folders.
4. **Cluster (1 min).** Run `minikube start`, `minikube status`, then `minikube addons enable metrics-server dashboard`.
5. **Docker images (1 min).** Run `eval $(minikube docker-env)` and both `docker build` commands, then `docker images`.
6. **Deploy (1 min).** Apply the namespace and both `k8s/` folders, then run `kubectl -n foodexpress get all` until all pods are Running.
7. **Postman (3 min).** Health → search restaurants → browse menu → place order. Point out that the prices came from the Restaurant Service. Then accept → preparing → out for delivery → delivered → track order → the 422 negative case → the 409 negative case.
8. **Dashboard (2 min).** Run `minikube dashboard`, then go through Deployments, Pods, a pod's logs showing the requests, Services, ConfigMaps/Secrets, PVCs and HPA.
9. **Scaling (30 s).** Run `kubectl -n foodexpress scale deploy/restaurant-service --replicas=3` and show the new pod in the dashboard.
