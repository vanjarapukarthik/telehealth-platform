# AWS EC2 deployment — Telehealth Live Broadcast

This adapts the single-EC2 + Nginx + PM2 pattern to **this** project (one Express API, Vite React UI, MongoDB, LiveKit, Socket.IO). It is **not** the multi-engine RealEstate stack; paths and ports match `backend/server.js` and `frontend/` only.

## Architecture

```text
Internet → Security group (22, 80, 443) → Nginx (80/443)
              → Static files: frontend/dist
              → /api/*, /socket.io/*, /stream-ws → Node on 127.0.0.1:3000
```

- **Do not** open port 3000 on the security group. Node binds to **localhost only** (`HOST=127.0.0.1`).
- Browsers talk to **LiveKit Cloud** directly for WebRTC (`wss://...` from your `LIVEKIT_URL`). Only your API token and app traffic go through Nginx.

## Prerequisites

- EC2: Ubuntu 22.04/24.04, `t3.medium` or larger, 20 GB gp3.
- Security group:

  | Type | Port | Source        |
  |------|------|---------------|
  | SSH  | 22   | Your IP only  |
  | HTTP | 80   | 0.0.0.0/0     |
  | HTTPS| 443  | 0.0.0.0/0     |

- MongoDB: Atlas (recommended) or self-hosted; use `MONGODB_URI` in backend `.env`.
- LiveKit Cloud project: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`.

## Step 1 — Server packages

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git build-essential
sudo npm install -g pm2
```

## Step 2 — Clone app and install

```bash
cd /home/ubuntu
git clone <your-repo-url> app/telehealth
cd app/telehealth/backend && npm install --omit=dev
cd ../frontend && npm install && npm run build
```

## Step 3 — Frontend production env (relative URLs — no localhost in bundle)

From `frontend/`, build with **empty** API base so the browser calls same origin (`/api/...`):

```bash
cd /home/ubuntu/app/telehealth/frontend
# Optional: copy and edit
# cp .env.production.example .env.production
# VITE_API_URL=
# VITE_WS_URL=
npm run build
```

Upload the **contents** of `frontend/dist/` to the path Nginx will use, e.g.:

```bash
sudo mkdir -p /home/ubuntu/app/telehealth/frontend
sudo rsync -a dist/ /home/ubuntu/app/telehealth/frontend/
sudo chown -R ubuntu:ubuntu /home/ubuntu/app/telehealth/frontend
```

(If you keep the repo on the server, `root` in Nginx can instead point at `/home/ubuntu/app/telehealth/frontend/dist` — match `root` in the nginx file to your actual path.)

## Step 4 — Backend `.env` on the server

In `backend/.env` (never commit secrets):

```env
PORT=3000
HOST=127.0.0.1
TRUST_PROXY=1
NODE_ENV=production

MONGODB_URI=mongodb+srv://...
JWT_SECRET=<long-random-secret>

LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...

# Public site URL (browser origin) — required for credentialed requests / Socket.IO
CORS_ORIGIN=http://YOUR_EC2_PUBLIC_IP
# After TLS: https://yourdomain.com
```

Do **not** serve the Vite app from Express on this setup unless you intend to; with Nginx static + proxy, either omit `../frontend/dist` next to `backend` or unset `FRONTEND_DIST_PATH` so Node does not double-serve UI.

## Step 5 — Nginx

```bash
sudo cp /home/ubuntu/app/telehealth/deploy/aws/nginx-telehealth.conf /etc/nginx/sites-available/telehealth
# Edit root= if your static path differs
sudo ln -sf /etc/nginx/sites-available/telehealth /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

TLS (recommended):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

Update `CORS_ORIGIN` to `https://yourdomain.com`.

## Step 6 — PM2

From repo root:

```bash
cd /home/ubuntu/app/telehealth
pm2 start deploy/aws/ecosystem.config.cjs
pm2 save
pm2 startup
```

## Step 7 — Verification

```bash
pm2 status
curl -s http://127.0.0.1:3000/health
curl -s http://127.0.0.1/health
```

Open `http://YOUR_EC2_IP` — UI should load; login and a test room should hit `/api/*` without CORS errors when `CORS_ORIGIN` matches the page origin.

## Troubleshooting

| Issue | Check |
|-------|--------|
| 502 from Nginx | `pm2 logs telehealth-api`, MongoDB URI, `HOST=127.0.0.1` |
| CORS errors | `CORS_ORIGIN` exactly matches `http(s)://host` shown in the browser |
| Chat not live | `/socket.io/` proxied with Upgrade headers; `VITE_WS_URL` empty for same origin |
| RTMP / stream-ws | `/stream-ws` block present; JWT still required by backend |

## FFmpeg note

YouTube/RTMP ingest from the doctor dashboard uses FFmpeg on the **server** if enabled in your environment. Install on EC2 if you use that feature:

```bash
sudo apt install -y ffmpeg
```
