"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

export type AuthUser = {
  email: string;
  role: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  /** True until storage rehydration + background server check complete. */
  isLoading: boolean;
  /**
   * Fix #4: replaces the old setAuth(token, rememberMe).
   * Accepts user metadata only — the actual JWT now lives in an httpOnly cookie
   * set by the server and is never accessible to JavaScript.
   */
  setUser: (user: AuthUser) => void;
  logout: () => void;
  /** @deprecated use setUser() — kept for transition compatibility */
  setAuth: (token: string, remember?: boolean) => void;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  setUser: () => {},
  logout: () => {},
  setAuth: () => {},
});

const USER_KEY = "ck_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading]  = useState(true);

  // ── Hydration ─────────────────────────────────────────────────────────────
  // Fix #4: We no longer store the JWT in localStorage.
  // We store only {email, role} — non-secret metadata — for instant UI hydration.
  // The real token lives in an httpOnly cookie the browser sends automatically.
  useEffect(() => {
    // 1. Instant hydration from cached metadata (no spinner on every page load)
    try {
      const stored = localStorage.getItem(USER_KEY);
      if (stored) {
        const parsed: AuthUser = JSON.parse(stored);
        if (parsed?.email && parsed?.role) setUserState(parsed);
      }
    } catch {}

    // 2. Background server validation — evicts stale localStorage if cookie expired
    const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
    fetch(`${BASE}/api/v1/users/me`, { credentials: "include" })
      .then(res => {
        if (res.ok) return res.json();
        if (res.status === 401) {
          localStorage.removeItem(USER_KEY);
          setUserState(null);
        }
        return null;
      })
      .then(data => {
        if (data?.email && data?.role) {
          const fresh: AuthUser = { email: data.email, role: data.role };
          localStorage.setItem(USER_KEY, JSON.stringify(fresh));
          setUserState(fresh);
        }
      })
      .catch(() => {}) // network offline — keep cached state
      .finally(() => setIsLoading(false));
  }, []);

  // ── setUser ───────────────────────────────────────────────────────────────
  const setUser = useCallback((newUser: AuthUser) => {
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    // Signal other components to show the role-based welcome overlay
    try { sessionStorage.setItem("ck_welcome_pending", "1"); } catch {}
    setUserState(newUser);
  }, []);

  // ── logout ────────────────────────────────────────────────────────────────
  // Fix #4: clears the httpOnly cookie server-side so the browser deletes it.
  // State is cleared immediately; the server call is fire-and-forget.
  const logout = useCallback(() => {
    localStorage.removeItem(USER_KEY);
    // Also clear any legacy token key from old sessions
    localStorage.removeItem("ck_token");
    sessionStorage.removeItem("ck_token");
    setUserState(null);

    const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
    fetch(`${BASE}/api/v1/auth/logout`, { method: "POST", credentials: "include" })
      .catch(() => {}); // silently ignore — cookie will expire naturally
  }, []);

  // ── setAuth (deprecated shim) ─────────────────────────────────────────────
  // Callers that haven't been updated yet pass the JWT here.
  // We extract email/role from it and call setUser() — the token itself is discarded.
  const setAuth = useCallback((token: string) => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload?.sub && payload?.role) {
        setUser({ email: payload.sub, role: payload.role });
      }
    } catch {}
  }, [setUser]);

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser, logout, setAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
