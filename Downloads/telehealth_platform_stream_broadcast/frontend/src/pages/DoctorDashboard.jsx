import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

const DEFAULT_RTMP_SERVER = "rtmp://a.rtmp.youtube.com/live2";

export default function DoctorDashboard() {
  const { user, isDoctor } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomName, setRoomName] = useState("");
  const [title, setTitle] = useState("Live Consultation");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // YouTube Live / RTMP stream state
  const [rtmpServerUrl, setRtmpServerUrl] = useState(DEFAULT_RTMP_SERVER);
  const [streamKey, setStreamKey] = useState("");
  const [configSaved, setConfigSaved] = useState(false);
  const [previewStream, setPreviewStream] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState("");
  const previewRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamWsRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!user) {
      navigate("/login?role=doctor", { replace: true });
      return;
    }
    if (!isDoctor) {
      navigate("/view", { replace: true });
      return;
    }
    loadSessions();
    api.getStreamConfig().then((c) => {
      setRtmpServerUrl(c.rtmpServerUrl || DEFAULT_RTMP_SERVER);
      setStreamKey(c.streamKey || "");
    }).catch(() => {});
  }, [user, isDoctor, navigate]);

  useEffect(() => {
    if (!previewRef.current || !previewStream) return;
    previewRef.current.srcObject = previewStream;
    return () => {
      if (previewRef.current) previewRef.current.srcObject = null;
    };
  }, [previewStream]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (previewStream) {
        previewStream.getTracks().forEach((t) => t.stop());
      }
      if (streamWsRef.current) {
        try { streamWsRef.current.close(); } catch (_) {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try { mediaRecorderRef.current.stop(); } catch (_) {}
      }
    };
  }, []);

  async function loadSessions() {
    try {
      const data = await api.getSessions();
      setSessions(data.sessions || []);
    } catch (_) {}
    setLoading(false);
  }

  async function handleStartLive(e) {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const name = roomName.trim() || `room-${Date.now()}`;
      await api.createSession(name, title.trim() || "Live Consultation");
      navigate(`/room/${encodeURIComponent(name)}?role=host`, { replace: true });
    } catch (err) {
      setError(err.message || "Failed to start");
    } finally {
      setCreating(false);
    }
  }

  async function saveStreamConfig() {
    setStreamError("");
    try {
      await api.updateStreamConfig({ rtmpServerUrl, streamKey });
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 2000);
    } catch (e) {
      setStreamError(e.message || "Failed to save config");
    }
  }

  function startPreview() {
    setStreamError("");
    if (previewStream) {
      previewStream.getTracks().forEach((t) => t.stop());
      setPreviewStream(null);
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        streamRef.current = stream;
        setPreviewStream(stream);
      })
      .catch((err) => {
        setStreamError(err.message || "Camera/mic access denied");
      });
  }

  function getStreamWsUrl() {
    const token = localStorage.getItem("token");
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = import.meta.env.VITE_WS_HOST || window.location.host;
    return `${protocol}//${host}/stream-ws?token=${encodeURIComponent(token || "")}`;
  }

  function startLiveStream() {
    setStreamError("");
    if (isStreaming) return;
    const key = streamKey.trim();
    if (!key && !rtmpServerUrl.includes("youtube")) {
      setStreamError("Enter stream key or full RTMP URL");
      return;
    }
    let streamToUse = previewStream || streamRef.current;
    const startMedia = () => {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          streamRef.current = stream;
          if (!previewStream) setPreviewStream(stream);
          connectAndStream(stream);
        })
        .catch((err) => setStreamError(err.message || "Camera/mic access denied"));
    };
    if (streamToUse && streamToUse.active) {
      connectAndStream(streamToUse);
    } else {
      startMedia();
    }
  }

  function connectAndStream(stream) {
    const ws = new WebSocket(getStreamWsUrl());
    streamWsRef.current = ws;
    ws.binaryType = "arraybuffer";
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "start",
        rtmpServerUrl: rtmpServerUrl.trim() || DEFAULT_RTMP_SERVER,
        streamKey: streamKey.trim(),
      }));
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "started") {
          const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
            ? "video/webm;codecs=vp8,opus"
            : "video/webm";
          const rec = new MediaRecorder(stream, {
            mimeType: mime,
            videoBitsPerSecond: 2500000,
            audioBitsPerSecond: 128000,
          });
          mediaRecorderRef.current = rec;
          rec.ondataavailable = (ev) => {
            if (ev.data.size && ws.readyState === 1) ws.send(ev.data);
          };
          rec.start(500);
          setIsStreaming(true);
          setStreamError("");
        }
        if (msg.type === "error") setStreamError(msg.message || "Stream error");
        if (msg.type === "stopped") setIsStreaming(false);
      } catch (_) {}
    };
    ws.onerror = () => setStreamError("WebSocket error");
    ws.onclose = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
      streamWsRef.current = null;
      setIsStreaming(false);
    };
  }

  function stopLiveStream() {
    const ws = streamWsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "stop" }));
      ws.close();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    streamWsRef.current = null;
    mediaRecorderRef.current = null;
    setIsStreaming(false);
  }

  const liveSessions = sessions.filter((s) => s.status === "live");

  return (
    <div
      className="min-h-screen w-full bg-cover bg-fixed bg-center bg-no-repeat"
      style={{ backgroundImage: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)" }}
    >
      <nav className="border-b border-white/20 bg-white/10 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold text-white">
            <span className="text-xl">🩺</span> Telehealth Live
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/80">{user?.name}</span>
            <Link to="/" className="text-sm text-white transition-colors hover:text-white/90 hover:underline">Home</Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold text-white">Doctor Dashboard</h1>
        <p className="mt-1 text-white/80">Start a live consultation or manage sessions.</p>

        <div className="dashboard-card accent-border-cyan mt-8 p-6">
          <h2 className="text-lg font-semibold text-white">Start live stream</h2>
          <form onSubmit={handleStartLive} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-white">Room ID</label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g. consultation-mar-11"
                className="dashboard-input mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Live Consultation"
                className="dashboard-input mt-1"
              />
            </div>
            {error && <p className="text-sm text-red-200">{error}</p>}
            <button
              type="submit"
              disabled={creating}
              className="btn-primary disabled:opacity-50 disabled:transform-none"
            >
              {creating ? "Starting…" : "Go live"}
            </button>
          </form>
        </div>

        <div className="dashboard-card accent-border-teal mt-8 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">YouTube Live / RTMP stream</h2>
            {isStreaming && (
              <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-lg">
                LIVE
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-white/80">
            Stream your webcam to YouTube Live (or any RTMP server) without OBS. Preview shows before and during stream.
          </p>

          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white">RTMP Server URL</label>
                <input
                  type="text"
                  value={rtmpServerUrl}
                  onChange={(e) => setRtmpServerUrl(e.target.value)}
                  placeholder="rtmp://a.rtmp.youtube.com/live2"
                  className="dashboard-input mt-1 w-full"
                  disabled={isStreaming}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white">Stream Key</label>
                <input
                  type="password"
                  value={streamKey}
                  onChange={(e) => setStreamKey(e.target.value)}
                  placeholder="YouTube stream key"
                  className="dashboard-input mt-1 w-full"
                  disabled={isStreaming}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveStreamConfig}
                  disabled={isStreaming}
                  className="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/30 disabled:opacity-50"
                >
                  {configSaved ? "Saved" : "Save config"}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative aspect-video overflow-hidden rounded-lg bg-black/40">
                <video
                  ref={previewRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
                {!previewStream && !isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/70">
                    Click &quot;Start camera preview&quot; to see yourself
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={startPreview}
                  disabled={isStreaming}
                  className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
                >
                  {previewStream && !isStreaming ? "Stop preview" : "Start camera preview"}
                </button>
                <button
                  type="button"
                  onClick={startLiveStream}
                  disabled={isStreaming || !streamKey.trim()}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  Start Live Stream
                </button>
                <button
                  type="button"
                  onClick={stopLiveStream}
                  disabled={!isStreaming}
                  className="rounded-lg border border-red-400 bg-red-900/50 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-900 disabled:opacity-50"
                >
                  Stop Live Stream
                </button>
              </div>
            </div>
          </div>
          {streamError && <p className="mt-3 text-sm text-red-200">{streamError}</p>}
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-white">Live now</h2>
          {loading ? (
            <p className="mt-2 text-white/80">Loading…</p>
          ) : liveSessions.length === 0 ? (
            <p className="mt-2 text-white/80">No live sessions. Start one above.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {liveSessions.map((s) => (
                <li
                  key={s._id}
                  className="dashboard-card flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <span className="mr-2 inline-block h-2 w-2 rounded-full bg-green-400" />
                    <span className="font-medium text-white">{s.roomName}</span>
                    <span className="ml-2 text-white/80">{s.title}</span>
                  </div>
                  <Link
                    to={`/room/${encodeURIComponent(s.roomName)}?role=host`}
                    className="text-sm font-medium text-white underline transition-colors hover:text-white/90"
                  >
                    Join →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-white">Recent sessions</h2>
          {sessions.length === 0 && !loading ? (
            <p className="mt-2 text-white/80">No sessions yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {sessions.slice(0, 10).map((s) => (
                <li
                  key={s._id}
                  className="dashboard-card flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <span
                      className={`mr-2 inline-block h-2 w-2 rounded-full ${s.status === "live" ? "bg-green-400" : "bg-white/50"}`}
                    />
                    <span className="font-medium text-white">{s.roomName}</span>
                    <span className="ml-2 text-white/80">{s.title}</span>
                    <span className="ml-2 text-xs text-white/70">{s.status}</span>
                  </div>
                  {s.status === "live" && (
                    <Link
                      to={`/room/${encodeURIComponent(s.roomName)}?role=host`}
                      className="text-sm font-medium text-white underline transition-colors hover:text-white/90"
                    >
                      Join
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
