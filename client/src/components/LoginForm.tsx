import { useState } from "react";
import { login as loginRequest } from "../api";
import { useAuth } from "../auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { APP_TEXT, HELP_TEXT, LOGIN_TEXT } from "@/lib/strings";
import HelpDialog from "./help/HelpDialog";
import GuestLoginButton from "./GuestLoginButton";
import LoginMfaStep from "./LoginMfaStep";

export default function LoginForm() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  // Set when a superadmin with 2FA passed the password step.
  const [pendingToken, setPendingToken] = useState<string | null>(null);

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
      if (data.mfaRequired) setPendingToken(data.pendingToken);
      else login(data.token, data.username, false, data.role);
    } catch (err) {
      // 403 = disabled account: show the server's Hebrew message.
      const status = (err as { status?: number }).status;
      setError(status === 403 && err instanceof Error ? err.message : LOGIN_TEXT.badCredentials);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 min-h-dvh bg-gradient-to-bl from-indigo-950 via-indigo-900 to-slate-900 p-4">
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
          {pendingToken ? (
            <LoginMfaStep pendingToken={pendingToken} onBack={() => setPendingToken(null)} />
          ) : (
            <>
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
                <Button type="submit" className="w-full max-md:h-11 max-md:text-base" disabled={loading || guestLoading}>
                  {loading ? LOGIN_TEXT.submitting : LOGIN_TEXT.submit}
                </Button>
              </form>
              <GuestLoginButton disabled={loading} onError={setError} onBusyChange={setGuestLoading} />
            </>
          )}
        </CardContent>
      </Card>
      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        className="min-h-11 px-3 text-sm text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline"
      >
        {HELP_TEXT.loginHowItWorks} · {HELP_TEXT.loginContact}
      </button>
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
