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
  /** True until localStorage rehydration is complete on first mount.
   *  Auth-guarded pages MUST render a spinner (not redirect) while isLoading is true,
   *  otherwise a hard refresh will flash-redirect even when the user is logged in.
   *
   *  Pattern for guarded pages:
   *    const { user, isLoading } = useAuth();
   *    if (isLoading) return <div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin" /></div>;
   *    if (!user) { router.push("/login"); return null; }
   */
  isLoading: boolean;
  setAuth: (token: string) => void;
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
  // isLoading starts true; flips to false after the first localStorage read on mount.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("ck_token");
    if (stored) {
      const parsed = parseJwt(stored);
      if (parsed) {
        setToken(stored);
        setUser(parsed);
      } else {
        localStorage.removeItem("ck_token");
      }
    }
    // Rehydration complete — guarded pages may now check user.
    setIsLoading(false);
  }, []);

  const setAuth = useCallback((newToken: string) => {
    localStorage.setItem("ck_token", newToken);
    setToken(newToken);
    setUser(parseJwt(newToken));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("ck_token");
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
