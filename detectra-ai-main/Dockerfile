# ═══════════════════════════════════════════════════════════════════════════════
# Detectra AI — Frontend Production Dockerfile
# Multi-stage: Node 20 build → Nginx 1.25 static serve
# Build:   docker build -t detectra-frontend .
# Run:     docker run -p 80:80 detectra-frontend
# ═══════════════════════════════════════════════════════════════════════════════

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (cached separately for faster rebuilds)
COPY package*.json ./
RUN npm ci --prefer-offline --no-audit --no-fund

# Build-time env vars (injected at build via --build-arg)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_HF_TOKEN
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_HF_TOKEN=$VITE_HF_TOKEN

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:1.25-alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy the custom SPA routing + caching config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the Vite production build
COPY --from=builder /app/dist /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/ > /dev/null || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
