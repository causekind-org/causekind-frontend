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
  setAuth: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  setAuth: () => {},
  logout: () => {},
});

function parseJwt(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return { email: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("ck_token");
    if (stored) {
      setToken(stored);
      setUser(parseJwt(stored));
    }
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
    <AuthContext.Provider value={{ user, token, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
