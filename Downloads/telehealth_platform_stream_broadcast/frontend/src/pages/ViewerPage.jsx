import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

export default function ViewerPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomInput, setRoomInput] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/login?role=patient", { replace: true });
      return;
    }
    loadSessions();
  }, [user, navigate]);

  async function loadSessions() {
    try {
      const data = await api.getSessions();
      setSessions(data.sessions || []);
    } catch (_) {}
    setLoading(false);
  }

  const liveSessions = sessions.filter((s) => s.status === "live");

  function handleJoinRoom(e) {
    e.preventDefault();
    const room = roomInput.trim();
    if (!room) return;
    navigate(`/room/${encodeURIComponent(room)}?role=viewer`);
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b border-white/10 bg-slate-900/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold text-white">
            <span className="text-xl">🩺</span> Telehealth Live
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">{user?.name}</span>
            <Link to="/" className="text-sm text-accent-cyan transition-colors hover:text-accent-teal hover:underline">Home</Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold text-white">Watch live consultation</h1>
        <p className="mt-1 text-slate-400">Join a room by ID or pick a live session below.</p>

        <div className="card-dark accent-border-teal mt-8 p-6">
          <h2 className="text-lg font-semibold text-white">Join by room ID</h2>
          <form onSubmit={handleJoinRoom} className="mt-4 flex gap-2">
            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="Enter room ID"
              className="input-dark flex-1"
            />
            <button type="submit" className="btn-primary">
              Watch
            </button>
          </form>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-white">Live now</h2>
          {loading ? (
            <p className="mt-2 text-dark-text-muted">Loading…</p>
          ) : liveSessions.length === 0 ? (
            <p className="mt-2 text-dark-text-muted">No live sessions at the moment.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {liveSessions.map((s) => (
                <li
                  key={s._id}
                  className="card-dark flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <span className="mr-2 inline-block h-2 w-2 rounded-full bg-green-500" />
                    <span className="font-medium text-dark-text">{s.roomName}</span>
                    <span className="ml-2 text-dark-text-muted">{s.title}</span>
                    {s.doctorId?.name && (
                      <span className="ml-2 text-sm text-dark-text-muted">— {s.doctorId.name}</span>
                    )}
                  </div>
                  <Link
                    to={`/room/${encodeURIComponent(s.roomName)}?role=viewer`}
                    className="btn-primary text-sm"
                  >
                    Watch
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
