// Central JWT secret handling. HS256 is only as strong as the secret: a short
// or guessable value (e.g. "changeme") can be brute-forced offline, and every
// token it signs grants full API access. We therefore require at least 32
// bytes and refuse to run (or to sign/verify) otherwise.

export const MIN_JWT_SECRET_BYTES = 32;

// Throws when JWT_SECRET is missing or too short. Call at startup to fail
// fast (see index.ts); request handlers catch it and answer 500 instead of
// crashing the process.
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("[CONFIG ERROR] JWT_SECRET is not set.");
  }
  if (Buffer.from(secret).length < MIN_JWT_SECRET_BYTES) {
    throw new Error(
      `[CONFIG ERROR] JWT_SECRET must be at least ${MIN_JWT_SECRET_BYTES} bytes ` +
        `(${Buffer.from(secret).length} given). Generate one with: openssl rand -hex 32`
    );
  }
  return secret;
}

// Token version for mass-revocation: bump JWT_VERSION (default "1") to
// invalidate every outstanding token at once, without rotating JWT_SECRET
// (which would also require re-issuing it everywhere). Signed into each token
// as the `v` claim and enforced by authMiddleware.
export function getJwtVersion(): string {
  return process.env.JWT_VERSION ?? "1";
}
