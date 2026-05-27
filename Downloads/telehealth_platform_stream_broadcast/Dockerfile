# Production image: API + optional SPA from frontend/dist (same origin).
# Build:
#   docker build -t telehealth .
# Run (set MONGODB_URI, JWT_SECRET, LIVEKIT_* in -e or compose):
#   docker run -p 3000:3000 -e MONGODB_URI=... -e JWT_SECRET=... telehealth

FROM node:20-bookworm-slim AS frontend-build
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
# Default: same-origin (empty). Split deploy: docker build --build-arg VITE_API_URL=https://api.example.com --build-arg VITE_WS_URL=https://api.example.com .
ARG VITE_API_URL=
ARG VITE_WS_URL=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
RUN npm run build

FROM node:20-bookworm-slim AS backend
WORKDIR /app
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --omit=dev
COPY backend/ ./
COPY --from=frontend-build /build/frontend/dist ./static
ENV NODE_ENV=production
ENV FRONTEND_DIST_PATH=/app/static
EXPOSE 3000
CMD ["node", "server.js"]
