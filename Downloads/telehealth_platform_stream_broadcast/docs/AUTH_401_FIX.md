# 401 Unauthorized on Login – Cause and Fix

## Why you see 401 on `/api/auth/login`

1. **Wrong URL** – Frontend was calling `/api/auth/login` but the backend only had `/auth/login`. The Vite proxy did not forward `/api/*`, so the request never hit the correct route (or hit a different app that returns 401 for missing JWT).
2. **Login route protected** – If the login route were wrapped in JWT middleware, every request without a token would get 401. In this project, **login is not protected** (see `backend/routes/authRoutes.js`).
3. **Invalid credentials** – The backend returns **401** for wrong email/password. So a valid request to `/api/auth/login` with wrong credentials will also return 401.

## What was changed

- **Backend:** All API routes are mounted under **both** `/auth` and `/api/auth` (and same for `/token`, `/sessions`, etc.), so `/api/auth/login` works.
- **Backend:** CORS allows the frontend origin and common methods.
- **Frontend:** API base uses the `/api` prefix; Vite proxy forwards `/api` to the backend.
- **Frontend:** Axios client in `src/services/axiosApi.js` for login (no `Authorization` header on login).

## Correct setup

### 1. Express login route (no auth middleware)

```js
// backend/routes/authRoutes.js
import { Router } from "express";
import { login } from "../controllers/authController.js";

const router = Router();
router.post("/login", login);  // NO authenticate middleware here
export default router;
```

Mount under `/api/auth`:

```js
app.use("/api/auth", authRoutes);
```

### 2. React login with Axios

```js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Do NOT add Authorization header for login
export async function login(email, password, role) {
  const { data } = await api.post("/api/auth/login", {
    email: email.trim().toLowerCase(),
    password,
    ...(role ? { role } : {}),
  });
  return data;
}
```

### 3. CORS (Express)

```js
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));
app.use(express.json());
```

### 4. Vite proxy (so `/api` hits backend)

```js
// vite.config.js
server: {
  proxy: {
    "/api": { target: "http://localhost:3000", changeOrigin: true },
  },
},
```

### 5. JWT only for protected routes

Use the auth middleware only on routes that require a logged-in user, never on `POST /api/auth/login`:

```js
router.post("/login", login);           // no auth
router.get("/me", authenticate, me);  // with auth
```

## If you still get 401

- Confirm backend is running and the request goes to `http://localhost:3000/api/auth/login` (via proxy or direct).
- Use correct demo credentials (after running `node scripts/seed.js`):  
  `doctor@telehealth.com` / `doctor123` or `patient@telehealth.com` / `patient123`.
- Check Network tab: request URL, request body (email, password), and response body (e.g. `{"error":"Invalid email or password"}`).
