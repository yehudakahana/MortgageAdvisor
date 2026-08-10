// Stable per-browser id, sent when entering guest mode so the backend resumes
// the same guest account instead of minting a new one on every sign-in. That is
// what makes the guest quotas actually stick: without it, clearing the session
// hands out a fresh allowance every time.
//
// Not an identity or a credential — a random opaque string, and the guest data
// it points at is deleted after 24h.
const DEVICE_KEY = "guest_device_id";

export function getDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;

  // randomUUID needs a secure context; fall back for plain-HTTP dev hosts.
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  localStorage.setItem(DEVICE_KEY, id);
  return id;
}
