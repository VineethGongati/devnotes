# ==========================================
# Stage 1: Install Dependencies
# ==========================================
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

# ==========================================
# Stage 2: Development
# ==========================================
FROM node:20-alpine AS dev

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY src ./src

ENV NODE_ENV=development
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "dev"]

# ==========================================
# Stage 3: Builder
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY src ./src

# Run tests (build fails if tests fail)
RUN npm test -- --passWithNoTests

# Remove development dependencies
RUN npm prune --omit=dev

# ==========================================
# Stage 4: Production Runner
# ==========================================
FROM node:20-alpine AS runner

# Create non-root user
RUN addgroup -S nodejs && \
    adduser -S nodejs -G nodejs

WORKDIR /app

COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/package-lock.json ./package-lock.json
COPY --from=builder --chown=nodejs:nodejs /app/src ./src

ENV NODE_ENV=production
ENV PORT=3000

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
CMD node -e "\
const http=require('http');\
const req=http.get('http://localhost:3000/health',(res)=>{\
process.exit(res.statusCode===200?0:1);\
});\
req.setTimeout(3000,()=>process.exit(1));\
req.on('error',()=>process.exit(1));"

CMD ["node", "src/server.js"]