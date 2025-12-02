# Unified Dockerfile for drawdb-combined with nginx
# Build from drawdb-combined directory: docker build -t drawdb-combined .

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/client

# Copy package files
COPY client/package*.json ./

# Optional proxy support for build (can be passed as build args)
ARG HTTP_PROXY
ARG HTTPS_PROXY
ENV HTTP_PROXY=${HTTP_PROXY}
ENV HTTPS_PROXY=${HTTPS_PROXY}

# Install dependencies
RUN npm install || \
    (echo "=== npm install failed ===" && exit 1)

# Verify vite was installed
RUN test -f node_modules/.bin/vite || \
    (echo "=== vite not found ===" && \
     ls -la node_modules/.bin/ | head -20 && exit 1)

# Copy rest of client files
COPY client/ ./

ENV NODE_OPTIONS="--max-old-space-size=4096"
# Set VITE_BACKEND_URL to empty string for combined deployment (uses relative URLs)
ENV VITE_BACKEND_URL=""

# Build using npx to ensure vite is found
RUN npx vite build || \
    (echo "=== Build failed ===" && \
     which vite || echo "vite not in PATH" && \
     ls -la node_modules/.bin/ | grep vite && \
     ./node_modules/.bin/vite build || exit 1)

# Stage 2: Build backend
FROM node:20-alpine AS backend-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ ./
RUN npm run build

# Stage 3: Production image with nginx
FROM node:20-alpine AS production
WORKDIR /app

# Install nginx, curl, and supervisor
RUN apk add --no-cache nginx curl supervisor

# Copy backend dependencies and built files
COPY --from=backend-build /app/server/package*.json ./
COPY --from=backend-build /app/server/package-lock.json* ./
RUN npm install --only=production && npm cache clean --force

COPY --from=backend-build /app/server/dist ./dist

# Copy frontend build
COPY --from=frontend-build /app/client/dist ./client-dist

# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Create supervisor config to run both nginx and node
RUN echo '[supervisord]' > /etc/supervisord.conf && \
    echo 'nodaemon=true' >> /etc/supervisord.conf && \
    echo '' >> /etc/supervisord.conf && \
    echo '[program:nginx]' >> /etc/supervisord.conf && \
    echo 'command=nginx -g "daemon off;"' >> /etc/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisord.conf && \
    echo 'stderr_logfile=/var/log/nginx/error.log' >> /etc/supervisord.conf && \
    echo 'stdout_logfile=/var/log/nginx/access.log' >> /etc/supervisord.conf && \
    echo '' >> /etc/supervisord.conf && \
    echo '[program:node]' >> /etc/supervisord.conf && \
    echo 'command=node dist/index.js' >> /etc/supervisord.conf && \
    echo 'directory=/app' >> /etc/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisord.conf && \
    echo 'stderr_logfile=/var/log/node/error.log' >> /etc/supervisord.conf && \
    echo 'stdout_logfile=/var/log/node/access.log' >> /etc/supervisord.conf && \
    mkdir -p /var/log/node

# Expose ports
EXPOSE 80 443 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/ || exit 1

# Start supervisor to run both nginx and node
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
