# EGOS Agent Orchestration

> How the 12 roles connect, hand off work, enforce gates, and keep humans in the loop.

---

## Core Principle: Roles, Not Agents

Each of the 12 roles is a **posture**, not a separate process. The same underlying
model can shift from Prime (architect) to Forja (developer) by adopting a different
scope and set of constraints. What matters is that each role:

1. Knows its upstream (who sends work to it).
2. Knows its downstream (who it sends work to).
3. Enforces its own gates before acting.
4. Logs every step in an append-only audit trail.
5. Never claims "Done" without real evidence.

---

## The Main Pipeline

```
Sentinela ──► Prime ──► Forja ──► Crítico ──► Provador ──► Hermes-ops ──► Sentinela
                │                      │             │
                │                      └──► Prime    └──► Prime
                │
                ├──► Pixel ──► Crítico ──► Prime
                ├──► Voz ──────────────── Prime
                ├──► Investigador ──► Guardião ──► Prime
                ├──► Curador ──────────────────── Prime
                └──► Guardião ──────────────────── Prime

Guarani (continuous) ──────────────────────────── Prime
```

### Reading the diagram

- **Sentinela → Prime:** Sentinela flags state; Prime decides what to do.
- **Prime → Forja:** Prime dispatches a concrete task (ID + plan + files + criteria).
- **Forja → Crítico:** Forja delivers a diff; Crítico tries to break it.
- **Crítico → Provador:** approved diff moves to behavioral proof.
- **Provador → Hermes-ops:** proven code is cleared for deployment.
- **Hermes-ops → Sentinela:** after deploy, Sentinela picks up monitoring again.
- **Pixel / Voz / Curador** are dispatched by Prime and return to Prime.
- **Investigador → Guardião:** every sensitive-data task requires a security gate
  before proceeding; Guardião approves or blocks.
- **Guarani → Prime:** constitutional drift is flagged continuously; Prime acts.

---

## Legal Transitions

The registry defines an explicit list of **legal handoffs**. Transitions outside
this list are logged as warnings (soft validation today, hard block as the system
matures). This prevents implicit "shortcuts" that skip review stages.

Legal transitions:
```
sentinela     → prime
guarani       → prime
prime         → forja, pixel, voz, investigador, guardiao, curador, hermes-ops, provador
forja         → critico
pixel         → critico, prime
critico       → provador, prime
provador      → hermes-ops, prime
hermes-ops    → sentinela
voz           → prime
investigador  → guardiao
guardiao      → prime
curador       → prime
```

Any handoff not in this list (e.g., Forja directly to Hermes-ops, skipping review)
is flagged as pipeline-teatro — theatre that looks like governance but isn't.

---

## Gates: Fail-Closed Checkpoints

Gates are mandatory approval checkpoints. Every gate is **fail-closed**: if approval
is not explicitly granted, execution stops. There are no implicit passes.

### `ingest-real`
| Field | Value |
|-------|-------|
| Requester | Investigador |
| Approver | Guardião |
| Human-in-the-loop | Yes — escalated to human if Guardião blocks |
| Reason | Ingesting real, potentially sensitive data requires security validation |
| Mechanism | Pipeline gate request/check — exits with error code until approved |

Guardião runs PII scanning, validates data-protection boundaries, and writes an
approval or denial to an append-only audit ledger. Investigador cannot proceed until
`gate check` returns success.

### `public-copy`
| Field | Value |
|-------|-------|
| Requester | Voz, Pixel |
| Approver | Human (HITL) |
| Human-in-the-loop | Yes — always |
| Reason | Public content (articles, posts, designs) must never be published automatically |

Neither Voz nor Pixel can bypass this gate. Both deliver drafts; publication
requires an explicit human decision.

### `pii-code`
| Field | Value |
|-------|-------|
| Requester | Forja |
| Approver | Guardião |
| Human-in-the-loop | No (automated review) |
| Reason | Code that touches personal data must have Guardião validate the data-protection boundary before merge |

### `prod-deploy`
| Field | Value |
|-------|-------|
| Requester | Hermes-ops |
| Approver | Human (HITL) |
| Human-in-the-loop | Yes — always |
| Reason | Production deployments require explicit human sign-off |
| Checklist | Environment variables canonical, bundle validated, backup in place, smoke test passing, rollback plan ready |

### `frozen-zone`
| Field | Value |
|-------|-------|
| Requester | Any role |
| Approver | Human (HITL) |
| Human-in-the-loop | Yes — always |
| Reason | Core runtime files and governance constitution are frozen; changes require explicit override |
| Mechanism | Pre-commit hook blocks the change; requires an explicit override flag |

---

## Red Zone

**Red Zone** is a broader concept than gates: any situation involving ethics, public
copy, pricing, architecture, security, or restricted personal data. When a role
encounters a Red Zone situation:

1. It **stops immediately** — does not auto-resolve.
2. It **surfaces the issue** to Prime with a clear description.
3. Prime presents options and **waits for a human decision**.

Red Zone is never auto-resolved. It is a forcing function that keeps humans in the
loop for irreversible or high-stakes decisions.

Examples of Red Zone triggers:
- Code that exposes or logs secrets or personal identifiers
- Any public publication (article, post, outreach)
- Pricing or commercial decisions
- Changes to frozen governance files
- Ingesting real, restricted data (investigative or personal)

---

## Evidence-First Principle

Every role applies the same evidentiary standard:

- **Claims without proof are invalid.** A finding must cite `file:line` or a real
  command output. "Looks correct" or "I believe it works" are not evidence.
- **"Done" requires real proof**, not just a passing typecheck:
  - New API route → `curl` output showing HTTP status + response body
  - New database seed → `SELECT count(*)` confirming the expected row count
  - Deployed service → health endpoint returning 200
  - UI feature → screenshot with a clean browser console
- **Stubs in compliance paths are banned.** A function that silently returns an
  empty result instead of performing its stated check hides real failures. Use
  `throw new Error('NOT IMPLEMENTED')` so CI fails loudly.

---

## REAL / CONCEPT / PHANTOM Classification

When a role receives output from another agent (including an LLM), it classifies
each claim before acting on it:

| Label | Meaning |
|-------|---------|
| `REAL` | Verified — confirmed in the codebase with `file:line` anchor |
| `CONCEPT` | Exists in intent or documentation but not yet proven in a running system |
| `PHANTOM` | Named but not found — likely hallucinated or outdated |

High-density lists of capitalized "systems" or "capabilities" without file anchors
are a strong phantom signal. Prime re-verifies the top structural claims from any
sub-agent output before acting on them.

---

## Mutual Awareness

Every role knows the other 11 exist. The triggers registry is the single source of
truth for who is upstream, who is downstream, and which gates a role must enforce.
No role operates in isolation; every handoff is intentional and logged.

---

## Audit Trail

Every role logs its steps to an append-only structured log:

```json
{"ts": "<ISO-8601>", "step": 1, "action": "<description>", "result": "<summary>"}
```

The gate ledger (`agent-gates.jsonl`) captures every gate request, approval, and
denial with a timestamp. This makes the full decision chain reproducible and
auditable after the fact.

---

*For the full role roster and per-role scopes, see [index.md](index.md).*

*To build your own governed agent using this model, see [template.md](template.md).*
