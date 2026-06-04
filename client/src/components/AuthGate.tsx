import { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import LoginForm from "./LoginForm";

// Blocks the app behind a login screen until a valid session exists.
export default function AuthGate({ children }: { children: ReactNode }) {
  const { username } = useAuth();
  if (!username) return <LoginForm />;
  return <>{children}</>;
}
