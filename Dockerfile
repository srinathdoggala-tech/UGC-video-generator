# Production Dockerfile for UGC Video Generator
FROM node:20-bookworm-slim AS base

# Install native FFmpeg, fonts, and ca-certificates
RUN apt-get update && apt-get install -y \
    ffmpeg \
    fonts-dejavu-core \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies stage
FROM base AS deps
WORKDIR /app
COPY ugc-video-generator/package.json ugc-video-generator/package-lock.json ./
RUN npm ci

# Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY ugc-video-generator/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Runner stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create storage for generated videos and agent logs
RUN mkdir -p /app/public/generated-videos /app/.agent-logs && chmod -R 777 /app/public/generated-videos /app/.agent-logs

# Copy production build artifacts from standalone build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY capture.js ./capture.js

EXPOSE 3000

CMD ["node", "server.js"]
