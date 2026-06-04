# EGOS Event and Handoff Chain

> **Version:** 1.0.0
> **Audience:** Engineers building on or integrating with EGOS.
> **Purpose:** Describe how work, decisions, and knowledge flow through the EGOS framework — conceptually and in practice.

---

## The Core Idea

EGOS is event-driven at every level. An **event** is any state change that requires a governed response: a user message, a scheduled cron trigger, a git push, a failed check, a new capability discovery, or a human decision. Every event:

1. Is **received** by a runtime (Claude Code, Hermes, or Gemini — depending on temporal pattern)
2. Is **classified** against governance rules (is this a Red Zone? does it require HITL?)
3. **Produces work** (a task, a code change, a message, an anchor on the PROVA axis)
4. **Hands off** to the next layer or produces a terminal artifact

Nothing in EGOS is fire-and-forget. Every consequential event leaves a trace.

---

## The Three Runtime Channels

Events enter EGOS through one of three runtimes, chosen by temporal pattern:

```
External World
      │
      ├── On-demand request ────────→ Claude Code (EGOS Prime)
      │                               Interactive, deep reasoning, code changes
      │
      ├── Scheduled / recurring ────→ Hermes (always-on, VPS)
      │                               Cron jobs, watchdog, HITL delivery
      │
      └── Drift / coherence check ──→ Gemini (cron, periodic)
                                      Cross-session consistency, drift detection

              GitHub (SSOT) synchronizes all three
```

**Key invariant:** GitHub is the single source of truth. All three runtimes read from it; all writes eventually reach it. No runtime holds authoritative state locally.

---

## The Standard Event Lifecycle

```
1. EVENT ARRIVES
   └─ Source: user message / cron trigger / git push / external API / agent finding

2. CLASSIFICATION GATE
   ├─ Red Zone? → STOP + escalate to human (never auto-resolve)
   ├─ Requires HITL? → queue for human approval before acting
   └─ Standard? → proceed

3. RULE CHECK (fail-closed)
   ├─ Load governance state (AGENTS.md + .guarani/RULES_INDEX.md)
   ├─ Verify all `depends_on` are satisfied
   └─ If dependency missing → halt with explanation (never silent skip)

4. EXECUTION
   ├─ Agent acts within its declared scope
   ├─ Produces artifacts: code, documents, messages, migrations, anchors
   └─ Side effects are logged (never silent)

5. VERIFICATION GATE
   ├─ Claim made? → attach evidence (file:line, HTTP response, count assertion)
   ├─ Code changed? → typecheck + smoke test before declaring done
   └─ Deploy? → health check via curl/SSH, not by inferring from code

6. HANDOFF / CLOSURE
   ├─ Task closed? → explicit trailer in commit body (Closes / Fixes / Resolves)
   ├─ Knowledge gained? → record in HARVEST.md
   ├─ Cross-session work? → write handoff document
   └─ Consequential decision? → consider anchoring on PROVA axis
```

---

## Agent Handoff Protocol

When work crosses agent boundaries (between runtimes, between sessions, or between parallel agents), EGOS uses a structured handoff:

```
OUTGOING AGENT writes:
  ├─ Handoff document (docs/_current_handoffs/handoff_YYYY-MM-DD.md)
  │   ├─ What was done (with commit SHAs)
  │   ├─ What is pending (with task IDs)
  │   ├─ What the next agent must NOT do (footguns)
  │   └─ Open questions requiring human decision
  └─ TASKS.md updated (committed immediately — parallel agents lose uncommitted state)

INCOMING AGENT reads:
  ├─ TASKS.md (current state of all work)
  ├─ Handoff document (context from previous session)
  ├─ AGENTS.md + .guarani/RULES_INDEX.md (governance constitution)
  └─ Relevant SSOT files (only what is needed — pull-based, not push-based)
```

**Anti-pattern:** An incoming agent that skips the handoff and re-derives context from scratch. This produces drift — the agent acts on stale assumptions while the actual state is in the handoff.

---

## The Proof Chain (PROVA Axis Events)

