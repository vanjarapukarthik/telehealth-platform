import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import fs from "fs";
import path from "path";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import tokenRoutes from "./routes/tokenRoutes.js";
import streamRoutes from "./routes/streamRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import moderateRoutes from "./routes/moderateRoutes.js";
import streamConfigRoutes from "./routes/streamConfigRoutes.js";
import { attachStreamWebSocket } from "./services/streamIngest.js";
import Message from "./models/Message.js";

const PORT = Number(process.env.PORT) || 3000;
const AUDIT_LOG_PATH = path.resolve(process.cwd(), "audit.log");

function auditLog(event, data = {}) {
  const entry = { event, ...data, ts: new Date().toISOString() };
  try {
    fs.appendFileSync(AUDIT_LOG_PATH, JSON.stringify(entry) + "\n");
  } catch (err) {
    console.error("[audit] write failed:", err.message);
  }
}

await connectDB();

const app = express();
if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
  },
});

// CORS: allow frontend origin; no auth required for login
const corsOrigin = process.env.CORS_ORIGIN || true;
app.use(cors({ origin: corsOrigin, credentials: true, methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Public auth routes (no JWT required) - mount under both /auth and /api/auth
app.use("/auth", authRoutes);
app.use("/api/auth", authRoutes);

app.use("/token", tokenRoutes);
app.use("/api/token", tokenRoutes);
app.use("/stream", streamRoutes);
app.use("/api/stream", streamRoutes);
app.use("/sessions", sessionRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/chat", chatRoutes);
app.use("/api/chat", chatRoutes);
app.use("/moderate", moderateRoutes);
app.use("/api/moderate", moderateRoutes);
app.use("/stream-config", streamConfigRoutes);
app.use("/api/stream-config", streamConfigRoutes);

attachStreamWebSocket(httpServer);

app.post("/audit", (req, res) => {
  try {
    auditLog("CLIENT_EVENT", req.body ?? {});
    return res.sendStatus(204);
  } catch (err) {
    return res.status(500).json({ error: "Failed to write audit log" });
  }
});

io.on("connection", (socket) => {
  socket.on("join_room", (roomName) => {
    if (roomName) {
      socket.join(roomName);
      socket.roomName = roomName;
    }
  });

  socket.on("chat_message", async (payload) => {
    const { roomName, senderName, senderRole, content, userId } = payload || {};
    if (!roomName || !content?.trim()) return;
    try {
      const msg = await Message.create({
        roomName,
        userId: userId || null,
        senderName: senderName || "Anonymous",
        senderRole: senderRole || "patient",
        content: content.trim(),
      });
      const toEmit = {
        _id: msg._id,
        roomName: msg.roomName,
        senderName: msg.senderName,
        senderRole: msg.senderRole,
        content: msg.content,
        createdAt: msg.createdAt,
      };
      io.to(roomName).emit("chat_message", toEmit);
    } catch (err) {
      console.error("Chat persist error:", err);
      io.to(roomName).emit("chat_message", {
        senderName: senderName || "Anonymous",
        senderRole: senderRole || "patient",
        content: content.trim(),
        createdAt: new Date().toISOString(),
      });
    }
  });

  socket.on("disconnect", () => {});
});

// Optional: serve Vite production build from frontend/dist (same-origin deploy)
const FRONTEND_DIST =
  process.env.FRONTEND_DIST_PATH ||
  path.resolve(process.cwd(), "../frontend/dist");
const SPA_INDEX = path.join(FRONTEND_DIST, "index.html");
const hasSpa =
  process.env.SERVE_SPA !== "0" &&
  fs.existsSync(SPA_INDEX) &&
  fs.statSync(SPA_INDEX).isFile();

if (hasSpa) {
  const skipSpa = (p) =>
    p === "/health" ||
    p.startsWith("/socket.io") ||
    p.startsWith("/stream-ws") ||
    p.startsWith("/audit") ||
    p.startsWith("/auth") ||
    p.startsWith("/api/") ||
    p.startsWith("/token") ||
    p.startsWith("/stream") ||
    p.startsWith("/sessions") ||
    p.startsWith("/chat") ||
    p.startsWith("/moderate") ||
    p.startsWith("/stream-config");
  app.use(express.static(FRONTEND_DIST, { index: false }));
  app.get("*", (req, res, next) => {
    if (req.method !== "GET" || skipSpa(req.path)) {
      return next();
    }
    res.sendFile(SPA_INDEX);
  });
  console.log(`[static] Serving SPA from ${FRONTEND_DIST}`);
}

app.use((err, _req, res, _next) => {
  console.error("[error]", err);
  try {
    auditLog("SERVER_ERROR", { error: err.message, stack: err.stack });
  } catch (_) {}
  res.status(500).json({ error: "Internal server error" });
});

/** Bind address: use 127.0.0.1 behind Nginx on EC2; default 0.0.0.0 for local dev */
const HOST = process.env.HOST ?? "0.0.0.0";
httpServer.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
