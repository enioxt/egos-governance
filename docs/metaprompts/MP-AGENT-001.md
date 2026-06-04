# MP-AGENT-001 — Agent Dispatch Prompt

> **Version:** 1.0.0 · **Status:** CANONICAL · **Updated:** 2026-06-03

---

## Purpose

Canonical template for dispatching sub-agents. Prevents: open-ended scope, unauthorized
commits, skipped safety gates, and handoffs without a verifiable acceptance criterion.

## When to Use

Any time you route work to another agent (or role) — even within the same session.
Do **not** use for read-only exploration that produces no mutating output.

## Expected Input

```
DESTINATION_ROLE : <name — verify against your agent registry>
TASK_ID          : <canonical ID in your task tracker>
SCOPE            : <closed list of files that may be touched>
PLAN             : <numbered steps; concrete output per step>
ACCEPTANCE       : <boolean condition verifiable by a tool>
GATE             : <name of safety gate required | "none">
DEADLINE         : <iso-timestamp | "end_of_this_session">
```

### Gates (adapt to your project)

Common gate names:

| Gate | Trigger | Who approves |
|------|---------|--------------|
| `real-data-ingest` | Ingesting real PII or sensitive data | Human (HITL) |
| `public-copy` | Publishing copy or design | Human (HITL) |
| `pii-code` | Code that reads or writes PII | Automated or human |
| `prod-deploy` | Production deployment | Human (HITL) |
| `frozen-zone` | Files that must not change | Human (HITL) |

Define your own gates in your agent registry and reference them here.

## Expected Output

```
ROLE DELIVERS — task <ID>
=========================
FILES MODIFIED: <specific list>
TYPECHECK: [clean | errors — list]
TESTS: [N passing | X failing]
EVIDENCE: <literal output from the runner>
SMOKE: <curl / select count> (if applicable)
PENDING FOR ORCHESTRATOR: <decisions that arose; git add <file> suggested>
```

**No literal evidence = `[CONCEPT]`, not `[DONE]`.**

## Limits

1. Touch ONLY the files listed in `SCOPE`. Deviation = stop + report to orchestrator.
2. Do not commit. Never use `git add -A`. Always `git add <specific-file>`.
3. Respect your project's frozen zones — list them explicitly.
4. Gate check must return exit 0 before any write to production.
5. Only transitions declared as legal in your agent registry are allowed.

## Acceptance Criteria

- [ ] Destination role exists in your agent roster.
- [ ] Scope does not include frozen zones.
- [ ] Acceptance criterion is boolean and tool-verifiable.
- [ ] Required gate checked (exit 0) before any production write.
- [ ] Output includes literal evidence (typecheck + test or smoke).

## Red Zone

Stop + report to orchestrator if the dispatch would touch: real PII, public copy,
pricing, frozen zones, production migrations without an orchestrator gate.

## Example — Minimal

```
DESTINATION_ROLE : builder
TASK_ID          : W3-T7
SCOPE            : src/routes/health.ts
PLAN             : 1. Add uptime_seconds field to GET /health
                   2. Write unit test in health.test.ts
ACCEPTANCE       : typecheck clean + test passing + curl returns uptime_seconds
GATE             : none
DEADLINE         : end_of_this_session
```

## Example — With Gate

```
DESTINATION_ROLE : investigator
TASK_ID          : INV-007
SCOPE            : src/osint-resolver.ts
                   src/types/entity.ts
PLAN             : 1. Resolve entity by masked ID (never log the real value)
                   2. Return 1-hop graph via EntityGraph type
                   3. Golden case with synthetic ID (dynamic construction)
ACCEPTANCE       : typecheck clean + golden case passes +
                   grep -r "REAL_ID" ./agent-runs/ = empty
GATE             : pii-code
                   # run your gate check script; proceed ONLY if exit 0
DEADLINE         : 2026-06-10T23:59:00Z
```

---

> **Anti-copy-paste note:** adapt to your environment before using. Verify that your
> gate-check script, agent registry, and task tracker exist before referencing them.
> Do not copy secrets, tokens, or `.env` values. Task IDs in the examples are
> illustrative — use your project's real IDs.
