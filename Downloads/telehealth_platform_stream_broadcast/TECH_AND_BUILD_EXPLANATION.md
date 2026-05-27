# Project lo Emi Use Chesamu & Web Page Ela Build Ayyindo

## 1. Emi use chesamu? (What we used)

### Frontend (Website / UI)

| Use chesindi | Purpose |
|--------------|--------|
| **React 18** | UI components — buttons, forms, pages anni React components ga. |
| **Vite** | Build tool — dev server (localhost), fast build, hot reload. |
| **React Router** | Page navigation — `/`, `/login`, `/dashboard`, `/room/...` routes. |
| **Tailwind CSS** | Styling — colors, spacing, dark theme (bg #0f172a, cards #1e293b, buttons #3b82f6). |
| **PostCSS + Autoprefixer** | Tailwind process cheyadaniki. |
| **LiveKit Client** | Live video/audio — camera, mic, screen share, room connect. |
| **Socket.io Client** | Live chat — real-time messages backend tho. |
| **Axios** | API calls (optional) — login, token, etc. |

### Backend (Server)

| Use chesindi | Purpose |
|--------------|--------|
| **Node.js** | Server runtime. |
| **Express** | Routes, APIs — `/auth/login`, `/token`, `/sessions`, `/stream/rtmp`, etc. |
| **MongoDB + Mongoose** | Database — users, sessions, recordings, messages. |
| **JWT (jsonwebtoken)** | Login token — who is logged in, role (doctor/patient). |
| **bcryptjs** | Password hash — store safe ga. |
| **LiveKit Server SDK** | Token generate, RTMP/recording, kick participant. |
| **Socket.io** | Live chat server side — messages broadcast. |
| **CORS, dotenv** | Security & env variables. |

### Database

- **MongoDB** — collections: User, Session, Recording, Message.

---

## 2. Web page ela build ayyindo? (How the web page was built)

### Step 1: Entry point

- **index.html** — single HTML file; andulo `<div id="root">` undi.
- **main.jsx** — React app ni `#root` lo render chestundi: `ReactDOM.createRoot(...).render(<App />)`.
- **index.css** — Tailwind + custom classes (btn-primary, card-dark, input-dark); body dark theme.

So: HTML → main.jsx → App.jsx → rest of the app.

### Step 2: App structure (App.jsx)

- **AuthProvider** — login state, user info, logout (context).
- **BrowserRouter** — URL-based routing.
- **Routes:**
  - `/` → HomePage  
  - `/login` → LoginPage  
  - `/dashboard` → DoctorDashboard  
  - `/view` → ViewerPage  
  - `/room/:roomName` → LiveRoomPage  
  - anything else → redirect to `/`

So: one React app, different “pages” route prakaram change avutayi.

### Step 3: Pages (ela build ayyayo)

| Page | Emi undi | Ela build chesamu |
|------|----------|---------------------|
| **HomePage** | Navbar, features list, Doctor/Patient login buttons | Tailwind + dark theme; links React Router `Link`. |
| **LoginPage** | Email, password, role (doctor/patient), Sign in button | Form → `api.login()` → token + user save → navigate to dashboard or view. |
| **DoctorDashboard** | Start live form (room ID, title), Live now list, Recent sessions | `api.getSessions()`, `api.createSession()`; cards `card-dark`, buttons `btn-primary`. |
| **ViewerPage** | Join by room ID input, Live now list | Same sessions API; Watch button → `/room/:roomName?role=viewer`. |
| **LiveRoomPage** | Video area, chat sidebar, (host) screen share / RTMP / record / kick | LiveKit `Room`, `createLocalVideoTrack`, publish; Socket.io chat; Tailwind layout (flex, grid). |

Ante: each page = one React component; andulo JSX (HTML-like) + Tailwind classes + API/LiveKit/Socket calls.

### Step 4: Styling (design ela vesamo)

- **Tailwind** — utility classes: `flex`, `gap-4`, `rounded-lg`, `bg-[#1e293b]`, `text-dark-text`.
- **index.css** — body dark (#0f172a), reusable:
  - `.btn-primary` — blue button, hover effect.
  - `.card-dark` — card bg #1e293b, border, hover shadow.
  - `.input-dark` — input fields dark theme, focus ring.
- **tailwind.config.js** — `dark` colors (bg, card, text, border), theme extend.

So: no separate CSS files per component; Tailwind + few global classes.

### Step 5: Data & API

- **AuthContext** — login/logout, `user` state, `localStorage` lo token save.
- **api.js** — backend ki `fetch` calls: login, getToken, getSessions, createSession, startRtmp, chat, etc. Token header lo pampadam.
- **LiveKit** — token backend nunchi teesukoni `Room.connect(url, token)`; camera/mic `createLocalVideoTrack/AudioTrack` → `publishTrack`.
- **Socket.io** — chat: `emit('chat_message')`, `on('chat_message')` for real-time.

So: login → token → every API call auth tho; video = LiveKit; chat = Socket.io.

### Step 6: Build & run

- **Dev:** `npm run dev` (Vite) → localhost:5173; API proxy (vite.config.js) backend (e.g. 3000) ki forward chestundi.
- **Production:** `npm run build` → `dist/` lo HTML + JS + CSS; deploy that folder.

---

## 3. Short summary (one para)

**Emi use chesamu:** Frontend ki **React + Vite + Tailwind + React Router**; live video **LiveKit**, chat **Socket.io**. Backend **Node + Express + MongoDB + Mongoose**; auth **JWT**, password **bcrypt**; LiveKit token/RTMP/record **livekit-server-sdk**.

**Web page ela build ayyindo:** **Single React app** — `index.html` → `main.jsx` → `App.jsx` (routes). Har page oka component (Home, Login, Dashboard, View, LiveRoom). Design **Tailwind** (dark theme + index.css lo btn/card/input). Data **AuthContext + api.js**; live **LiveKit Room**; chat **Socket.io**. So structure: HTML entry → React root → Router → Pages → Tailwind + API + LiveKit + Socket.
