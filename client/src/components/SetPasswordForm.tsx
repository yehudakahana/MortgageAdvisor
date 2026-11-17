import { useEffect, useState } from "react";
import { checkSetupLink, setPasswordFromLink } from "../api/password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { APP_TEXT, SETUP_TEXT } from "@/lib/strings";

const MIN_LENGTH = 10; // mirrors PASSWORD_MIN_LENGTH on the backend

type Phase = "checking" | "invalid" | "form" | "done";

// Page behind an invite / reset link: the user chooses her own password.
// The token was already taken out of the URL (lib/setupLink.ts).
export default function SetPasswordForm({ token, onDone }: { token: string; onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [info, setInfo] = useState<{ type: "invite" | "reset"; username: string } | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Belt and braces: no Referer at all while this page is open.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "referrer";
    meta.content = "no-referrer";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    checkSetupLink(token)
      .then((data) => {
        setInfo(data);
        setPhase("form");
      })
      .catch(() => setPhase("invalid"));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < MIN_LENGTH) return setError(SETUP_TEXT.tooShort);
    if (password !== confirm) return setError(SETUP_TEXT.mismatch);
    setSaving(true);
    try {
      await setPasswordFromLink(token, password);
      setPhase("done");
    } catch (err) {
      setError((err instanceof Error && err.message) || SETUP_TEXT.failed);
    } finally {
      setSaving(false);
    }
  }

  const title = info?.type === "reset" ? SETUP_TEXT.resetTitle : SETUP_TEXT.inviteTitle;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-bl from-indigo-950 via-indigo-900 to-slate-900 p-4">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="text-center">
          <h1 className="text-xl font-bold">{APP_TEXT.title} · {title}</h1>
          {info && <p className="text-sm text-muted-foreground">{SETUP_TEXT.forUser(info.username)}</p>}
        </CardHeader>
        <CardContent className="space-y-4">
          {phase === "checking" && <p className="text-sm text-muted-foreground">{SETUP_TEXT.checking}</p>}
          {phase === "invalid" && <p className="text-sm text-destructive" role="alert">{SETUP_TEXT.invalidLink}</p>}
          {phase === "done" && <p className="text-sm" role="status">{SETUP_TEXT.done}</p>}
          {phase === "form" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" name="username" autoComplete="username" value={info?.username ?? ""} readOnly hidden />
              <div className="space-y-1.5">
                <Label htmlFor="new-password">{SETUP_TEXT.passwordLabel}</Label>
                <Input id="new-password" type="password" autoComplete="new-password" value={password}
                  onChange={(e) => setPassword(e.target.value)} aria-describedby="password-hint" autoFocus />
                <p id="password-hint" className="text-xs text-muted-foreground">{SETUP_TEXT.hint}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">{SETUP_TEXT.confirmLabel}</Label>
                <Input id="confirm-password" type="password" autoComplete="new-password" value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} />
              </div>
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? SETUP_TEXT.submitting : SETUP_TEXT.submit}
              </Button>
            </form>
          )}
          {(phase === "invalid" || phase === "done") && (
            <Button className="w-full" variant={phase === "done" ? "default" : "outline"} onClick={onDone}>
              {SETUP_TEXT.toLogin}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
