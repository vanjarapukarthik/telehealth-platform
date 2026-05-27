/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { 50: "#eff6ff", 100: "#dbeafe", 200: "#bfdbfe", 300: "#93c5fd", 400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8", 800: "#1e40af", 900: "#1e3a8a" },
        surface: { 50: "#f8fafc", 100: "#f1f5f9", 200: "#e2e8f0", 300: "#cbd5e1", 400: "#94a3b8", 500: "#64748b", 600: "#475569", 700: "#334155", 800: "#1e293b", 900: "#0f172a" },
        accent: {
          cyan: "#22d3ee",
          teal: "#2dd4bf",
          emerald: "#34d399",
          violet: "#a78bfa",
          amber: "#fbbf24",
          rose: "#fb7185",
        },
        dark: {
          bg: "#0f172a",
          card: "#1e293b",
          text: "#e2e8f0",
          "text-muted": "#94a3b8",
          border: "#334155",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      transitionDuration: { 200: "200ms" },
      boxShadow: {
        "dark-lg": "0 10px 40px -10px rgba(0,0,0,0.4)",
        glow: "0 0 20px rgba(59, 130, 246, 0.3)",
        "glow-teal": "0 0 20px rgba(45, 212, 191, 0.25)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "hero-gradient": "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
      },
    },
  },
  plugins: [],
};
