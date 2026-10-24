# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 HUSKY=0
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM dependencies AS builder
ARG SITE_URL=http://localhost:3080
ENV SITE_URL=$SITE_URL
COPY . .
ENV NODE_ENV=production NEXT_OUTPUT=standalone
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 JOURNAL_STORAGE=server JOURNAL_DATA_DIR=/app/storage
RUN groupadd --gid 1001 nextjs && useradd --uid 1001 --gid nextjs --no-create-home nextjs && mkdir -p /app/storage /app/.next/cache && chown -R nextjs:nextjs /app
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]

