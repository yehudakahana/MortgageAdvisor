// Browser-side guest data. The server purges a guest's records after 24h; this
// removes what the browser keeps for that guest so nothing lingers locally.
//
// The device id is kept on a manual sign-out (it is what resumes the same guest
// account and its quota, so dropping it would reset the caps), and removed once
// the account is known to be expired or purged (it can no longer be resumed).
const SCOPED_KEYS = ["guest_welcome_seen", "guest_remaining_messages"];
const DEVICE_KEY = "guest_device_id";

export function clearGuestBrowserData(opts: { includeDeviceId: boolean }): void {
  for (const key of SCOPED_KEYS) localStorage.removeItem(key);
  if (opts.includeDeviceId) localStorage.removeItem(DEVICE_KEY);
}

// True when a JWT's `exp` claim is in the past. Malformed tokens count as
// expired. Only used to decide whether to clear local state; the server stays
// the authority on access.
export function isTokenExpired(token: string, nowMs = Date.now()): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp !== "number" || payload.exp * 1000 <= nowMs;
  } catch {
    return true;
  }
}
