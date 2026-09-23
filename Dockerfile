FROM node:20-bookworm-slim AS webbuild
WORKDIR /app
COPY app/package*.json ./
RUN npm install
COPY app/ ./
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /srv
COPY server/package*.json ./
RUN npm install --omit=dev
COPY server/src ./src
COPY --from=webbuild /app/dist ./public

ENV NODE_ENV=production
ENV PORT=3000
ENV STATIC_DIR=/srv/public
ENV DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 3000
CMD ["node", "src/index.js"]
