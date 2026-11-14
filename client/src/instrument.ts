import * as Sentry from "@sentry/react";

// Error monitoring for the SPA. Disabled when VITE_SENTRY_DSN is unset (dev,
// tests). The DSN is public by design, like VITE_API_URL.
//
// Privacy: no session replay and no tracing — the screen shows client
// financial data, and neither is needed to see crashes.
const dsn = import.meta.env.VITE_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: import.meta.env.MODE,
  sendDefaultPii: false,
  beforeSend(event) {
    delete event.user;
    delete event.extra;
    return event;
  },
});
