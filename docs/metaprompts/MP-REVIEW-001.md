# MP-REVIEW-001 — Architecture Decision Review Prompt

> **Version:** 1.0.0 · **Status:** CANONICAL · **Updated:** 2026-06-03

---

## Purpose

Guide a structured review of architectural decisions before they are locked.
Sequences Cognitive Band (adversarial multi-role critique), premortem, multi-LLM
quorum review, and ADR in a linear protocol with recordable evidence. Does not
replace any individual instrument — it sequences them.

## When to Use

- An **irreversible or high-reversal-cost** decision (changing DB, runtime,
  auth schema, entering a new product domain).
- An ADR about to be marked `locked` or `accepted`.
- Any decision that triggers mandatory quorum review per your governance rules.
- A premortem flagged a HIGH/CRITICAL risk without multi-model review.

**Do not use** for: normal commits, bug fixes, internal docs, deployments with
trivial rollback.

## Expected Input

```
DECISION     : <one clear sentence — what changes and why>
ADR_PATH     : <path to the draft ADR, e.g., docs/architecture/ADR-042.md>
ALTERNATIVES : <list of options considered and discarded>
CONSTRAINTS  : <deadline, dependencies, known technical constraints>
RED_ZONE     : <yes/no — involves pricing, public copy, security, or PII>
```

## Expected Output

1. **Band Synthesis** — verdict from the Maestro (4 roles: Critic, Supporter,
   Questioner, Maestro), 3-5 lines. Run your adversarial review script or ask
   a multi-role prompt.
2. **Failure map** — top-3 failure modes from the premortem, qualitative
   probability (HIGH/MEDIUM/LOW), and proposed mitigation.
3. **Quorum log** — responses from multiple models (the number required depends
   on your governance rules: e.g., architectural change = 3 LLMs + human;
   new product = 2 LLMs + human). The script automates parallel collection but
   does **not** replace the human gate — the human collects and validates.
4. **Final decision** — `APPROVED / NEEDS ADJUSTMENT / BLOCKED`, one line of
   justification, and the path of the updated ADR.
5. **Evidence** — commit hash or PR. No evidence = `[CONCEPT]`, not `[DONE]`.

## Limits

- **Does not execute** — reviews only. Execution belongs to the correct downstream agent.
- Red Zone (`RED_ZONE: yes`) → stop, escalate to the human before any commit.
- Quorum models must be **independent** of each other.
- Never record secrets, `.env` paths, or tokens in the ADR or this output.

## Acceptance Criteria

- [ ] Band Synthesis identifies all 4 roles.
- [ ] Minimum 3 failure modes with mitigations.
- [ ] Quorum: required number of models for this decision tier.
- [ ] ADR updated: date, quorum tier, verdict.
- [ ] Recordable evidence (hash/PR or `SMOKE-PENDING: <reason>`).

## Red Zone

Stop immediately if: pricing / public copy / payments; PII or sensitive personal
data; frozen files that must not change; CRITICAL quorum with fewer than 3 models.

Red Zone does not self-resolve → task in your tracker + human notification.

## Example — Minimal

```
DECISION     : Migrate sessions from Redis to Postgres JSONB
ADR_PATH     : docs/architecture/ADR-031-session-store.md
ALTERNATIVES : Redis (current), DynamoDB, Cloudflare KV
CONSTRAINTS  : no downtime; deadline 2026-07-01
RED_ZONE     : no
```

Flow: adversarial critique (Critic flags latency risk) → premortem (failure #1:
partial migration creates duplicate sessions) → 2 LLMs agree on feature-flag
approach → ADR-031 `accepted`, quorum 2 models → evidence: commit
`feat(session): migrate store Redis→Postgres (ADR-031)`.

## Example — Advanced with Red Zone

```
DECISION     : Replace third-party auth with custom JWT + LDAP integration
ADR_PATH     : docs/architecture/ADR-044-auth-ldap.md
ALTERNATIVES : Third-party auth (current), Keycloak, Auth0
CONSTRAINTS  : Sensitive user data; RLS on 14 tables; deadline Q3 2026
RED_ZONE     : yes — PII + sensitive user context
```

Flow: Red Zone confirmed → stop immediately, create `AUTH-RED-001` in task
tracker, escalate to human. After human approval: adversarial critique (Critic
raises data protection concerns; Maestro suggests isolated pilot) → premortem
(5 modes: token leak, LDAP outage, RLS bypass, clock skew, missing audit trail)
→ 3 LLMs → ADR-044 `accepted` → evidence: PR + `curl /health` HTTP 200 before
merge.

---

> **Anti-copy-paste note:** adapt to your environment before using. The scripts
> referenced for adversarial critique and quorum review (`banda.ts`, `council.ts`
> in the EGOS codebase) need equivalents in your project — or can be run manually.
> Never copy secrets, tokens, or private paths. Task IDs in the examples are
> illustrative.
