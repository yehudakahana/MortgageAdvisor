import { ReactNode, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { clearSetupToken, getSetupToken } from "@/lib/setupLink";
import LoginForm from "./LoginForm";
import SetPasswordForm from "./SetPasswordForm";

// Blocks the app behind a login screen until a valid session exists. An
// invite / reset link (#setup=<token>) shows the set-password page first.
export default function AuthGate({ children }: { children: ReactNode }) {
  const { username } = useAuth();
  const [setupToken, setSetupToken] = useState(getSetupToken);

  if (setupToken) {
    return (
      <SetPasswordForm
        token={setupToken}
        onDone={() => {
          clearSetupToken();
          setSetupToken(null);
        }}
      />
    );
  }
  if (!username) return <LoginForm />;
  return <>{children}</>;
}
