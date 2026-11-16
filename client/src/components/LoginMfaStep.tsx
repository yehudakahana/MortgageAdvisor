import { useState } from "react";
import { verifyLoginCode } from "../api/password";
import { useAuth } from "../auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LOGIN_MFA_TEXT } from "@/lib/strings";

interface LoginMfaStepProps {
  pendingToken: string;
  onBack: () => void;
}

// Second login step for a superadmin with 2FA: a 6-digit TOTP code or a
// one-time recovery code. The pending token expires after 5 minutes.
export default function LoginMfaStep({ pendingToken, onBack }: LoginMfaStepProps) {
  const { login } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setError("");
    setLoading(true);
    try {
      const data = await verifyLoginCode(pendingToken, code.trim());
      login(data.token, data.username, false, data.role);
    } catch {
      setError(LOGIN_MFA_TEXT.failed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="font-semibold">{LOGIN_MFA_TEXT.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{LOGIN_MFA_TEXT.hint}</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="mfa-code">{LOGIN_MFA_TEXT.codeLabel}</Label>
        <Input
          id="mfa-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="one-time-code"
          inputMode="text"
          dir="ltr"
          autoFocus
          aria-invalid={error ? true : undefined}
          className="max-md:h-11 max-md:text-base"
        />
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <Button type="submit" className="w-full max-md:h-11" disabled={loading}>
        {loading ? LOGIN_MFA_TEXT.submitting : LOGIN_MFA_TEXT.submit}
      </Button>
      <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
        {LOGIN_MFA_TEXT.back}
      </Button>
    </form>
  );
}
