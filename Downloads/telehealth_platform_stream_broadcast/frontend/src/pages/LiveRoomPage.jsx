import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  Room,
  RoomEvent,
  ConnectionState,
  createLocalVideoTrack,
  createLocalAudioTrack,
  createLocalScreenTracks,
} from "livekit-client";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { io } from "socket.io-client";

const WS_URL = import.meta.env.VITE_WS_URL || "";

export default function LiveRoomPage() {
  const { roomName: encodedRoom } = useParams();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") === "host" ? "host" : "viewer";
  const { user } = useAuth();
  const navigate = useNavigate();
  const roomName = decodeURIComponent(encodedRoom || "");

  const [room, setRoom] = useState(null);
  const [status, setStatus] = useState("");
  const [tracks, setTracks] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [isJoining, setIsJoining] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [rtmpUrl, setRtmpUrl] = useState("");
  const [isRtmpStarting, setIsRtmpStarting] = useState(false);
  const [isRtmpLive, setIsRtmpLive] = useState(false);
  const [localVideoReady, setLocalVideoReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingEgressId, setRecordingEgressId] = useState(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);

  const videoRef = useRef(null);
  const remoteContainerRef = useRef(null);
  const chatEndRef = useRef(null);
  const socketRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const attachedRemoteTracksRef = useRef(new Map());
  const spokenMessageIdsRef = useRef(new Set());

  const requestMediaPermissions = useCallback(async () => {
    if (!navigator?.mediaDevices?.getUserMedia) return;
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      tempStream.getTracks().forEach((t) => t.stop());
      console.log("[Media] Camera/mic permission granted");
    } catch (err) {
      console.warn("[Media] Camera/mic permission not granted:", err?.message || err);
    }
  }, []);

  useEffect(() => {
    if (!user || !roomName) {
      navigate("/", { replace: true });
      return;
    }
    joinRoom();
    return () => {
      if (room) {
        room.disconnect();
        setRoom(null);
      }
      if (socketRef.current) socketRef.current.disconnect();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    if (!ttsEnabled || role !== "viewer" || !("speechSynthesis" in window)) return;
    const latest = [...chatMessages].reverse().find((m) => {
      const id = m._id || `${m.senderName}-${m.content}-${m.createdAt || ""}`;
      return !spokenMessageIdsRef.current.has(id);
    });
    if (!latest?.content) return;
    const latestId = latest._id || `${latest.senderName}-${latest.content}-${latest.createdAt || ""}`;
    spokenMessageIdsRef.current.add(latestId);
    const utterance = new SpeechSynthesisUtterance(`${latest.senderName || "Doctor"} says ${latest.content}`);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [chatMessages, ttsEnabled, role]);

  // Attach local video when host and container mounted (so video actually plays)
  useEffect(() => {
    if (role !== "host" || !videoRef.current) return;
    const track = localVideoTrackRef.current || (room && [...room.localParticipant.trackPublications.values()].find(
      (p) => p.kind === "video" && p.source !== "screen_share" && p.track
    )?.track);
    if (!track) return;
    let el;
    try {
      el = track.attach();
    } catch (err) {
      console.warn("Local video attach failed:", err);
      return;
    }
    if (!el) return;
    el.className = "w-full h-full object-cover";
    el.muted = true;
    el.autoplay = true;
    el.playsInline = true;
    el.setAttribute("playsinline", "true");
    videoRef.current.innerHTML = "";
    videoRef.current.appendChild(el);
    el.play().catch(() => {});
    return () => {
      try {
        if (track && el) track.detach(el);
      } catch (_) {}
    };
  }, [room, role]);

  const addTrackEntry = useCallback((track, participantIdentity, label, isScreenShare) => {
    setTracks((prev) => {
      const key = track.sid || `${participantIdentity}-${label}-${Date.now()}`;
      if (prev.some((t) => t.key === key)) return prev;
      return [...prev, { key, track, participantIdentity, label, isScreenShare }];
    });
  }, []);

  const removeTrackEntry = useCallback((track) => {
    setTracks((prev) => prev.filter((t) => t.track !== track));
  }, []);

  const joinRoom = async () => {
    try {
      attachedRemoteTracksRef.current.clear();
      setStatus("Getting token…");
      const tokenData = await api.getToken(roomName, user.role === "doctor" ? "doctor" : "viewer");
      const liveKitUrl = tokenData.url?.trim() || "";
      const token = tokenData.token?.trim() || "";
      if (!liveKitUrl.startsWith("wss://") && !liveKitUrl.startsWith("ws://")) {
        throw new Error("Invalid LiveKit URL (must be wss:// or ws://)");
      }
      console.log("[LiveKit] Connecting to", liveKitUrl.replace(/\/$/, ""));

      const lkRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        disconnectOnPageLeave: false,
      });

      lkRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
        console.log("[LiveKit] Connection state:", state);
        if (state === ConnectionState.Disconnected) setStatus("Disconnected.");
        if (state === ConnectionState.Reconnecting) setStatus("Reconnecting…");
      });
      lkRoom.on(RoomEvent.Disconnected, (reason) => {
        console.warn("[LiveKit] Disconnected:", reason);
        setRoom(null);
      });

      setStatus("Connecting…");
      await lkRoom.connect(liveKitUrl, token, {
        autoSubscribe: true,
        peerConnectionTimeout: 20_000,
        websocketTimeout: 10_000,
        maxRetries: 3,
      });

      await new Promise((resolve, reject) => {
        if (lkRoom.state === ConnectionState.Connected) {
          resolve();
          return;
        }
        const onConnected = () => {
          lkRoom.off(RoomEvent.Connected, onConnected);
          lkRoom.off(RoomEvent.Disconnected, onDisconnected);
          resolve();
        };
        const onDisconnected = () => {
          lkRoom.off(RoomEvent.Connected, onConnected);
          lkRoom.off(RoomEvent.Disconnected, onDisconnected);
          reject(new Error("Disconnected before fully connected"));
        };
        lkRoom.on(RoomEvent.Connected, onConnected);
        lkRoom.on(RoomEvent.Disconnected, onDisconnected);
      });

      console.log("[LiveKit] Connected, state:", lkRoom.state);
      console.log("Connected to room");
      setRoom(lkRoom);
      setStatus("");
      await requestMediaPermissions();

      lkRoom.on(RoomEvent.LocalTrackPublished, (publication) => {
        console.log("Track published", {
          kind: publication.kind,
          source: publication.source,
          sid: publication.trackSid,
        });
      });

      if (role === "host" && user.role === "doctor") {
        try {
          setStatus("Starting camera…");
          const localVideoTrack = await createLocalVideoTrack({
            resolution: { width: 1280, height: 720 },
            facingMode: "user",
          });
          localVideoTrackRef.current = localVideoTrack;
          setLocalVideoReady(true);
          const audioTrack = await createLocalAudioTrack();
          if (lkRoom.state !== ConnectionState.Connected) {
            throw new Error("Room disconnected before publish");
          }
          await lkRoom.localParticipant.publishTrack(localVideoTrack, { simulcast: true });
          await lkRoom.localParticipant.publishTrack(audioTrack);
          console.log("Track published", { kind: "video", participant: lkRoom.localParticipant.identity });
          console.log("Track published", { kind: "audio", participant: lkRoom.localParticipant.identity });
          addTrackEntry(localVideoTrack, lkRoom.localParticipant.identity, "You", false);
          setStatus("");
        } catch (err) {
          console.warn("Could not publish camera/mic:", err);
          setStatus(err?.message || "Camera/mic access denied or unavailable.");
        }
      }

      const base = WS_URL || (import.meta.env.VITE_API_URL || "").replace(/\/$/, "") || window.location.origin;
      const socket = io(base, { path: "/socket.io", transports: ["websocket", "polling"] });
      socketRef.current = socket;
      socket.emit("join_room", roomName);
      socket.on("chat_message", (msg) => {
        setChatMessages((prev) => [...prev, msg]);
      });
      setChatMessages([]);
      try {
        const { messages } = await api.getChatMessages(roomName);
        setChatMessages(messages || []);
      } catch (_) {}

      setParticipants([...lkRoom.remoteParticipants.values()]);
      lkRoom.on(RoomEvent.ParticipantConnected, () => {
        setParticipants([...lkRoom.remoteParticipants.values()]);
      });
      lkRoom.on(RoomEvent.ParticipantDisconnected, () => {
        setParticipants([...lkRoom.remoteParticipants.values()]);
      });
      lkRoom.on(RoomEvent.TrackPublished, (publication, participant) => {
        console.log("[LiveKit] Remote track published", {
          participant: participant.identity,
          kind: publication.kind,
          source: publication.source,
          sid: publication.trackSid,
          subscribed: publication.isSubscribed,
        });
      });

      lkRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        const isScreen = publication.source === "screen_share";
        const label = isScreen ? `${participant.identity} (Screen)` : participant.identity;
        console.log("Track subscribed", {
          participant: participant.identity,
          kind: track.kind,
          source: publication.source,
          sid: track.sid,
        });
        if (participant.identity !== lkRoom.localParticipant?.identity && (track.kind === "video" || publication.source === "screen_share")) {
          attachRemoteToContainer(track, participant, label);
        } else {
          addTrackEntry(track, participant.identity, label, isScreen);
        }
      });
      lkRoom.on(RoomEvent.TrackUnsubscribed, (track) => removeTrackEntry(track));
      lkRoom.on(RoomEvent.Disconnected, () => {
        setRoom(null);
        setStatus("Disconnected.");
        attachedRemoteTracksRef.current.clear();
      });

      const attached = attachedRemoteTracksRef.current;
      function attachRemoteToContainer(track, participant, label, retryCount = 0) {
        const container = remoteContainerRef.current;
        if (!container) {
          if (retryCount < 12) {
            setTimeout(() => attachRemoteToContainer(track, participant, label, retryCount + 1), 250);
          } else {
            console.warn("[LiveKit] Remote container unavailable after retries", {
              participant: participant.identity,
              sid: track.sid,
            });
          }
          return;
        }
        if (attached.has(track.sid)) return;
        try {
          const el = track.attach();
          if (!el) return;
          el.className = "w-full h-full object-cover";
          if (el.tagName === "VIDEO") {
            el.autoplay = true;
            el.playsInline = true;
            el.setAttribute("playsinline", "true");
            // Start muted so browser autoplay policy doesn't block viewer playback.
            el.muted = true;
            el.play().catch(() => {});
            // Let viewers explicitly unmute with a click/tap gesture.
            el.addEventListener("click", () => {
              el.muted = false;
              el.play().catch(() => {});
            }, { once: true });
          }
          const wrapper = document.createElement("div");
          wrapper.className = "relative aspect-video min-w-[280px] overflow-hidden rounded-lg transition-shadow hover:shadow-lg";
          wrapper.style.backgroundColor = "#1e293b";
          wrapper.setAttribute("data-participant", participant.identity);
          const labelDiv = document.createElement("div");
          labelDiv.className = "absolute bottom-0 left-0 right-0 py-1 px-2 bg-black/60 text-white text-sm";
          labelDiv.textContent = label;
          wrapper.appendChild(el);
          wrapper.appendChild(labelDiv);
          container.appendChild(wrapper);
          attached.set(track.sid, { wrapper, el, track });
        } catch (err) {
          console.warn("Remote video attach failed:", err);
        }
      }
      lkRoom.remoteParticipants.forEach((p) => {
        p.trackPublications.forEach((pub) => {
          if (pub.track && pub.isSubscribed) {
            const isScreen = pub.source === "screen_share";
            const label = isScreen ? `${p.identity} (Screen)` : p.identity;
            if (pub.kind === "video" || pub.source === "screen_share") {
              attachRemoteToContainer(pub.track, p, label);
            } else {
              addTrackEntry(pub.track, p.identity, label, isScreen);
            }
          }
        });
      });

      lkRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
        const entry = attached.get(track.sid);
        if (entry && remoteContainerRef.current?.contains(entry.wrapper)) {
          try {
            track.detach(entry.el);
            entry.wrapper.remove();
          } catch (_) {}
          attached.delete(track.sid);
        }
      });

      setStatus("");
    } catch (err) {
      setStatus(err.message || "Failed to join");
      navigate("/", { replace: true });
    } finally {
      setIsJoining(false);
    }
  };

  const startScreenShare = async () => {
    if (!room || role !== "host") return;
    if (isScreenSharing) return;
    setStatus("Starting screen share…");
    try {
      const screenTracks = await createLocalScreenTracks({ audio: true });
      for (const track of screenTracks) {
        await room.localParticipant.publishTrack(track, { name: "screen", source: "screen_share" });
      }
      setStatus("");
      setIsScreenSharing(true);
    } catch (err) {
      setStatus(err.message || "Screen share failed");
    }
  };

  const leave = async () => {
    localVideoTrackRef.current = null;
    setLocalVideoReady(false);
    attachedRemoteTracksRef.current.clear();
    if (role === "host" && user?.role === "doctor") {
      try {
        await api.endSession(roomName);
      } catch (_) {}
    }
    if (room) room.disconnect();
    if (socketRef.current) socketRef.current.disconnect();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    navigate(role === "host" ? "/dashboard" : "/view", { replace: true });
  };

  const sendChat = (e) => {
    e.preventDefault();
    const content = chatInput.trim();
    if (!content) return;
    if (socketRef.current) {
      socketRef.current.emit("chat_message", {
        roomName,
        senderName: user.name,
        senderRole: user.role,
        content,
        userId: user.id,
      });
    }
    setChatInput("");
  };

  const startRtmp = async () => {
    const input = rtmpUrl.trim();
    if (!input) {
      setStatus("Enter RTMP URL or YouTube stream key");
      return;
    }
    setIsRtmpStarting(true);
    setStatus("Starting RTMP…");
    console.log("[RTMP] Start clicked – room:", roomName, "input length:", input.length);
    try {
      const data = await api.startRtmp(roomName, input);
      console.log("[RTMP] Success:", data);
      setIsRtmpLive(true);
      setStatus("RTMP broadcast started.");
      setTimeout(() => setStatus(""), 4000);
    } catch (err) {
      console.error("[RTMP] Error:", err.message, err);
      setStatus(err.message || "RTMP failed");
    } finally {
      setIsRtmpStarting(false);
    }
  };

  const startRecording = async () => {
    try {
      const data = await api.startRecord(roomName);
      setIsRecording(true);
      setRecordingEgressId(data.egressId);
      setStatus("Recording started.");
    } catch (err) {
      setStatus(err.message || "Recording failed");
    }
  };

  const kickParticipant = async (identity) => {
    try {
      await api.kickViewer(roomName, identity);
      setStatus(`Kicked ${identity}`);
    } catch (err) {
      setStatus(err.message || "Kick failed");
    }
  };

  if (isJoining) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#0f172a" }}>
        <p className="text-dark-text">Joining room…</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#0f172a" }}>
        <p className="text-dark-text">{status || "Left room."}</p>
        <button onClick={() => navigate("/")} className="ml-4 text-[#3b82f6] transition-colors hover:underline">Home</button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "#0f172a" }}>
      <header className="flex flex-shrink-0 items-center justify-between border-b border-dark-border px-4 py-3" style={{ backgroundColor: "#1e293b" }}>
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          <span className="font-medium text-dark-text">{roomName}</span>
          <span className="text-sm text-dark-text-muted">({role === "host" ? "Host" : "Viewer"})</span>
        </div>
        <div className="flex items-center gap-2">
          {status && <span className="text-sm text-dark-text-muted">{status}</span>}
          <button
            onClick={leave}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-red-700 hover:shadow-lg"
          >
            Leave
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col p-4 min-w-0">
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2">
            {role === "host" && (
              <div className="relative aspect-video min-h-[200px] overflow-hidden rounded-lg transition-shadow hover:shadow-lg" style={{ backgroundColor: "#1e293b" }}>
                <div ref={videoRef} className="h-full w-full min-h-[200px]" />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-sm text-white">You</div>
                {role === "host" && !localVideoReady && (
                  <div className="absolute inset-0 flex items-center justify-center text-dark-text-muted text-sm">
                    Loading camera… Allow camera access if prompted.
                  </div>
                )}
              </div>
            )}
            <div className="relative flex min-h-[200px] flex-wrap content-start gap-4">
              <div ref={remoteContainerRef} className="flex flex-wrap content-start gap-4" />
              {role === "viewer" && participants.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-dark-text-muted text-sm">
                  Waiting for host video…
                </div>
              )}
            </div>
          </div>

          {role === "host" && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={startScreenShare}
                disabled={isScreenSharing}
                className="rounded-lg border border-dark-border px-4 py-2 text-sm font-medium text-dark-text transition-all duration-200 hover:border-slate-500 hover:bg-white/5 disabled:opacity-50"
                style={{ backgroundColor: "#1e293b" }}
              >
                {isScreenSharing ? "Sharing…" : "Share screen"}
              </button>
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="mb-1 block text-xs text-dark-text-muted">
                    RTMP URL or YouTube stream key
                  </label>
                  <input
                    type="text"
                    value={rtmpUrl}
                    onChange={(e) => setRtmpUrl(e.target.value)}
                    placeholder="e.g. rtmp://... or YouTube key"
                    className="input-dark w-72 py-2 text-sm"
                    disabled={isRtmpStarting}
                  />
                </div>
                <button
                  type="button"
                  onClick={startRtmp}
                  disabled={isRtmpStarting || !rtmpUrl.trim()}
                  className="rounded-lg border border-[#3b82f6] bg-[#3b82f6] px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-[#2563eb] disabled:opacity-50"
                >
                  {isRtmpStarting ? "Starting…" : isRtmpLive ? "RTMP live" : "Start RTMP"}
                </button>
              </div>
              <button
                onClick={startRecording}
                disabled={isRecording}
                className="rounded-lg border border-dark-border px-4 py-2 text-sm font-medium text-dark-text transition-all duration-200 hover:border-[#3b82f6] hover:bg-[#3b82f6]/10 disabled:opacity-50"
                style={{ backgroundColor: "#1e293b" }}
              >
                {isRecording ? "Recording…" : "Start recording"}
              </button>
            </div>
          )}
        </div>

        <aside className="flex w-80 flex-shrink-0 flex-col border-l border-dark-border" style={{ backgroundColor: "#1e293b" }}>
          <div className="border-b border-dark-border p-3">
            <span className="text-sm font-medium text-dark-text">Live chat</span>
            {role === "viewer" && (
              <button
                type="button"
                onClick={() => setTtsEnabled((v) => !v)}
                className="ml-3 rounded border border-dark-border px-2 py-1 text-xs text-dark-text-muted transition-colors hover:text-dark-text"
              >
                {ttsEnabled ? "TTS on" : "TTS off"}
              </button>
            )}
            {role === "host" && participants.length > 0 && (
              <div className="mt-2 space-y-1">
                <span className="text-xs text-dark-text-muted">Moderation — kick viewer:</span>
                {participants.map((p) => (
                  <div key={p.identity} className="flex items-center justify-between text-sm">
                    <span className="text-dark-text">{p.identity}</span>
                    <button
                      onClick={() => kickParticipant(p.identity)}
                      className="text-red-400 transition-colors hover:underline"
                    >
                      Kick
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {chatMessages.map((m, i) => (
              <div key={m._id || i} className="text-sm">
                <span className={m.senderRole === "doctor" ? "font-medium text-[#3b82f6]" : "font-medium text-dark-text-muted"}>
                  {m.senderName}:
                </span>{" "}
                <span className="text-dark-text">{m.content}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={sendChat} className="flex gap-2 border-t border-dark-border p-3">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message…"
              className="input-dark flex-1 py-2 text-sm"
            />
            <button type="submit" className="btn-primary shrink-0">Send</button>
          </form>
        </aside>
      </div>
    </div>
  );
}
