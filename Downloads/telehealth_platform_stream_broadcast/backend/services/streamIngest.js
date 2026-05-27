import { WebSocketServer } from "ws";
import { spawn } from "child_process";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";
import { getFullRtmpUrl } from "./streamConfig.js";

const JWT_SECRET = process.env.JWT_SECRET || "telehealth-jwt-secret-change-in-production";
const RECORDINGS_DIR = path.resolve(process.cwd(), "recordings");

function ensureRecordingsDir() {
  if (!fs.existsSync(RECORDINGS_DIR)) {
    fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
  }
}

/**
 * Spawn FFmpeg: read WebM from stdin, output to RTMP and local MP4.
 * @param {string} rtmpUrl - Full RTMP URL (e.g. rtmp://a.rtmp.youtube.com/live2/KEY)
 * @param {string} recordPath - Path for recording file
 * @returns {{ ffmpeg: import('child_process').ChildProcess, stdin: import('stream').Writable }}
 */
function startFfmpeg(rtmpUrl, recordPath) {
  ensureRecordingsDir();
  // -f webm: input from pipe is WebM (browser MediaRecorder)
  // -i pipe:0: read from stdin
  // -c:v libx264 -preset ultrafast -c:a aac: encode for RTMP/MP4
  // -f tee: multiple outputs [f=flv] RTMP | [f=mp4] file
  const args = [
    "-f", "webm",
    "-i", "pipe:0",
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-c:a", "aac",
    "-f", "tee",
    `[f=flv]${rtmpUrl}|[f=mp4]${recordPath}`,
  ];
  const ffmpeg = spawn("ffmpeg", args, {
    stdio: ["pipe", "ignore", "pipe"],
  });
  ffmpeg.stderr.on("data", (chunk) => {
    const line = chunk.toString();
    if (line.includes("error") || line.includes("Error")) {
      console.error("[FFmpeg]", line.trim());
    }
  });
  ffmpeg.on("error", (err) => {
    console.error("[FFmpeg] Process error:", err.message);
  });
  ffmpeg.on("exit", (code, signal) => {
    if (code !== 0 && code !== null) {
      console.log("[FFmpeg] Exit", { code, signal });
    }
  });
  return { ffmpeg, stdin: ffmpeg.stdin };
}

/**
 * Attach WebSocket server for stream ingest to the HTTP server.
 * Path: /stream-ws?token=JWT
 * Client sends binary chunks (WebM) after connection. Optional JSON start: { type: 'start', rtmpUrl?, streamKey? }
 * @param {import('http').Server} httpServer
 */
export function attachStreamWebSocket(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    if (url.pathname !== "/stream-ws") {
      socket.destroy();
      return;
    }
    const token = url.searchParams.get("token");
    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (_) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    const role = decoded.role || decoded.userRole;
    if (role !== "doctor" && role !== "admin") {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request, { userId: decoded.userId, role });
    });
  });

  wss.on("connection", (ws, _req, ctx = {}) => {
    let ffmpegProcess = null;
    let ffmpegStdin = null;
    let recordPath = null;

    const cleanup = () => {
      if (ffmpegStdin && !ffmpegStdin.destroyed) {
        try {
          ffmpegStdin.end();
        } catch (_) {}
      }
      if (ffmpegProcess) {
        try {
          ffmpegProcess.kill("SIGKILL");
        } catch (_) {}
      }
      ffmpegProcess = null;
      ffmpegStdin = null;
    };

    ws.on("message", (data, isBinary) => {
      if (isBinary && Buffer.isBuffer(data)) {
        if (ffmpegStdin && !ffmpegStdin.destroyed) {
          ffmpegStdin.write(data, (err) => {
            if (err) console.error("[stream-ws] FFmpeg write error:", err.message);
          });
        }
        return;
      }
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "start") {
          if (ffmpegProcess) {
            ws.send(JSON.stringify({ type: "error", message: "Stream already started" }));
            return;
          }
          let rtmpUrl = null;
          if (msg.rtmpUrl && String(msg.rtmpUrl).startsWith("rtmp")) {
            rtmpUrl = String(msg.rtmpUrl).trim();
          } else if (msg.rtmpServerUrl && msg.streamKey) {
            const base = String(msg.rtmpServerUrl).trim().replace(/\/+$/, "");
            rtmpUrl = `${base}/${String(msg.streamKey).trim()}`;
          } else if (msg.streamKey) {
            rtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${String(msg.streamKey).trim()}`;
          } else {
            rtmpUrl = getFullRtmpUrl();
          }
          if (!rtmpUrl) {
            ws.send(JSON.stringify({
              type: "error",
              message: "Missing RTMP URL / stream key. Set in admin panel or send rtmpUrl/streamKey in start message.",
            }));
            return;
          }
          recordPath = path.join(RECORDINGS_DIR, `stream-${Date.now()}.mp4`);
          const { ffmpeg, stdin } = startFfmpeg(rtmpUrl, recordPath);
          ffmpegProcess = ffmpeg;
          ffmpegStdin = stdin;
          ws.send(JSON.stringify({ type: "started", recordPath, rtmpUrl: rtmpUrl.replace(/\/[^/]+$/, "/***") }));
          return;
        }
        if (msg.type === "stop") {
          cleanup();
          ws.send(JSON.stringify({ type: "stopped", recordPath }));
          recordPath = null;
        }
      } catch (_) {
        // ignore non-JSON or invalid
      }
    });

    ws.on("close", () => {
      cleanup();
    });

    ws.on("error", () => {
      cleanup();
    });
  });

  console.log("[stream-ws] WebSocket ingest attached at /stream-ws");
}
