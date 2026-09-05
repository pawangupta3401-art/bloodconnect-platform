FROM node:18-alpine

# Security: Run as non-root user (TAD §6 — least privilege)
RUN addgroup -g 1001 -S nodejs && adduser -S bloodconnect -u 1001

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY --chown=bloodconnect:nodejs . .

# Remove dev files
RUN rm -rf .env.example *.md

USER bloodconnect

EXPOSE 5000

# Health check (TAD §6 — automated failover)
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "server.js"]
