import { useState } from "react";
import { enableMfa, startMfaSetup } from "@/api/admin";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ADMIN_TEXT } from "@/lib/strings";

// One-time 2FA enrollment for the superadmin. The key is shown for manual
// entry in the authenticator app (no QR library on purpose - no new deps).
export default function TwoFactorSetup({ onEnabled }: { onEnabled: () => void }) {
  const { updateToken } = useAuth();
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setError("");
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError((err instanceof Error && err.message) || ADMIN_TEXT.actionFailed);
    } finally {
      setBusy(false);
    }
  }

  if (recoveryCodes) {
    return (
      <div className="space-y-3 p-5">
        <h3 className="font-semibold">{ADMIN_TEXT.mfaRecoveryTitle}</h3>
        <p className="text-sm text-muted-foreground">{ADMIN_TEXT.mfaRecoveryHint}</p>
        <ul dir="ltr" className="grid grid-cols-2 gap-1 rounded-md bg-muted p-3 font-mono text-sm">
          {recoveryCodes.map((c) => <li key={c}>{c}</li>)}
        </ul>
        <Button onClick={onEnabled}>{ADMIN_TEXT.mfaRecoveryDone}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-5">
      <h3 className="font-semibold">{ADMIN_TEXT.mfaTitle}</h3>
      <p className="text-sm text-muted-foreground">{ADMIN_TEXT.mfaIntro}</p>
      {!secret ? (
        <Button disabled={busy} onClick={() => run(async () => setSecret((await startMfaSetup()).secret))}>
          {ADMIN_TEXT.mfaStart}
        </Button>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const res = await enableMfa(code.trim());
              updateToken(res.token);
              setRecoveryCodes(res.recoveryCodes);
            });
          }}
        >
          <div className="space-y-1.5">
            <p className="text-sm font-medium">{ADMIN_TEXT.mfaKeyLabel}</p>
            <code dir="ltr" className="block select-all break-all rounded-md bg-muted p-2 text-sm">{secret}</code>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mfa-enable-code">{ADMIN_TEXT.mfaCodeLabel}</Label>
            <Input id="mfa-enable-code" dir="ltr" inputMode="numeric" autoComplete="one-time-code"
              value={code} onChange={(e) => setCode(e.target.value)} className="max-w-40" />
          </div>
          <Button type="submit" disabled={busy || code.trim().length !== 6}>{ADMIN_TEXT.mfaConfirm}</Button>
        </form>
      )}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
