const API_BASE = import.meta.env.VITE_API_URL || "";
const API_PREFIX = "/api";
const API = `${API_BASE}${API_PREFIX}`;

function getToken() {
  return localStorage.getItem("token");
}

function headers(includeAuth = true) {
  const h = { "Content-Type": "application/json" };
  if (includeAuth) {
    const t = getToken();
    if (t) h.Authorization = `Bearer ${t}`;
  }
  return h;
}

export const api = {
  async login(email, password, role) {
    const body = {
      email: String(email).trim().toLowerCase(),
      password: String(password),
      ...(role ? { role } : {}),
    };
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: headers(false),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Login failed");
    return data;
  },

  async getToken(room, role = "viewer") {
    const params = new URLSearchParams({ room, role: role === "doctor" ? "host" : "viewer" });
    const res = await fetch(`${API}/token?${params}`, { headers: headers() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to get token");
    return data;
  },

  async getSessions() {
    const res = await fetch(`${API}/sessions`, { headers: headers() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to get sessions");
    return data;
  },

  async createSession(roomName, title) {
    const res = await fetch(`${API}/sessions`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ roomName, title }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to create session");
    return data;
  },

  async endSession(roomName) {
    const res = await fetch(`${API}/sessions/${encodeURIComponent(roomName)}/end`, {
      method: "POST",
      headers: headers(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to end session");
    return data;
  },

  async startRtmp(room, rtmpUrl) {
    const body = { room: String(room).trim(), rtmpUrl: String(rtmpUrl).trim() };
    console.log("[API] POST /stream/rtmp", body);
    const res = await fetch(`${API}/stream/rtmp`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[API] RTMP failed", res.status, data);
      throw new Error(data.error || `RTMP failed (${res.status})`);
    }
    return data;
  },

  async startRecord(room) {
    const res = await fetch(`${API}/stream/record`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ room }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Recording failed");
    return data;
  },

  async kickViewer(room, identity) {
    const res = await fetch(`${API}/moderate/kick`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ room, identity }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Kick failed");
    return data;
  },

  async getChatMessages(roomName) {
    const res = await fetch(`${API}/chat/messages?roomName=${encodeURIComponent(roomName)}`, {
      headers: headers(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to get messages");
    return data;
  },

  async getStreamConfig() {
    const res = await fetch(`${API}/stream-config`, { headers: headers() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to get stream config");
    return data;
  },

  async updateStreamConfig({ rtmpServerUrl, streamKey }) {
    const res = await fetch(`${API}/stream-config`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ rtmpServerUrl, streamKey }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to update stream config");
    return data;
  },

  async sendChatMessage(roomName, content) {
    const res = await fetch(`${API}/chat/message`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ roomName, content }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to send message");
    return data;
  },
};
