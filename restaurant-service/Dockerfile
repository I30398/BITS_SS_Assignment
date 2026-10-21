# Restaurant Service image - 2025MT03083 / Ajeet Kumar Yadav
FROM node:18-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY src ./src

USER node
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "src/server.js"]
