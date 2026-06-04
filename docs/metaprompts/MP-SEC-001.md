# MP-SEC-001 — Security Review Prompt

> **Version:** 1.0.0 · **Status:** CANONICAL · **Updated:** 2026-06-03

---

## Purpose

Review API routes, database migrations, and server configurations through a structured
security lens. Produces findings classified as CRITICAL / HIGH / MODERATE / LOW with
file and line evidence — no absolutes ("100%", "guaranteed" are forbidden).

## When to Use

- Before merging any change that touches authentication, authorization, CORS, rate
  limiting, secrets handling, or RLS (row-level security) policies.
- PRs that add new endpoints, database tables with access control, or modify auth policies.
- Mandatory pre-deployment gate for production changes.

## Expected Input

```
TARGET  : <file:line or migration — e.g., src/server.ts:46-92>
CONTEXT : <what the change does>
STACK   : <your tech stack — e.g., Node 20 + Fastify + PostgreSQL>
BASE_RULES: <your security ruleset reference>
```

Include: diff or relevant excerpt, new tables, whether the route is public or protected.

## Expected Output

```
[SEVERITY] ID — Short title
  File: <path>:<line>
  Observation: <evidence-based finding — not inference>
  Recommendation: <specific, verifiable action>
  Rule: <your security rule reference>

SUMMARY: N findings (C critical / H high / M moderate / L low)
GATE: [PASS with caveats | BLOCK — fix before merge]
```

## Limits

- Does not replace a professional penetration test or security audit.
- Does not evaluate third-party dependencies (run `npm audit` / `bun audit` separately).
- Does not have access to production logs — findings are static (code, not traffic).
- MODERATE / LOW findings do not block merge automatically — decision belongs to the
  orchestrator.

## Acceptance Criteria

1. Every finding has a verifiable `File:<path>:<line>` — no claims without proof.
2. CRITICAL or HIGH findings with BLOCK gate prevent merge until resolved.
3. No secret or env var value is logged in the output.
4. Database tables with access control policies verified: every new table used by a
   client-facing surface must have an explicit access policy in the same migration file.
5. CORS audited: wildcard origin (`*`) combined with an `Authorization` header on a
   mutating route is HIGH.
6. Rate limiting present on write routes and LLM-calling routes.
7. Test fixtures use dynamic string construction — never literal credential patterns
   like `sk_live_*`, `ghp_*`, `AKIA*`.

## Red Zone

Stop and report to orchestrator without self-resolving if:

- A secret or API key is hardcoded in the code (outside of env var loading).
- Access control is disabled on a table with user data / PII.
- An admin route is exposed publicly without authentication.
- Wildcard CORS + Authorization header on a mutating endpoint (CSRF via credential).
- New table migration missing an explicit access policy for client-facing roles
  (causes silent empty-result bugs with no error in logs — a classic hidden failure).

## Example — Minimal

**Input:** `TARGET: src/server.ts:46-52 | CONTEXT: new POST /v1/orders endpoint`

**Output:**
```
[HIGH] SEC-CRS-001 — CORS wildcard on authenticated route
  File: src/server.ts:49
  Observation: 'Allow-Origin: *' + Authorization exposes endpoint to cross-origin
    requests from any origin.
  Recommendation: restrict origin to 'https://yourdomain.com' or validate
    Origin per request in POST handlers.
  Rule: OWASP A05:2021 — Security Misconfiguration

SUMMARY: 1 finding (0 critical / 1 high / 0 moderate / 0 low)
GATE: BLOCK — fix CORS before merging to production
```

## Example — Database Migration

**Input:** `TARGET: db/migrations/20260603_add_orders.sql`
`CONTEXT: new orders table; client app uses low-privilege API key`

**Output:**
```
[CRITICAL] SEC-RLS-001 — Orders table missing client-facing access policy
  File: 20260603_add_orders.sql
  Observation: Row-level security enabled but no policy for the anon/client role.
    Client with low-privilege key receives [] silently (RLS default-deny with no error).
  Recommendation: add in the same migration file:
    CREATE POLICY orders_client_read ON public.orders
      FOR SELECT TO anon, authenticated USING (active = true);
  Rule: your DB security ruleset §RLS

[LOW] SEC-RL-001 — New handler missing rate limiting
  File: src/server.ts (integration pending)
  Recommendation: wrap with rate-limit middleware — see existing pattern in your codebase.

SUMMARY: 2 findings (1 critical / 0 high / 0 moderate / 1 low)
GATE: BLOCK — fix SEC-RLS-001 before applying migration
```

---

> **Anti-copy-paste note:** adapt to your stack before using. File paths, table names,
> policy syntax, and rule references in the examples are illustrative. Verify every
> path exists in your repo. Do not copy secrets, schema names, or env var values.
