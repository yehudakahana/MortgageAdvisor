import { BASE } from "./index";

// Public set-password endpoints behind invite / reset links. The token is sent
// only in the POST body - never in a URL.

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}/auth/password${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = "";
    try {
      const data = await res.json();
      if (typeof data?.error === "string") message = data.error;
    } catch {
      // non-JSON body - leave message empty
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const checkSetupLink = (token: string) =>
  post<{ type: "invite" | "reset"; username: string }>("/check", { token });

export const setPasswordFromLink = (token: string, password: string) =>
  post<{ ok: true; username: string }>("/set", { token, password });

export function verifyLoginCode(pendingToken: string, code: string) {
  return fetch(`${BASE}/login/2fa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pendingToken, code }),
  }).then(async (res) => {
    if (!res.ok) throw new Error("2FA failed");
    return res.json() as Promise<{ token: string; username: string; role?: string }>;
  });
}
