/**
 * PM2 — single Node API (telehealth backend).
 * Usage on EC2 (adjust paths):
 *   cd /home/ubuntu/app/telehealth
 *   pm2 start deploy/aws/ecosystem.config.cjs
 *   pm2 save && pm2 startup
 *
 * Ensure backend/.env exists with MONGODB_URI, JWT_SECRET, LIVEKIT_*, CORS_ORIGIN, HOST=127.0.0.1, TRUST_PROXY=1
 */

const path = require("path");

// Resolve repo root: this file is at deploy/aws/ecosystem.config.cjs
const root = path.resolve(__dirname, "../..");

module.exports = {
  apps: [
    {
      name: "telehealth-api",
      cwd: path.join(root, "backend"),
      script: "server.js",
      instances: 1,
      autorestart: true,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOST: "127.0.0.1",
        TRUST_PROXY: "1",
        SERVE_SPA: "0",
      },
    },
  ],
};
