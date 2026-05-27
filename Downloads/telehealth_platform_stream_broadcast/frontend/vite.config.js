import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:3000", changeOrigin: true },
      "/auth": { target: "http://localhost:3000", changeOrigin: true },
      "/token": { target: "http://localhost:3000", changeOrigin: true },
      "/sessions": { target: "http://localhost:3000", changeOrigin: true },
      "/stream": { target: "http://localhost:3000", changeOrigin: true },
      "/moderate": { target: "http://localhost:3000", changeOrigin: true },
      "/chat": { target: "http://localhost:3000", changeOrigin: true },
      "/audit": { target: "http://localhost:3000", changeOrigin: true },
      "/socket.io": { target: "http://localhost:3000", ws: true },
      "/stream-ws": { target: "http://localhost:3000", ws: true },
    },
  },
});
