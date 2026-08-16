import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import type { ApiEnvelope } from "./types";

/**
 * Base URL for all API calls (`/api/v1`). Used by the auth/api modules and to
 * derive the backend origin for the lightweight liveness wake-up.
 */
const VITE_ENV: Record<string, string | undefined> =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

export const API_BASE_URL = VITE_ENV.VITE_API_URL || "http://localhost:5000/api/v1";

/** Backend origin (e.g. `https://…onrender.com`) — for warm-up requests. */
export function backendOrigin(): string {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return API_BASE_URL.split("/api")[0] || API_BASE_URL;
  }
}

/** Lightweight liveness endpoint on the backend, outside the `/api/v1` base. */
export const BACKEND_HEALTH_URL = `${backendOrigin()}/health`;

/** AI-service public URL used ONLY to wake it (its data endpoints stay keyed to the backend). */
export function aiServiceOrigin(): string {
  return (VITE_ENV.VITE_AI_SERVICE_URL || "").replace(/\/+$/, "");
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// ---- Session-expiry signalling (AuthContext subscribes) ----
type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler | null = null;
export function setSessionExpiredHandler(handler: SessionExpiredHandler | null): () => void {
  onSessionExpired = handler;
  return () => {
    if (onSessionExpired === handler) onSessionExpired = null;
  };
}

// ---- Refresh-token single-flight ----
let refreshing: Promise<void> | null = null;

async function performRefresh() {
  if (!refreshing) {
    refreshing = apiClient
      .post("/auth/refresh", {})
      .then(() => undefined)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _warmAttempts?: number;
  _warmStartedAt?: number;
}

const AI_WARM_RETRY_WINDOW_MS = 30_000;
const AI_WARM_MAX_ATTEMPTS = 8;
// AI routes can legitimately take a while (LLM inference is proxied by the
// backend, whose AI_TIMEOUT_MS default is 120000). Give them the same budget.
const AI_ROUTE_TIMEOUT_MS = 120_000;

function warmRetryable(error: AxiosError, url: string): boolean {
  if (!url.startsWith("/ai/")) return false;
  const status = error.response?.status;
  return isNetworkError(error) || status === 503 || status === 504;
}

async function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// AI requests get the full inference-time budget instead of the 30s default.
apiClient.interceptors.request.use((config) => {
  if ((config.url || "").startsWith("/ai/")) {
    config.timeout = AI_ROUTE_TIMEOUT_MS;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined;
    if (!original) return Promise.reject(error);
    const status = error.response?.status;
    const url = original.url || "";

    // Never refresh on auth endpoints themselves.
    const isAuthRoute =
      url.startsWith("/auth/login") ||
      url.startsWith("/auth/register") ||
      url.startsWith("/auth/refresh") ||
      url.startsWith("/auth/logout");

    // 1) Expired access token → refresh once (single-flight) then retry original.
    if (status === 401 && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        await performRefresh();
        console.debug("[AUTH] Access token refreshed");
        return apiClient(original);
      } catch (refreshErr) {
        // Only a definitive rejection from the refresh endpoint itself
        // (401/403) means the session is truly dead. A refresh that never
        // reached the server (cold start / outage) is NOT — logging the user
        // out for that is what bounces them back to /login right after a
        // successful login on Render's sleeping instances.
        const refreshStatus = axios.isAxiosError(refreshErr) ? refreshErr.response?.status : undefined;
        if (refreshStatus === 401 || refreshStatus === 403) {
          console.debug("[AUTH] Refresh rejected — session expired");
          onSessionExpired?.();
        } else {
          console.debug("[AUTH] Refresh could not reach server — session kept", refreshErr);
        }
        return Promise.reject(error);
      }
    }

    // 2) AI cold-start / gateway downtime → bounded sequential retries of the
    //    SAME request (never sends duplicates). Covers backend-down (network
    //    error) and AI-down proxied as 503/504 from the backend.
    if (warmRetryable(error, url) && !isAuthRoute) {
      const now = Date.now();
      if (!original._warmStartedAt) original._warmStartedAt = now;
      const attempt = (original._warmAttempts ?? 0) + 1;
      const elapsed = now - original._warmStartedAt;
      if (attempt <= AI_WARM_MAX_ATTEMPTS && elapsed < AI_WARM_RETRY_WINDOW_MS) {
        original._warmAttempts = attempt;
        const delay = Math.min(1000 * 1.6 ** (attempt - 1), 5000);
        console.debug(`[AI] Server warming — retry ${attempt} in ${delay}ms`);
        await sleep(delay);
        return apiClient(original);
      }
    }

    return Promise.reject(error);
  },
);

// ---- Helpers ----

export interface ApiFieldError {
  field: string;
  message: string;
}

/** Human-friendly labels for backend field paths. */
export const FIELD_LABELS: Record<string, string> = {
  title: "Project name",
  shortDescription: "Short description",
  oneLineDescription: "One-line description",
  difficulty: "Difficulty",
  visibility: "Visibility",
  status: "Status",
  teamSize: "Team size",
  teamName: "Team name",
  domain: "Domain",
  license: "License",
  year: "Year",
  "implementation.githubRepository": "GitHub repository link",
  "techStack.githubRepository": "GitHub repository link",
  "architecture.description": "Architecture description",
  "architecture.diagram": "Architecture diagram",
  "architecture.figmaUrl": "Figma URL",
  "architecture.database": "Database design",
  "architecture.database.type": "Database type",
  "architecture.apiIntegrations": "API & integrations",
  "problem.overview": "Problem statement",
  "solution.overview": "Solution overview",
  "presentation.liveDemoUrl": "Live demo URL",
  "presentation.demoVideoUrl": "Demo video URL",
  "existingSolutions": "Existing solutions",
  "features": "Features",
  "research": "Research & validation",
  "team": "Team members",
  name: "Full name",
  username: "Username",
  email: "Email",
  password: "Password",
  emailOrUsername: "Email or username",
  remember: "Remember me",
  token: "Reset token",
};

function humanizeField(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  const last = field.split(".").pop() ?? field;
  return last
    .replace(/[A-Z]/g, (m) => ` ${m.toLowerCase()}`)
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

/** Per-field friendly messages when the backend only sends a generic "Invalid value". */
export const FIELD_MESSAGES: Record<string, string> = {
  title: "Must be between 3 and 160 characters",
  shortDescription: "Must be at most 300 characters",
  oneLineDescription: "Must be at most 200 characters",
  "implementation.githubRepository": "Must be a valid URL (e.g. https://github.com/you/repo)",
  "techStack.githubRepository": "Must be a valid URL (e.g. https://github.com/you/repo)",
  "architecture.database": "Check the fields in your database design",
  "architecture.database.type": "Select a valid database type",
  "architecture.description": "Add a system architecture description",
  "architecture.figmaUrl": "Must be a valid URL starting with http(s)://",
  "problem.overview": "Describe the problem your project solves",
  "solution.overview": "Add a solution overview or description",
  "presentation.liveDemoUrl": "Must be a valid URL starting with http(s)://",
  "presentation.demoVideoUrl": "Must be a valid URL starting with http(s)://",
  "existingSolutions": "Each existing solution needs a name",
  "features": "Each feature needs a name",
  "team": "Each team member needs a name",
  "team.*.contribution": "Contribution must be a percentage between 0 and 100",
  "features.*.priority": "Priority must be must-have, should-have, could-have, or future",
  "features.*.status": "Status must be planned, in-development, completed, or future",
  license: "Select a valid license",
  difficulty: "Select a valid difficulty level",
  visibility: "Select a valid visibility option",
  status: "Select a valid status",
  teamSize: "Must be a whole number between 1 and 20",
  year: "Must be a year between 1990 and 2100",
  username: "Only letters, numbers, dots, dashes and underscores (3-30 chars)",
  email: "Enter a valid email address",
  password: "Must be 8+ chars with upper, lower, number, and a special character",
  name: "Must be between 2 and 100 characters",
  emailOrUsername: "Enter your email or username",
};

export function apiFieldErrors(err: unknown): ApiFieldError[] {
  if (!axios.isAxiosError(err)) return [];
  const data = err.response?.data as { errors?: unknown } | undefined;
  if (!Array.isArray(data?.errors)) return [];
  return (data.errors as Array<{ field?: string; message?: string }>)
    .filter((e) => e && typeof e === "object")
    .map((e) => ({
      field: String(e.field ?? ""),
      message:
        e.message && !/invalid value|invalid input/i.test(e.message)
          ? e.message
          : FIELD_MESSAGES[e.field ?? ""] || "Has an invalid value",
    }));
}

/** Render one server validation error as a clear `<label>: <hint>` line. */
export function formatFieldError(field: string, message: string): string {
  return `${humanizeField(field)}: ${message}`;
}

export function apiErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined;
    const fieldErrors = apiFieldErrors(err);
    if (fieldErrors.length) {
      return `${data?.message || "Please fix the highlighted fields"}\n${fieldErrors
        .map((e) => `• ${formatFieldError(e.field, e.message)}`)
        .join("\n")}`;
    }
    return data?.message || err.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

// ---- Error differentiation (auth vs cold-start vs outage) ----

export type ApiErrorKind =
  | "network" // server unreachable / Render cold start / CORS
  | "unauthorized" // 401
  | "server" // 5xx
  | "known" // any handled API error
  | "unknown";

export function kindOfError(err: unknown): ApiErrorKind {
  if (!axios.isAxiosError(err)) return "unknown";
  if (!err.response) return "network";
  const s = err.response.status;
  if (s === 401) return "unauthorized";
  if (s >= 500) return "server";
  return "known";
}

export function isNetworkError(err: unknown): boolean {
  return kindOfError(err) === "network";
}

/**
 * Human message that never confuses a cold-start/outage with an auth failure.
 * For HTTP errors the backend's own message (e.g. "Invalid credentials",
 * "Token expired") is preferred so 401s on login aren't mislabelled.
 */
export function describeRequestError(err: unknown): string {
  const serverMessage = axios.isAxiosError(err)
    ? (err.response?.data as { message?: string } | undefined)?.message
    : undefined;
  switch (kindOfError(err)) {
    case "network":
      return "Connection lost — the server is waking up. Give it a moment and try again.";
    case "unauthorized":
      return serverMessage || "Your session has expired. Please log in again.";
    case "server":
      return serverMessage || "The server is temporarily unavailable. Please try again shortly.";
    default:
      return apiErrorMessage(err, "Something went wrong");
  }
}

/**
 * Retry a call only while the failure is a network/unreachable error (cold
 * start). Bounded by wall-clock time and attempt count so it can never loop
 * forever, and never retries genuine HTTP errors (401s, 5xx, …).
 */
export async function retryNetworkBackoff<T>(
  fn: () => Promise<T>,
  {
    maxWaitMs = 25000,
    maxAttempts = 10,
    onRetry,
  }: {
    maxWaitMs?: number;
    maxAttempts?: number;
    onRetry?: (attempt: number) => void;
  } = {},
): Promise<T> {
  const startedAt = Date.now();
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      const elapsed = Date.now() - startedAt;
      if (!isNetworkError(err) || attempt >= maxAttempts || elapsed >= maxWaitMs) throw err;
      onRetry?.(attempt);
      const delay = Math.min(800 * 1.6 ** (attempt - 1), 5000);
      await sleep(delay);
    }
  }
}

export async function apiGet<T>(url: string, config?: AxiosRequestConfig) {
  const res = await apiClient.get<ApiEnvelope<T>>(url, config);
  return res.data;
}
export async function apiPost<T>(url: string, body?: unknown, config?: AxiosRequestConfig) {
  const res = await apiClient.post<ApiEnvelope<T>>(url, body, config);
  return res.data;
}
export async function apiPut<T>(url: string, body?: unknown, config?: AxiosRequestConfig) {
  const res = await apiClient.put<ApiEnvelope<T>>(url, body, config);
  return res.data;
}
export async function apiDelete<T>(url: string, config?: AxiosRequestConfig) {
  const res = await apiClient.delete<ApiEnvelope<T>>(url, config);
  return res.data;
}
