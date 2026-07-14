import { useState } from "react";
import { login as loginRequest } from "../api";
import { useAuth } from "../auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function LoginForm() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("יש להזין שם משתמש וסיסמה.");
      return;
    }
    setLoading(true);
    try {
      const data = await loginRequest(username.trim(), password);
      login(data.token, data.username);
    } catch {
      setError("שם משתמש או סיסמה שגויים.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-dvh bg-gradient-to-bl from-indigo-950 via-indigo-900 to-slate-900 p-4">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-900 text-white flex items-center justify-center shadow-inner">
            <span className="text-2xl font-bold">ש</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">שרה</h1>
            <p className="text-sm text-muted-foreground mt-1">עוזרת יועץ משכנתאות · התחברות</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">שם משתמש</Label>
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
              <Label htmlFor="password">סיסמה</Label>
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
              {loading ? "מתחבר..." : "התחברות"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
