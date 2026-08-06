FROM node:22-bookworm-slim AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS production-dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS production

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

RUN groupadd --system nodejs && useradd --system --gid nodejs appuser

COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/src ./src

USER appuser

EXPOSE 3000

CMD ["npm", "start"]
