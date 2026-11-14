/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Backend origin for API calls. Empty in dev (Vite proxy handles /api);
  // set to the Railway backend URL in production (Cloudflare Pages).
  readonly VITE_API_URL?: string;
  // Sentry DSN for client error monitoring. Unset = monitoring disabled.
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
