# 2025MT03083_FoodExpress
**2025MT03083 / Ajeet Kumar Yadav — Scalable Services Assignment**

FoodExpress is a microservices-based online food ordering application. Two services are implemented:

* `restaurant-service/`: its own repository (Node.js + PostgreSQL)
* `order-service/`: its own repository (Node.js + PostgreSQL). It calls `restaurant-service` over REST.

The full documentation is in `docs/2025MT03083_Ajeet_Kumar_Yadav_FoodExpress_Documentation.md` (and `.html`).

## Quick start (Minikube)
```bash
./deployment/deploy-minikube.sh     # start minikube, build images, deploy, wait
./deployment/smoke-test.sh          # end-to-end calls
minikube dashboard                  # analyse deployments
```
Import `postman/*.postman_collection.json` into Postman, then set `restaurantUrl` and `orderUrl` to `http://$(minikube ip):30001` and `:30002`.

## Submission checklist
1. Run the deployment and capture the screenshots listed in `screenshots/README.md` into `screenshots/`, using exactly those filenames.
2. Record the demo following `video/README.md`, and save it as `video/2025MT03083_Ajeet_Kumar_Yadav_FoodExpress_Demo.mp4`.
3. `cd docs && npm i --no-save marked@4 && node build-doc.js` regenerates the HTML document with the screenshots embedded. Open it in a browser, then use Print → Save as PDF, or open it in Word and save as .docx.
4. `./make-submission-zip.sh` produces `../2025MT03083_FoodExpress.zip`.
