import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AxiosRequestConfig } from "axios";
import { authApi, type LoginPayload, type RegisterPayload } from "@/lib/api/auth";
import { describeRequestError, isNetworkError, setSessionExpiredHandler } from "@/lib/api/client";
import type { UserDTO } from "@/lib/api/types";

// Hydration must survive a backend cold start: keep probing for a bounded
// window (covers Render's ~15s boots) and only give up after a definitive 401
// or when the window elapses. Never log a user out just because a request
// couldn't reach a sleeping server.
const HYDRATION_ATTEMPTS = 8;
const HYDRATION_MAX_WAIT_MS = 20000;
const HYDRATION_TIMEOUT_MS = 8000;
const HYDRATION_DELAY_MS = (attempt: number) => Math.min(800 * 1.6 ** attempt, 4000);

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function isNetworkFailure(err: unknown): boolean {
  return (
    err != null &&
    typeof err === "object" &&
    "isAxiosError" in (err as object) &&
    (err as { response?: unknown }).response == null
  );
}

interface AuthContextValue {
  user: UserDTO | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload, config?: AxiosRequestConfig) => Promise<UserDTO>;
  register: (payload: RegisterPayload, config?: AxiosRequestConfig) => Promise<UserDTO>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Set once a session is established by an explicit login/register. Guards the
  // mount-time hydration against clearing a user who just signed in while the
  // backend was still waking up (a stale 401 must never undo a fresh login).
  const manuallyAuthedRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const res = await authApi.me();
      setUser(res.data.user);
    } catch (err) {
      // Only a definitive failure (dead session) clears the user; a cold-start
      // network error must never log the user out.
      if (!isNetworkError(err)) setUser(null);
    }
  }, []);

  // True iff an authenticated call proves the httpOnly session cookies are
  // being accepted and sent back. Network errors (backend still waking) are
  // treated as "not provable yet" rather than a hard failure.
  const verifyCookieSession = useCallback(async (): Promise<boolean> => {
    try {
      const res = await authApi.me({ timeout: 6000 });
      setUser(res.data.user);
      return true;
    } catch (err) {
      if (isNetworkError(err)) return true; // transient — don't block a good login
      return false;
    }
  }, []);

  useEffect(() => {
    // Hydrate session on mount (client only).
    let cancelled = false;

    const off = setSessionExpiredHandler(() => {
      if (!cancelled) setUser(null);
    });

    (async () => {
      const startedAt = Date.now();
      for (let attempt = 0; attempt < HYDRATION_ATTEMPTS; attempt += 1) {
        if (cancelled) return;
        try {
          const res = await authApi.me({ timeout: HYDRATION_TIMEOUT_MS });
          if (!cancelled) {
            manuallyAuthedRef.current = true;
            setUser(res.data.user);
          }
          break;
        } catch (err) {
          if (cancelled) return;
          const network = isNetworkFailure(err);
          const elapsedOut = Date.now() - startedAt >= HYDRATION_MAX_WAIT_MS;
          const lastAttempt = attempt === HYDRATION_ATTEMPTS - 1;
          if (!network || lastAttempt || elapsedOut) {
            // Definitive 401 (session really dead) or retry budget exhausted.
            // A user who signed in mid-hydration must NOT be cleared by a stale
            // 401 from a request that was sent before their login succeeded.
            if (!cancelled && !manuallyAuthedRef.current) setUser(null);
            break;
          }
          await sleep(HYDRATION_DELAY_MS(attempt));
        }
      }
      if (!cancelled) setIsLoading(false);
    })();

    return () => {
      cancelled = true;
      off();
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload, config?: AxiosRequestConfig) => {
    const res = await authApi.login(payload, config);
    manuallyAuthedRef.current = true;
    setUser(res.data.user);
    // The login may have returned the user in its body even when the browser
    // rejected the session cookies (privacy extension / cross-site cookie
    // misconfiguration). Verify the cookie session actually persists; otherwise
    // the very next request would log the user out again — tell them why.
    const ok = await verifyCookieSession();
    if (!ok) {
      manuallyAuthedRef.current = false;
      setUser(null);
      throw new Error(
        "Signed in, but your session couldn't be saved — cookies for this site appear to be blocked. Enable cookies (including third-party cookies) and try again.",
      );
    }
    return res.data.user;
  }, [verifyCookieSession]);

  const register = useCallback(async (payload: RegisterPayload, config?: AxiosRequestConfig) => {
    const res = await authApi.register(payload, config);
    manuallyAuthedRef.current = true;
    setUser(res.data.user);
    const ok = await verifyCookieSession();
    if (!ok) {
      manuallyAuthedRef.current = false;
      setUser(null);
      throw new Error(
        "Account created, but your session couldn't be saved — cookies for this site appear to be blocked. Enable cookies (including third-party cookies) and try again.",
      );
    }
    return res.data.user;
  }, [verifyCookieSession]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // swallow - we'll clear locally anyway
      console.warn("logout failed:", describeRequestError(err));
    }
    manuallyAuthedRef.current = false;
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      logout,
      refresh,
    }),
    [user, isLoading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}
