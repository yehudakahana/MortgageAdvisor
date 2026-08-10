// Guest-mode policy knobs, shared by middleware, routes, and the cleanup job.

export const GUEST_ID_PREFIX = "guest_";

// Owner of shared demo records (the template client). Never a real login.
export const SYSTEM_USER_ID = "system";

// R2 keys under this prefix are shared read-only demo files — they are cloned
// by reference into guest accounts and must never be deleted.
export const SAMPLE_KEY_PREFIX = "samples/";

export const GUEST_LIMITS = {
  ttlMs: 24 * 60 * 60 * 1000, // guest account + JWT lifetime
  extraClients: 2, // clients a guest may create beyond the sample clone
  uploads: 5, // total file uploads per guest
  fileSizeBytes: 5 * 1024 * 1024,
  chatPerHour: 10,
  reExtractsPerHour: 3, // re-extraction is an LLM call too, so it needs a cap
  quotaWindowMs: 60 * 60 * 1000, // rolling window for both hourly quotas
  promptChars: 250,
  maxTokens: 400, // forced LLM output cap for guest chats
  // Distinct guest accounts one IP may hold at once. Accounts live `ttlMs`, so
  // this is also the per-IP ceiling on fresh quotas per day.
  activeGuestsPerIp: 3,
  // Burst guard on the public endpoint itself: re-entering guest mode is cheap
  // (it resumes an account), but a script hammering the route is not.
  creationRequestsPerHour: 30,
};

// The cleanup sweep runs inside a public request, so it must never grow with
// the backlog — it deletes at most this many expired guests per call.
export const GUEST_CLEANUP_BATCH = 20;
