// Feature flags and settings for the MongoDB user system.

// USER_SYSTEM_ENABLED=true switches login and token checks from the
// ALLOWED_USERS env map to the `users` collection, and enables /api/admin and
// the set-password links. Off (default) = exactly the pre-existing behaviour,
// which is also the rollback path. Read per call so tests can toggle it.
export function isUserSystemEnabled(): boolean {
  return process.env.USER_SYSTEM_ENABLED === "true";
}

// Frontend origin used to build invite / reset links. The token goes in the
// URL fragment (#), which browsers never send to any server or in a Referer.
const DEFAULT_APP_URL = "https://mortgage-advisor.yehuda-kahana.workers.dev";

export function getAppUrl(): string {
  return (process.env.APP_URL ?? DEFAULT_APP_URL).replace(/\/+$/, "");
}
