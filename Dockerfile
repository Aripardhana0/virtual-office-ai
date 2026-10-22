FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js omp-session.js index.html ./
COPY public ./public

EXPOSE 3333

ENV PORT=3333
ENV HOST=0.0.0.0
ENV NODE_ENV=production

CMD ["node", "server.js"]
