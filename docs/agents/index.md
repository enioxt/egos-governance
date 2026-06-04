# EGOS Agent Roster — 12 Roles

> **Version:** 1.0.0 | **Source:** `agents/registry/triggers.json` (SSOT)
>
> EGOS orchestrates work through 12 specialized roles. Each role has a clear scope,
> a model tier tuned to the task's cost/risk profile, and explicit awareness of the
> other 11 peers — so handoffs are intentional, not accidental.

---

## The Roster

| Role | Tier | Runtime | One-line function |
|------|------|---------|-------------------|
| **Prime** | Opus | Claude Code (on-demand) | Architect & orchestrator — triages findings, routes work, owns Red Zone decisions |
| **Sentinela** | Haiku | Scheduled cron | Always-on observer — reads system state, flags issues, never acts |
| **Forja** | Sonnet | Claude Code / isolated worktree | Developer — implements tasks, writes tests, never commits |
| **Crítico** | Sonnet / Codex | Claude Code / Codex CLI | Adversarial reviewer — actively tries to refute diffs and claims |
| **Provador** | Sonnet | eval-runner | Behavioral QA — golden cases, smoke tests, real evidence |
| **Pixel** | Sonnet | Claude Code | Designer — UI components, slides, visual proof (screenshot mandatory) |
| **Voz** | Sonnet | Claude Code | Marketing & copy — drafts public content, HITL always before publishing |
| **Hermes-ops** | Sonnet | Claude Code / server runner | DevOps — deploys, infrastructure operations, smoke checks |
| **Guardião** | Sonnet | Claude Code / pre-commit | Security & compliance — PII detection, data-protection gates, ethical validation |
| **Investigador** | Sonnet | Claude Code + OSINT MCPs | Digital forensics / OSINT — entity resolution, graph analysis, provenance chains |
| **Curador** | Sonnet | Claude Code / cron | Knowledge — KB ingestion, RAG, LLM routing, publishing pipeline |
| **Guarani** | Gemini | Separate runtime (cron 5 min) | Constitutional auditor — checks for drift from governance rules, proposes fixes |

---

## Role Detail

### Prime
The last line of resolution. If something stops at Prime's door, Prime resolves it —
it does not delegate back to the sender or blame a sub-agent (sub-agent errors are
orchestration failures). Receives flags from Sentinela and proposals from Guarani.
Dispatches all other roles. **Not dispatchable** — only runs on-demand or triggered
by Sentinela/Guarani flags.

### Sentinela
Runs on a regular schedule and reads state without touching it: task backlog, git
status, health endpoints, process logs. Produces a structured report and hands it
to Prime. **Cost tier: Haiku** (near-zero cost per cycle makes continuous monitoring
viable). Never modifies files, never commits, never restarts processes.

### Forja
Receives a concrete task from Prime (task ID + plan + target files + acceptance
criteria) and implements it in an isolated worktree. Runs typecheck and tests, then
stops. **Never commits** — Prime reviews and commits. Triggers `pii-code` gate
when the task touches personal data, handing off to Guardião before proceeding.

### Crítico
Receives a diff or architectural claim and systematically tries to break it.
Adversarial by design: finds `[CRITICAL]`, `[HIGH]`, `[MEDIUM]`, `[LOW]` findings
with `file:line` evidence, refutes unanchored claims, and returns a verdict
(`APPROVED / APPROVED WITH CAVEATS / REJECTED`). "LGTM without justification" is
explicitly banned. Read-only — never modifies files.

### Provador
Goes beyond typecheck: builds golden cases (minimum 3 per capability), runs the
eval-runner, executes real smoke tests against live endpoints, and verifies database
row counts. `TypeScript compiles clean ≠ feature works` is the guiding principle.
Stubs returning `[]` in compliance paths are forbidden — they must throw loudly.

### Pixel
Implements UI tasks and generates slides. **Screenshot is mandatory before declaring
any UI done** — HTTP 200 alone is not proof. Produces a visual proof artifact
(screenshot + clean console log) for Prime's approval. Never publishes designs
without human sign-off.

### Voz
Writes public copy, articles, and posts in the EGOS voice. Always delivers a draft
to a human for approval — never publishes directly. Absolute superlatives
("100% guaranteed", "unique in the world") are banned; honest, evidence-backed
language is the standard.

### Hermes-ops
Executes infrastructure operations (deploys, restarts, configuration changes) with
full observability: every step is logged, and a smoke test (`curl /health`) confirms
the post-operation state. No smoke = [CONCEPT]. Production deploys require
explicit human approval before execution.

### Guardião
The security gate of the ecosystem. Scans for personal-data identifiers, validates
data-protection boundaries before any ingestion, audits database access controls,
detects secret leaks in staged commits, and provides cryptographic audit trails.
**Fail-closed by design** — when in doubt, blocks and escalates. Approves or denies
the `ingest-real` gate requested by Investigador.

### Investigador
Operates graph-based OSINT, digital forensics (video/image analysis, OCR), entity
resolution (multi-tier deduplication, named-entity recognition), and link prediction.
Every finding carries a traceable source and a confidence score — never a binary
"identified" without qualification. **Cannot touch real, sensitive data without
Guardião's gate plus explicit human approval.** Uses synthetic/test data freely.

### Curador
Manages the knowledge layer: ingests content into the knowledge base, powers
semantic and full-text search (vector store), generates explanatory artifacts
(slides, audio summaries), and governs LLM routing (cost-based provider selection,
fallback chains). Also drafts timeline articles (tone review passes through Voz).
Publishing always requires human approval.

### Guarani
Runs as a separate always-on process (not on-demand), continuously comparing system
state against the governance constitution. Detects configuration drift, proposes
corrections, and hands them to Prime. **Proposes only — Prime decides and commits.**
Guarani and Prime are the two non-dispatchable roles (they are runtimes, not
sub-agents).

---

## Model-Tier Rationale

| Tier | Roles | Why |
|------|-------|-----|
| Haiku | Sentinela | Runs every 10-15 minutes — cost must be near-zero |
| Sonnet | Most roles | Default execution tier: capable + cost-effective |
| Opus | Prime | Irreversible architectural and Red Zone decisions demand the strongest model |
| Gemini (external) | Guarani | Constitutional auditing benefits from a different model's perspective |
| Codex (native review) | Crítico | Adversarial code review is Codex's strength |

---

*For how these roles interconnect — handoffs, gates, and Red Zone flow — see
[orchestration.md](orchestration.md).*

*To build your own governed agent using this model, see [template.md](template.md).*
