/**
 * Post-deploy check: GET /health on your API base URL.
 * Usage: VERIFY_URL=https://api.example.com/health node scripts/verify-health.js
 */
const url = process.env.VERIFY_URL || "http://127.0.0.1:3000/health";

try {
  const res = await fetch(url);
  const body = await res.text();
  console.log(`[verify-health] ${res.status} ${url}`);
  console.log(body);
  if (!res.ok) process.exit(1);
} catch (err) {
  console.error("[verify-health] Failed:", err.message);
  process.exit(1);
}
