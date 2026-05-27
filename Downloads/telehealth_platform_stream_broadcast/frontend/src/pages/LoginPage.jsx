import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get("role") || "patient";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(roleParam === "doctor" ? "doctor" : "patient");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password, role);
      navigate(role === "doctor" ? "/dashboard" : "/view", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="card-dark border-accent-cyan/30 p-8 shadow-dark-lg shadow-accent-cyan/5">
          <div className="mb-6 flex justify-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent-cyan to-primary-500 text-2xl">🩺</span>
            <h1 className="text-2xl font-bold text-white">Telehealth Live</h1>
          </div>
          <p className="mb-6 text-center text-slate-400">Sign in to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-200">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-dark mt-1"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-dark mt-1"
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200">I am a</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="input-dark mt-1"
              >
                <option value="patient">Patient (viewer)</option>
                <option value="doctor">Doctor (host)</option>
              </select>
            </div>
            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
            )}
            <p className="text-center text-xs text-slate-500">
              Demo: doctor@telehealth.demo / doctor123 or patient@telehealth.com / patient123
              <br />
              <span className="text-accent-amber">First time? Run in backend: node scripts/seed.js</span>
            </p>
            <button
              type="submit"
              disabled={loading}
              className="signin-btn"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center">
          <Link to="/" className="text-accent-cyan transition-colors hover:text-accent-teal hover:underline">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
