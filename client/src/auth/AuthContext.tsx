import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type AuthState = {
  username: string | null;
  isGuest: boolean;
  login: (token: string, username: string, isGuest?: boolean) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(() => {
    const token = localStorage.getItem("user_token");
    return token ? localStorage.getItem("username") : null;
  });
  const [isGuest, setIsGuest] = useState(
    () => localStorage.getItem("is_guest") === "1" && !!localStorage.getItem("user_token")
  );

  function login(token: string, name: string, guest = false) {
    localStorage.setItem("user_token", token);
    localStorage.setItem("username", name);
    if (guest) localStorage.setItem("is_guest", "1");
    else localStorage.removeItem("is_guest");
    setUsername(name);
    setIsGuest(guest);
  }

  function logout() {
    localStorage.removeItem("user_token");
    localStorage.removeItem("username");
    localStorage.removeItem("is_guest");
    setUsername(null);
    setIsGuest(false);
  }

  // The fetch layer dispatches "auth:logout" on a 401 so an expired token
  // anywhere in the app resets the UI back to the login screen.
  useEffect(() => {
    window.addEventListener("auth:logout", logout);
    return () => window.removeEventListener("auth:logout", logout);
  }, []);

  return (
    <AuthContext.Provider value={{ username, isGuest, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
