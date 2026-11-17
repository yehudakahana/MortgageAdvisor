import { useState } from "react";
import { loginAsGuest } from "../api";
import { useAuth } from "../auth/AuthContext";
import { Button } from "@/components/ui/button";
import { GUEST_TEXT } from "@/lib/strings";

interface GuestLoginButtonProps {
  disabled: boolean;
  onError: (message: string) => void;
  onBusyChange: (busy: boolean) => void;
}

// Guest mode: one click creates a 24h demo account; the token flows through
// the same login() path. Rate-limit errors from the server surface as-is.
export default function GuestLoginButton({ disabled, onError, onBusyChange }: GuestLoginButtonProps) {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    onError("");
    setLoading(true);
    onBusyChange(true);
    try {
      const data = await loginAsGuest();
      login(data.token, GUEST_TEXT.displayName, true);
    } catch (err) {
      // Server messages (rate limit) are Hebrew; English ones are internal fallbacks.
      const message = err instanceof Error && /[֐-׿]/.test(err.message) ? err.message : "";
      onError(message || GUEST_TEXT.loginFailed);
    } finally {
      setLoading(false);
      onBusyChange(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full mt-3 max-md:h-11 max-md:text-base"
      onClick={handleClick}
      disabled={loading || disabled}
    >
      {loading ? GUEST_TEXT.loggingIn : GUEST_TEXT.loginButton}
    </Button>
  );
}
