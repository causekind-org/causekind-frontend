"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

type AuthUser = {
  email: string;
  role: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  /** True until storage rehydration is complete on first mount. */
  isLoading: boolean;
  /** Pass remember=true to persist across browser sessions (localStorage),
   *  remember=false to clear on tab/browser close (sessionStorage). */
  setAuth: (token: string, remember?: boolean) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  setAuth: () => {},
  logout: () => {},
});

function parseJwt(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return { email: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check localStorage first (remember me), then sessionStorage (session only)
    const stored =
      localStorage.getItem("ck_token") ?? sessionStorage.getItem("ck_token");
    if (stored) {
      const parsed = parseJwt(stored);
      if (parsed) {
        setToken(stored);
        setUser(parsed);
      } else {
        localStorage.removeItem("ck_token");
        sessionStorage.removeItem("ck_token");
      }
    }
    setIsLoading(false);
  }, []);

  const setAuth = useCallback((newToken: string, remember = true) => {
    if (remember) {
      localStorage.setItem("ck_token", newToken);
      sessionStorage.removeItem("ck_token");
    } else {
      sessionStorage.setItem("ck_token", newToken);
      localStorage.removeItem("ck_token");
    }
    // Mark a fresh login so the landing page can show a one-time role-based welcome.
    try { sessionStorage.setItem("ck_welcome_pending", "1"); } catch {}
    setToken(newToken);
    setUser(parseJwt(newToken));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("ck_token");
    sessionStorage.removeItem("ck_token");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
