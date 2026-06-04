import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type AuthState = {
  username: string | null;
  login: (token: string, username: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(() => {
    const token = localStorage.getItem("user_token");
    return token ? localStorage.getItem("username") : null;
  });

  function login(token: string, name: string) {
    localStorage.setItem("user_token", token);
    localStorage.setItem("username", name);
    setUsername(name);
  }

  function logout() {
    localStorage.removeItem("user_token");
    localStorage.removeItem("username");
    setUsername(null);
  }

  // The fetch layer dispatches "auth:logout" on a 401/403 so an expired token
  // anywhere in the app resets the UI back to the login screen.
  useEffect(() => {
    window.addEventListener("auth:logout", logout);
    return () => window.removeEventListener("auth:logout", logout);
  }, []);

  return (
    <AuthContext.Provider value={{ username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
