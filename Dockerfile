# Combined Dockerfile for drawdb-combined
# Build from drawdb-combined directory: docker build -t drawdb-combined .

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/client
COPY client/package*.json ./
# Force-install devDependencies (like Vite) even if NODE_ENV/NPM config say otherwise
RUN NODE_ENV=development npm_config_production=false npm ci
COPY client/ ./
ENV NODE_OPTIONS="--max-old-space-size=4096"
# Set VITE_BACKEND_URL to empty string for combined deployment (uses relative URLs)
ENV VITE_BACKEND_URL=""
RUN NODE_ENV=production npm run build

# Stage 2: Build backend
FROM node:20-alpine AS backend-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ ./
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine AS production
WORKDIR /app

# Copy backend dependencies and built files
COPY --from=backend-build /app/server/package*.json ./
COPY --from=backend-build /app/server/package-lock.json* ./
RUN npm install --only=production && npm cache clean --force

COPY --from=backend-build /app/server/dist ./dist

# Copy frontend build to a location the server can serve
COPY --from=frontend-build /app/client/dist ./client-dist

# Expose the port (default 5000, can be overridden via env)
EXPOSE 5000

# Start the server
CMD ["node", "dist/index.js"]

