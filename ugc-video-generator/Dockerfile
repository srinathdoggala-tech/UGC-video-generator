# Production Dockerfile for UGC Video Generator
FROM node:20-bookworm-slim AS base

# Install native FFmpeg and system fonts
RUN apt-get update && apt-get install -y \
    ffmpeg \
    fonts-dejavu-core \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Runner stage
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create app directory and storage for generated videos
WORKDIR /app
RUN mkdir -p /app/public/generated-videos /app/.agent-logs && chmod 777 /app/public/generated-videos /app/.agent-logs

# Copy production build artifacts
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/capture.js ./capture.js

EXPOSE 3000

CMD ["node", "server.js"]
