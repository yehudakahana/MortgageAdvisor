---
name: deployed
description: This skill should be used when the user asks whether a change reached production — "is it deployed", "why didn't railway deploy", "still not deployed", "prod returns 404 but the code is on main", or reports that the client works but a backend endpoint 404s. Compares the deployed backend and client against local main and reports what is actually live.
version: 1.0.0
---

# Deploy Status Skill

The recurring failure: `main` is green locally and Cloudflare has the new client,
but Railway is still serving an older backend — so a new endpoint 404s while the
UI that calls it is already live. This skill answers "what is actually running in
prod?" without guessing.

## Production URLs

- **Backend (Railway):** `https://mortageadvisor-production.up.railway.app`
- **Client (Cloudflare Workers):** `https://mortgage-advisor.yehuda-kahana.workers.dev`

## Steps

### 1. Local reference

```
git fetch origin main --quiet
git rev-parse --short origin/main
git log origin/main -1 --format='%h %s (%cr)'
```

### 2. Backend — what is live

```
curl -s -m 20 https://mortageadvisor-production.up.railway.app/api/health
```

`/api/health` returns `{ status, commit, startedAt }`. Compare `commit` to
`origin/main`:

- **Equal** → backend is current. The bug is not a deploy lag; investigate the code.
- **Different** → Railway is behind. Report both SHAs and how many commits behind
  (`git log <live>..origin/main --oneline`).
- **`commit: "unknown"`** → the running build predates the commit-SHA health field,
  which by itself proves it is stale.
- **Request fails / times out** → the service is down or redeploying, not merely stale.

### 3. Client — what is live

```
curl -s -m 20 https://mortgage-advisor.yehuda-kahana.workers.dev/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js'
```

Compare that bundle hash to a local `npm --prefix client run build` output only if
the client is the suspect. Usually it is not — Cloudflare builds on push.

### 4. Probe the specific endpoint

If the user named a failing route (roles, settings, knowledge…), hit it directly
and report the status code, so the diagnosis is not inferred:

```
curl -s -o /dev/null -w "%{http_code}\n" -m 20 https://mortageadvisor-production.up.railway.app/api/<route>
```

A `401` means the route exists and is auth-gated — that is a **healthy** answer for
a protected route. Only `404` means "not deployed".

### 5. If Railway is behind

Check, in order, and report which one it is:

1. `railway status` and `railway logs --lines 50` (if the CLI is authenticated) —
   a failed build shows here.
2. Root-directory / watch-path config: Railway must build from `backend/`. A
   client-only commit legitimately produces no backend deploy.
3. Build failure from a `tsc` error that CI did not catch.

Then state the fix. **Do not trigger a redeploy without asking** — deploying is
the user's call.

## Output Format

```
### Deploy Status

| | live | expected | |
|---|---|---|---|
| backend | `<sha>` | `<origin/main sha>` | ✅ current / ⚠️ N commits behind / ❌ unreachable |
| client  | `<bundle>` | — | ✅ / ⚠️ |

**Endpoint probe:** `<route>` → `<code>` (<meaning>)

**Diagnosis:** <one or two sentences>

**Next step:** <the single action that fixes it>
```

Keep it to that table plus two lines. No speculation about causes not checked.
