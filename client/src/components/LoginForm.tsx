import { useState } from "react";
import { login as loginRequest, loginAsGuest } from "../api";
import { useAuth } from "../auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { APP_TEXT, GUEST_TEXT, LOGIN_TEXT } from "@/lib/strings";

export default function LoginForm() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError(LOGIN_TEXT.missingFields);
      return;
    }
    setLoading(true);
    try {
      const data = await loginRequest(username.trim(), password);
      login(data.token, data.username);
    } catch {
      setError(LOGIN_TEXT.badCredentials);
    } finally {
      setLoading(false);
    }
  }

  // Guest mode: one click creates a 24h demo account; the token flows through
  // the same login() path. Rate-limit errors from the server surface as-is.
  async function handleGuestLogin() {
    setError("");
    setGuestLoading(true);
    try {
      const data = await loginAsGuest();
      login(data.token, GUEST_TEXT.displayName, true);
    } catch (err) {
      // Server messages (rate limit) are Hebrew; English ones are internal fallbacks.
      const message = err instanceof Error && /[֐-׿]/.test(err.message) ? err.message : "";
      setError(message || GUEST_TEXT.loginFailed);
    } finally {
      setGuestLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-dvh bg-gradient-to-bl from-indigo-950 via-indigo-900 to-slate-900 p-4">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-900 text-white flex items-center justify-center shadow-inner">
            <span className="text-2xl font-bold">{APP_TEXT.initial}</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{APP_TEXT.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{LOGIN_TEXT.tagline}</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">{LOGIN_TEXT.usernameLabel}</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError("");
                }}
                autoComplete="username"
                autoFocus
                aria-invalid={error ? true : undefined}
                className={cn("max-md:h-11 max-md:text-base", error && "border-destructive")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{LOGIN_TEXT.passwordLabel}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                autoComplete="current-password"
                aria-invalid={error ? true : undefined}
                className={cn("max-md:h-11 max-md:text-base", error && "border-destructive")}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full max-md:h-11 max-md:text-base" disabled={loading}>
              {loading ? LOGIN_TEXT.submitting : LOGIN_TEXT.submit}
            </Button>
          </form>
          <Button
            type="button"
            variant="outline"
            className="w-full mt-3 max-md:h-11 max-md:text-base"
            onClick={handleGuestLogin}
            disabled={guestLoading || loading}
          >
            {guestLoading ? GUEST_TEXT.loggingIn : GUEST_TEXT.loginButton}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
