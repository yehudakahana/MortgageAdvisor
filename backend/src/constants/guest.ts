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
  chatPerWindow: 20,
  reExtractsPerWindow: 3, // re-extraction is an LLM call too, so it needs a cap
  // Rolling window shared by both quotas above. It matches `ttlMs`, so in
  // practice these are per-account lifetime caps: the window can only roll
  // over after the account itself has expired.
  quotaWindowMs: 24 * 60 * 60 * 1000,
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
// A sweep keeps draining batches up to this many times (so up to 200 guests per
// sweep); anything left waits for the next sweep.
export const GUEST_MAX_BATCHES_PER_SWEEP = 10;

// How often the background sweep looks for expired guests. Access is cut at
// exactly ttlMs after creation (fixed, never extended by activity); stored data
// is purged by the first sweep that reaches it. That is a target, not a
// guarantee: downtime, a backlog beyond one sweep, or a failing R2 delete delay it.
export const GUEST_SWEEP_INTERVAL_MS = 60 * 1000;
