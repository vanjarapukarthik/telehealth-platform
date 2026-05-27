import { AccessToken } from "livekit-server-sdk";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY ?? "demo_key";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET ?? process.env.LIVEKIT_SECRET ?? "demo_secret";

export const getToken = async (req, res) => {
  try {
    const { room, role } = req.query;
    const name = req.query.name || req.user?.name || req.user?.email || "viewer";
    const identity = req.user ? req.user._id.toString() : `anon-${Date.now()}`;

    if (!room || !room.trim()) {
      return res.status(400).json({ error: "Room name is required" });
    }

    const isHost = req.user?.role === "doctor" || role === "host";
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
      name: req.user ? req.user.name : name,
    });
    at.addGrant({
      roomJoin: true,
      room: room.trim(),
      canPublish: isHost,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    let url = (process.env.LIVEKIT_URL || "wss://telehealth-nzq71d3l.livekit.cloud").trim();
    if (!url.startsWith("wss://") && !url.startsWith("ws://")) {
      url = url.startsWith("https://") ? url.replace(/^https:/, "wss:") : `wss://${url}`;
    }
    res.json({ token: String(token), url });
  } catch (err) {
    console.error("Token error:", err);
    res.status(500).json({ error: "Failed to create token" });
  }
};
