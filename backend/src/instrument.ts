import * as Sentry from "@sentry/node";

// Error monitoring. Must be imported before express/mongoose so the SDK can
// hook them. Disabled when SENTRY_DSN is unset (local dev, tests, CI).
//
// Privacy: this app handles financial documents, so events must never carry
// request bodies, headers, cookies, user identifiers or raw LLM output.
const REDACTED_MARKER = "raw LLM response";
const MAX_MESSAGE_LENGTH = 500;

function scrubText(text: string): string {
  if (text.includes(REDACTED_MARKER)) {
    return `${text.split(REDACTED_MARKER)[0]}${REDACTED_MARKER} [redacted]`;
  }
  return text.slice(0, MAX_MESSAGE_LENGTH);
}

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  environment: process.env.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV ?? "development",
  release: process.env.RAILWAY_GIT_COMMIT_SHA,
  sendDefaultPii: false,
  // Errors only by default. Set SENTRY_TRACES_SAMPLE_RATE (0..1) to also record
  // per-route request counts and latency.
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
  // Route handlers catch their own errors and log them with console.error, so
  // that is the signal to report. console.warn (e.g. Gemini retries that
  // self-heal) is deliberately not reported.
  integrations: [Sentry.captureConsoleIntegration({ levels: ["error"] })],
  beforeSend(event) {
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
      delete event.request.headers;
      delete event.request.query_string;
    }
    delete event.user;
    delete event.extra;
    if (event.message) event.message = scrubText(event.message);
    // Exception messages can quote client data (e.g. a Mongoose validation
    // error echoing a field value). Free text can't be reliably scrubbed of
    // names, so keep only the error type + stack and drop the message.
    if (event.exception?.values) {
      for (const ex of event.exception.values) {
        ex.value = ex.type ?? "Error";
      }
    }
    return event;
  },
  beforeBreadcrumb(breadcrumb) {
    // Drop console breadcrumbs entirely: authMiddleware logs the username on
    // every request, which would otherwise ride along on error events. Errors
    // themselves are still captured as events (see captureConsoleIntegration).
    if (breadcrumb.category === "console") return null;
    if (breadcrumb.message) breadcrumb.message = scrubText(breadcrumb.message);
    return breadcrumb;
  },
});
