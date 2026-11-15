# Security and data handling

## Controls

- **Auth:** bcrypt password verification, 12-hour JWTs, token-version revocation, check that the user still exists on every request, per-IP login rate limit. Server refuses to start with a JWT secret under 32 bytes.
- **Tenant isolation:** every client, chat-context, and document lookup is scoped to the authenticated user.
- **Files:** stored in a private R2 bucket; view URLs require an ownership check and expire after 15 minutes.
- **Uploads:** in-memory buffering with size caps (10 MiB regular, lower for guests) and file-signature checks on accepted types.
- **AI inputs/outputs:** document content is marked as untrusted in prompts, with instructions not to follow embedded commands; extracted JSON is shape- and size-validated before storage. Resistance is measured by the adversarial eval category.
- **HTTP:** CORS allowlist, Helmet on the API, CSP and security headers on the frontend.
- **Guests:** separate accounts with quotas. Access ends 24h after creation (fixed, not sliding). Clients, uploaded R2 files, custom rules and usage-event rows are purged by a background sweep every minute while the server runs (up to 200 guests per sweep); a failed delete keeps the guest record so it is retried, and an orphan sweep catches rows written during a purge. Deletion timing is a target, not a guarantee. Not covered by code: host log retention, R2 bucket versioning/lifecycle, database backups, and error-monitoring retention.
- **Secrets:** `npm run audit:secrets` scans the repo for leaked credentials.

## Data flow to AI providers

Uploaded files are sent to the extraction provider; client data and recent messages are sent to the chat provider. On fallback, that task's data goes to the other provider.

## Reporting

Found an issue? Please email yehuda.kahana5@gmail.com rather than opening a public issue.
- **Guest concurrency:** held by the database, not by process memory. One live account per device and a maximum of 3 per IP are unique partial indexes on GuestUser (deviceId; ip + ipSlot), so simultaneous sign-ins cannot both insert. Chat/re-extract quotas are conditional atomic updates. Client and upload caps reserve a counter slot with one conditional update before the write and release it on failure or delete. Accounts created before this change have no counters, so their caps rely on the older count check for up to 24h. A crash between reserve and release leaves a guest stricter, never looser, until it expires.
