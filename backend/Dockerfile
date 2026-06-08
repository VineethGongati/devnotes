# backend/Dockerfile

# Stage 1: Dependencies
FROM node:20-alpine AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Development (used by docker-compose.yml)
FROM node:20-alpine AS dev

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src/ ./src/

ENV NODE_ENV=development
ENV PORT=3000

EXPOSE 3000
CMD ["npm", "run", "dev"]

# Stage 3: Builder (test + prune for production)
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src/ ./src/

# Run tests - fails build if tests fail
RUN npm test -- --passWithNoTests

# Prune devDependencies
RUN npm prune --production

# Stage 4: Production runner
FROM node:20-alpine AS runner

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/src/ ./src/

ENV NODE_ENV=production
ENV PORT=3000

USER nodejs

# Use node instead of wget (not available in alpine by default)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

EXPOSE 3000
CMD ["node", "src/server.js"]