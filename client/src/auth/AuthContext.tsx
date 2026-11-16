import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { clearGuestBrowserData, isTokenExpired } from "../lib/guestBrowserData";

// A guest token past its exp belongs to an account the server has purged (or is
// about to): drop it and the guest leftovers before the first render.
function dropExpiredGuestSession(): void {
  const token = localStorage.getItem("user_token");
  if (token && localStorage.getItem("is_guest") === "1" && isTokenExpired(token)) {
    localStorage.removeItem("user_token");
    localStorage.removeItem("username");
    localStorage.removeItem("is_guest");
    clearGuestBrowserData({ includeDeviceId: true });
  }
}
dropExpiredGuestSession();

type AuthState = {
  username: string | null;
  isGuest: boolean;
  // Display hint only ("superadmin" shows the admin button); the server
  // re-checks the role from the DB on every admin request.
  role: string | null;
  login: (token: string, username: string, isGuest?: boolean, role?: string) => void;
  // Swaps the session token in place (e.g. after enabling 2FA).
  updateToken: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(() => {
    const token = localStorage.getItem("user_token");
    return token ? localStorage.getItem("username") : null;
  });
  const [role, setRole] = useState<string | null>(() =>
    localStorage.getItem("user_token") ? localStorage.getItem("role") : null
  );
  const [isGuest, setIsGuest] = useState(
    () => localStorage.getItem("is_guest") === "1" && !!localStorage.getItem("user_token")
  );

  function login(token: string, name: string, guest = false, userRole?: string) {
    localStorage.setItem("user_token", token);
    localStorage.setItem("username", name);
    if (userRole) localStorage.setItem("role", userRole);
    else localStorage.removeItem("role");
    setRole(userRole ?? null);
    if (guest) localStorage.setItem("is_guest", "1");
    else localStorage.removeItem("is_guest");
    setUsername(name);
    setIsGuest(guest);
  }

  function updateToken(token: string) {
    localStorage.setItem("user_token", token);
  }

  function logout() {
    if (localStorage.getItem("is_guest") === "1") clearGuestBrowserData({ includeDeviceId: false });
    localStorage.removeItem("user_token");
    localStorage.removeItem("username");
    localStorage.removeItem("is_guest");
    localStorage.removeItem("role");
    setUsername(null);
    setIsGuest(false);
    setRole(null);
  }

  // The fetch layer dispatches "auth:logout" on a 401 so an expired token
  // anywhere in the app resets the UI back to the login screen.
  useEffect(() => {
    window.addEventListener("auth:logout", logout);
    return () => window.removeEventListener("auth:logout", logout);
  }, []);

  return (
    <AuthContext.Provider value={{ username, isGuest, role, login, updateToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