For consequential decisions — governance changes, agent capability additions, irreversible architectural choices — EGOS can anchor the decision to the PROVA axis:

```
Decision made under Governance vN
         │
         ├─ Sigstore sign → Rekor transparency log
         │   (proves artifact integrity; no blockchain required)
         │
         ├─ OpenTimestamps → Bitcoin
         │   (proves "this rule existed at time T"; immutable timestamp)
         │
         └─ EAS attestation → Base L2
             (proves "this decision was made under governance vN";
              chain-of-custody for AI decisions)
```

The goal is not to use blockchain for its own sake — it is to make governance claims **independently verifiable** by anyone, without trusting the EGOS operator.

Current state: Sigstore is the primary tool (cheapest, no blockchain). OpenTimestamps and EAS are experimental and dormant. The pattern is proven; the infrastructure is ready to activate.

---

## Knowledge Capture Events

Every session that produces a non-obvious insight generates a knowledge event:

```
Insight discovered
      │
      ├─ HARVEST.md entry (docs/knowledge/HARVEST.md) — permanent learning log
      ├─ CAPABILITY_REGISTRY.md entry (if a new capability was proven)
      └─ Memory pointer (if context needed across sessions)

Criteria for HARVEST entry:
  - Would the next agent need this to avoid repeating the work?
  - Is it a non-obvious fact about the system's actual state?
  - Does it change how a rule or pattern should be applied?
```

---

## Task Lifecycle

Tasks are the unit of tracked work. Their lifecycle follows strict rules to prevent ghost tasks and drift:

```
Task created → entry in TASKS.md (committed immediately)
      │
      ├─ In progress → status update in TASKS.md
      │
      └─ Completed → explicit closure trailer in commit body:
                     "Closes TASK-ID" / "Fixes TASK-ID" / "Resolves TASK-ID"
                     (in the body, not the subject line)
```

**Closure trailers are case-sensitive and must appear in the commit body.** Subject-line references are treated as mentions, not closures. Ghost closures (marking done without evidence) violate the evidence-first principle and are caught by governance checks.

Completed tasks are archived to `TASKS_ARCHIVE.md` — never deleted. The archive is the historical record.

---

## Multi-Agent Coordination Events

When multiple agents work in parallel, EGOS enforces coordination rules:

```
Parallel agents:
  ├─ Read-parallel: multiple agents may read the same files simultaneously ✓
  ├─ Write-sequential: never two write agents on the same repo simultaneously ✗
  ├─ git add: always specific files (never `git add -A` or `git add .`) ✓
  └─ TASKS.md: committed before spawning agents (shared state must be durable)

After 10+ turns or after autocompact:
  └─ Re-read TASKS.md (local memory is not authoritative after context reset)
```

**Resolver principle:** If work from another agent arrives stalled, the receiving agent absorbs and resolves it — does not re-delegate or return it to the originating agent. Errors in a subagent's output are treated as orchestration failures, not the subagent's problem.

---

## Event Boundaries (What EGOS Will Not Auto-Resolve)

The following event types always halt and escalate to a human:

| Event type | Reason |
|-----------|--------|
| Public content (articles, posts, marketing copy) | Reputational risk; human must approve voice and claims |
| Deployments to production | Irreversible; gates required (env vars, bundle validation, smoke test, rollback plan) |
| Database writes to production | Schema-first required; smoke assertion required post-write |
| Ethics, privacy, PII, law-enforcement data | Legal and ethical exposure |
| Architectural decisions (irreversible) | Requires Banda Cognitiva (multi-role review) or Council (multi-LLM review) |
| Security changes (frozen zones) | `.guarani/`, `.husky/pre-commit`, agent runner — never auto-modified |
| Pricing, contracts, financial commitments | Business exposure |

These are not soft guidelines — they are enforced by the governance constitution. An agent that auto-resolves any of these is non-compliant.

---

*For the ecosystem components involved in this chain, see [`ecosystem.md`](./ecosystem.md).*
*For the conceptual axis model, see [`overview.md`](./overview.md).*
