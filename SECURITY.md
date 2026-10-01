# Security and data handling

## Controls

- **Auth:** bcrypt password verification, 12-hour JWTs, token-version revocation, check that the user still exists on every request, per-IP login rate limit. Server refuses to start with a JWT secret under 32 bytes.
- **Tenant isolation:** every client, chat-context, and document lookup is scoped to the authenticated user.
- **Files:** stored in a private R2 bucket; view URLs require an ownership check and expire after 15 minutes.
- **Uploads:** in-memory buffering with size caps (10 MiB regular, lower for guests) and file-signature checks on accepted types.
- **AI inputs/outputs:** document content is marked as untrusted in prompts, with instructions not to follow embedded commands; extracted JSON is shape- and size-validated before storage. Resistance is measured by the adversarial eval category.
- **HTTP:** CORS allowlist, Helmet on the API, CSP and security headers on the frontend.
- **Guests:** separate accounts with quotas and 24-hour expiry.
- **Secrets:** `npm run audit:secrets` scans the repo for leaked credentials.

## Data flow to AI providers

Uploaded files are sent to the extraction provider; client data and recent messages are sent to the chat provider. On fallback, that task's data goes to the other provider.

## Reporting

Found an issue? Please email yehuda.kahana5@gmail.com rather than opening a public issue.
