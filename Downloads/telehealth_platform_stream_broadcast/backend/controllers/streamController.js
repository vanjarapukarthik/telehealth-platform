import { RoomServiceClient } from "livekit-server-sdk";
import Session from "../models/Session.js";
import Recording from "../models/Recording.js";

const LIVEKIT_URL = process.env.LIVEKIT_URL ?? "wss://telehealth-nzq71d3l.livekit.cloud";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY ?? "demo_key";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET ?? process.env.LIVEKIT_SECRET ?? "demo_secret";
const livekitApiHost = LIVEKIT_URL.replace(/^wss:/, "https:");
const roomService = new RoomServiceClient(livekitApiHost, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

let egressClient = null;
let StreamOutput = null;
let StreamProtocol = null;
let EncodedFileOutput = null;
try {
  const sdk = await import("livekit-server-sdk");
  if (sdk.EgressClient) {
    egressClient = new sdk.EgressClient(livekitApiHost, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
    StreamOutput = sdk.StreamOutput;
    StreamProtocol = sdk.StreamProtocol;
    EncodedFileOutput = sdk.EncodedFileOutput;
    console.log("[RTMP] EgressClient initialized successfully");
  } else {
    console.warn("[RTMP] EgressClient not found in livekit-server-sdk");
  }
} catch (err) {
  console.error("[RTMP] Failed to load LiveKit Egress SDK:", err.message);
}

/**
 * Build full RTMP URL from input.
 * - If input already looks like rtmp:// or rtmps://, use as-is.
 * - Otherwise treat as stream key and use YouTube ingest URL.
 */
function normalizeRtmpUrl(input) {
  const trimmed = String(input).trim();
  if (!trimmed) return null;
  if (/^rtmps?:\/\//i.test(trimmed)) return trimmed;
  return `rtmp://a.rtmp.youtube.com/live2/${trimmed}`;
}

export const startRtmp = async (req, res) => {
  const startTime = Date.now();
  try {
    const { room, rtmpUrl: rtmpUrlRaw, streamKey } = req.body ?? {};
    const roomName = room ? String(room).trim() : "";
    const rtmpUrl = normalizeRtmpUrl(rtmpUrlRaw || streamKey);

    console.log("[RTMP] Request received:", { room: roomName, hasRtmpUrl: !!rtmpUrl, hasStreamKey: !!streamKey });

    if (!roomName) {
      console.warn("[RTMP] Validation failed: missing room");
      return res.status(400).json({ error: "Missing 'room' in request body" });
    }
    if (!rtmpUrl) {
      console.warn("[RTMP] Validation failed: missing RTMP URL or stream key");
      return res.status(400).json({
        error: "Missing 'rtmpUrl' or 'streamKey'. Provide full URL (e.g. rtmp://a.rtmp.youtube.com/live2/KEY) or YouTube stream key only.",
      });
    }

    if (!egressClient || !StreamOutput || !StreamProtocol) {
      console.error("[RTMP] Egress not available - EgressClient or StreamOutput missing");
      return res.status(503).json({
        error: "RTMP egress not available. Ensure LiveKit Cloud/Server has egress enabled and livekit-server-sdk supports EgressClient.",
      });
    }

    const output = new StreamOutput({
      protocol: StreamProtocol.RTMP,
      urls: [rtmpUrl],
    });
    console.log("[RTMP] Starting room composite egress for room:", roomName);
    const info = await egressClient.startRoomCompositeEgress(roomName, output);
    const egressId = info.egressId || info.egressID;
    console.log("[RTMP] Egress started successfully:", { egressId, room: roomName, durationMs: Date.now() - startTime });
    res.json({ success: true, egressId });
  } catch (err) {
    console.error("[RTMP] Error:", err.message, err.code || "", err);
    const message = err.message || "RTMP start failed";
    const status = err.statusCode || err.status || 500;
    res.status(typeof status === "number" ? status : 500).json({
      error: message,
      detail: process.env.NODE_ENV === "development" ? (err.stack || undefined) : undefined,
    });
  }
};

export const startRecord = async (req, res) => {
  try {
    const { room } = req.body ?? {};
    const roomName = room ? String(room).trim() : "";
    if (!roomName) {
      return res.status(400).json({ error: "Body must include 'room'" });
    }
    if (!egressClient || !EncodedFileOutput) {
      return res.status(503).json({ error: "Recording not available (EgressClient required)" });
    }
    const filepath = `/streams/${roomName}-${Date.now()}.mp4`;
    const output = new EncodedFileOutput({ filepath });
    const info = await egressClient.startRoomCompositeEgress(roomName, output);
    const session = await Session.findOne({ roomName: roomName });
    if (session) {
      await Recording.create({
        sessionId: session._id,
        roomName: roomName,
        egressId: info.egressId || info.egressID,
        filepath,
        status: "recording",
      });
    }
    res.json({ egressId: info.egressId || info.egressID, filepath });
  } catch (err) {
    console.error("Record error:", err);
    res.status(500).json({ error: err.message || "Recording start failed" });
  }
};

export const kickViewer = async (req, res) => {
  try {
    const { room, identity } = req.body ?? {};
    if (!room || !identity) {
      return res.status(400).json({ error: "Body must include 'room' and 'identity'" });
    }
    await roomService.removeParticipant(room, identity);
    res.json({ success: true });
  } catch (err) {
    console.error("Kick error:", err);
    res.status(500).json({ error: err.message || "Kick failed" });
  }
};
