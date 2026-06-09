/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Backend origin for API calls. Empty in dev (Vite proxy handles /api);
  // set to the Railway backend URL in production (Cloudflare Pages).
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
