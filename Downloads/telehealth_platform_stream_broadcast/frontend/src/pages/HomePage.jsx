import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-10 border-b border-white/10 bg-slate-900/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-cyan to-primary-500 text-2xl shadow-lg">🩺</span>
            <span className="text-xl font-semibold text-white">Telehealth Live Broadcast</span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-dark-text-muted">{user.name} ({user.role})</span>
                {user.role === "doctor" && (
                  <Link
                    to="/dashboard"
                    className="btn-primary rounded-lg px-4 py-2 text-sm font-medium"
                  >
                    Dashboard
                  </Link>
                )}
                <Link
                  to={user.role === "doctor" ? "/dashboard" : "/view"}
                  className="rounded-lg border border-accent-teal/50 bg-slate-800/80 px-4 py-2 text-sm font-medium text-accent-teal transition-all duration-200 hover:border-accent-teal hover:bg-accent-teal/10 hover:shadow-glow-teal"
                >
                  {user.role === "doctor" ? "Go Live" : "Watch Live"}
                </Link>
                <button
                  onClick={logout}
                  className="text-sm text-dark-text-muted transition-colors hover:text-dark-text"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login?role=doctor"
                  className="btn-primary"
                >
                  Doctor Login
                </Link>
                <Link
                  to="/login?role=patient"
                  className="rounded-lg border-2 border-accent-cyan/70 bg-slate-800/80 px-4 py-2 text-sm font-medium text-accent-cyan transition-all duration-200 hover:border-accent-cyan hover:bg-accent-cyan/10 hover:shadow-glow-teal"
                >
                  Patient Login
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <span className="inline-block rounded-full bg-accent-cyan/20 px-4 py-1.5 text-sm font-medium text-accent-cyan">Live consultations</span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Live telehealth consultations, in one place
          </h1>
          <p className="mt-4 mx-auto max-w-2xl text-lg text-slate-300">
            Doctors broadcast live sessions. Patients watch, ask questions in chat, and get care from anywhere.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard icon="📹" title="Live video" description="WebRTC streaming with LiveKit. Low latency, HD quality." accent="cyan" />
          <FeatureCard icon="🖥️" title="Screen sharing" description="Doctors share reports and explain visually." accent="teal" />
          <FeatureCard icon="💬" title="Live chat" description="Real-time Q&A between doctor and viewers." accent="emerald" />
          <FeatureCard icon="📤" title="RTMP broadcast" description="Push stream to YouTube or your CDN." accent="violet" />
          <FeatureCard icon="⏺️" title="Recording" description="Save sessions as MP4 for later review." accent="amber" />
          <FeatureCard icon="🛡️" title="Moderation" description="Kick viewers and control the room." accent="rose" />
        </div>

        {!user && (
          <div className="mt-20 flex flex-wrap justify-center gap-4">
            <Link
              to="/login?role=doctor"
              className="btn-primary rounded-xl px-8 py-4 text-lg shadow-glow"
            >
              I'm a Doctor
            </Link>
            <Link
              to="/login?role=patient"
              className="rounded-xl border-2 border-accent-cyan bg-slate-800/80 px-8 py-4 text-lg font-medium text-accent-cyan transition-all duration-200 hover:bg-accent-cyan/15 hover:shadow-glow-teal"
            >
              I'm a Patient
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

const accentMap = { cyan: "accent-border-cyan", teal: "accent-border-teal", emerald: "accent-border-emerald", violet: "accent-border-violet", amber: "accent-border-amber", rose: "accent-border-rose" };
const accentBgMap = { cyan: "bg-accent-cyan/10", teal: "bg-accent-teal/10", emerald: "bg-accent-emerald/10", violet: "bg-accent-violet/10", amber: "bg-accent-amber/10", rose: "bg-accent-rose/10" };
const accentTextMap = { cyan: "text-accent-cyan", teal: "text-accent-teal", emerald: "text-accent-emerald", violet: "text-accent-violet", amber: "text-accent-amber", rose: "text-accent-rose" };

function FeatureCard({ icon, title, description, accent = "cyan" }) {
  return (
    <div className={`card-dark p-6 ${accentMap[accent] || accentMap.cyan} ${accentBgMap[accent] || ""}`}>
      <span className={`inline-flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${accentBgMap[accent]} ${accentTextMap[accent]}`}>{icon}</span>
      <h3 className="mt-3 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1 text-slate-400">{description}</p>
    </div>
  );
}
