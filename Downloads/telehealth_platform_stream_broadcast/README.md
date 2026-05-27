# Telehealth Live Broadcast Platform

Production-ready telehealth platform where **doctors** broadcast live consultation sessions and **patients** watch, chat, and interact in real time. Built with React (Vite), Node.js (Express), LiveKit (WebRTC), MongoDB, Socket.io, and JWT auth.

---

## Features

| Feature | Description |
|--------|-------------|
| **Authentication** | Doctor & patient login with JWT; role-based access |
| **Live video** | WebRTC via LiveKit — doctor as host, patients as viewers |
| **Screen sharing** | Doctor shares screen for reports/demos |
| **Public viewer mode** | Patients watch only; no publish |
| **RTMP broadcast** | Push stream to YouTube or CDN (LiveKit room egress or **browser → FFmpeg → YouTube** from dashboard) |
| **Recording** | Record sessions as MP4; metadata in DB |
| **Moderation** | Doctor can kick viewers; admin controls |
| **Live chat** | Real-time chat (Socket.io) between doctor and patients |

---

## Tech stack

- **Frontend:** React 18, Vite, TailwindCSS, React Router, LiveKit Client, Socket.io Client  
- **Backend:** Node.js, Express, JWT, LiveKit Server SDK, Socket.io  
- **Realtime:** LiveKit (WebRTC), Socket.io (chat)  
- **Database:** MongoDB (Mongoose)  
- **Streaming:** RTMP + HLS (via LiveKit); optional **browser → Node → FFmpeg → YouTube** (see [docs/FFMPEG_YOUTUBE_LIVE_STREAM.md](docs/FFMPEG_YOUTUBE_LIVE_STREAM.md))

---

## Project structure

```
telehealth-platform/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── tokenController.js
│   │   ├── streamController.js
│   │   ├── sessionController.js
│   │   └── chatController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Session.js
│   │   ├── Recording.js
│   │   └── Message.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── tokenRoutes.js
│   │   ├── streamRoutes.js
│   │   ├── sessionRoutes.js
│   │   ├── chatRoutes.js
│   │   └── moderateRoutes.js
│   ├── scripts/
│   │   └── seed.js
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── HomePage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DoctorDashboard.jsx
│   │   │   ├── ViewerPage.jsx
│   │   │   └── LiveRoomPage.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── nginx.conf
│   ├── .env.example
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## API reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | No | Login; body: `{ email, password, role? }` |
| GET | `/token?room=&role=` | Yes (JWT) | LiveKit access token |
| GET | `/sessions` | Yes | List sessions (filtered by role) |
| POST | `/sessions` | Doctor/Admin | Create live session; body: `{ roomName, title? }` |
| POST | `/sessions/:roomName/end` | Doctor/Admin | End session |
| GET | `/sessions/recordings` | Yes | List recordings |
| POST | `/stream/rtmp` | Doctor/Admin | Start RTMP egress; body: `{ room, rtmpUrl }` |
| POST | `/stream/record` | Doctor/Admin | Start room recording; body: `{ room }` |
| POST | `/moderate/kick` | Doctor/Admin | Kick participant; body: `{ room, identity }` |
| GET | `/chat/messages?roomName=` | Yes | Get chat history |
| POST | `/chat/message` | Yes | Send message; body: `{ roomName, content }` |

---

## Database models

- **User** — email, password (hashed), name, role (doctor | patient | admin), specialization  
- **Session** — roomName, doctorId, title, status (scheduled | live | ended), startedAt, endedAt  
- **Recording** — sessionId, roomName, egressId, filepath, status  
- **Message** — roomName, userId, senderName, senderRole, content, timestamps  

---

## Environment variables

### Backend (`backend/.env`)

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/telehealth
JWT_SECRET=your-secret
JWT_EXPIRES=7d
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_key
LIVEKIT_API_SECRET=your_secret
CORS_ORIGIN=http://localhost:5173
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=          # Leave empty when using Vite proxy (dev)
VITE_WS_URL=           # Leave empty for same-origin Socket.io
```

For production, set `VITE_API_URL` and optionally `VITE_WS_URL` to your backend URL (used at build time).

---

## Quick start (local)

### 1. MongoDB

Have MongoDB running locally (e.g. `mongod`) or use a cloud URI in `MONGODB_URI`.

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with LiveKit and MongoDB
npm install
node scripts/seed.js   # Optional: demo doctor & patient
npm run dev
```

Backend: `http://localhost:3000`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173` (proxies API and Socket.io to backend).

### 4. Demo login

After running `node scripts/seed.js`:

- **Doctor:** `doctor@telehealth.demo` / `doctor123`
- **Patient:** `patient@telehealth.demo` / `patient123`

---

## Docker

```bash
# Create .env in project root with:
# LIVEKIT_URL=wss://...
# LIVEKIT_API_KEY=...
# LIVEKIT_API_SECRET=...
# JWT_SECRET=...

docker-compose up -d
```

- Frontend: `http://localhost:80`
- Backend: `http://localhost:3000`
- MongoDB: `localhost:27017`

Seed users after first start:

```bash
docker-compose exec backend node scripts/seed.js
```

---

## Deployment

### Backend

1. Set `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, and LiveKit env vars.
2. Run `npm ci --only=production` and `node server.js` (or use the backend Dockerfile).

### Frontend

1. Set `VITE_API_URL` (and `VITE_WS_URL` if different) to your backend URL.
2. Run `npm run build` and serve the `dist/` folder with nginx or any static host.

### LiveKit

Create a project at [LiveKit Cloud](https://cloud.livekit.io), get API key, secret, and WebSocket URL, and set them in the backend env. For RTMP/recording, ensure your LiveKit project supports egress.

---

## Frontend pages

| Route | Description |
|------|-------------|
| `/` | Home; login links and feature overview |
| `/login` | Doctor / patient login |
| `/dashboard` | Doctor: start live, see sessions, go to room |
| `/view` | Patient: list live sessions, join by room ID |
| `/room/:roomName` | Live room: video (LiveKit) + chat (Socket.io); host has RTMP, record, kick |

---

## License

MIT.
