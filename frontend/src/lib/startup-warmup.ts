import { BACKEND_HEALTH_URL, aiServiceOrigin } from "./api/client";

/**
 * Silent, parallel warm-up of the backend + AI services.
 *
 * Render free instances sleep after inactivity (~15s to cold-start). The moment
 * the frontend mounts we ping BOTH liveness endpoints in parallel so that by the
 * time the user logs in or triggers an AI feature the services are already up.
 *
 * Rules honoured here:
 * - non-blocking (fire-and-forget, never awaited by the UI);
 * - both requests start immediately, no sequencing;
 * - no infinite retry, no heavy inference — only a cheap GET /health;
 * - failures are logged, never surfaced as an error;
 * - runs once per page load (module-level singleton survives re-renders).
 */

let started = false;

const PING_TIMEOUT_MS = 8_000;

function ping(url: string, label: string): void {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  fetch(url, { method: "GET", mode: "cors", credentials: "omit", signal: controller.signal })
    .then((res) => {
      if (res.ok) console.debug(`[STARTUP] ${label} health check ok (${url})`);
      else console.debug(`[STARTUP] ${label} health check responded ${res.status}`);
    })
    .catch((err: unknown) => {
      // Cold starts abort with a network/CORS error — that's expected and fine.
      console.debug(`[STARTUP] ${label} warm-up request failed silently`, err);
    })
    .finally(() => clearTimeout(timer));
}

export function warmUpServers(): void {
  if (started) return;
  started = true;
  if (typeof window === "undefined") return;

  console.debug("[STARTUP] Backend health check");
  ping(BACKEND_HEALTH_URL, "Backend");

  const aiUrl = aiServiceOrigin();
  if (aiUrl) {
    console.debug("[STARTUP] AI server warm-up started");
    ping(`${aiUrl}/health`, "AI server");
  } else {
    console.debug("[STARTUP] VITE_AI_SERVICE_URL not set — skipping AI warm-up");
  }
}

/** Used by tests only. */
export function __resetWarmup(): void {
  started = false;
}
