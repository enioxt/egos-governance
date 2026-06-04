# EGOS Framework — Architecture Overview

> **Version:** 1.0.0
> **Audience:** Engineers, integrators, and contributors exploring the EGOS ecosystem.
> **Purpose:** Explain what EGOS is, how it is organized conceptually, and how to navigate its components.

---

## What is EGOS?

EGOS (Ego Governing Operating System) is an **AI-first orchestration framework** for building governed, auditable multi-agent systems. It is not a single application — it is a kernel that coordinates agents, rules, proofs of correctness, and external integrations across a wide ecosystem.

The central premise is: **AI agents must be responsible, not just capable.** Every capability in the EGOS ecosystem is tied to a rule, every rule is versioned, and every consequential decision can be traced back to the state of governance at the time it was made.

---

## The Axis Model — EGOS at the Center

EGOS is organized around **one center and three orthogonal axes**, not a linear layer stack. The axes represent distinct concerns that operate in parallel; they do not form a hierarchy.

```
                    PROVA
                (immutable proof)
                      │
                      │
   OPERAÇÃO ──────── EGOS ─────── INTEGRAÇÃO
   (where EGOS acts)  │         (external world)
                      │
                (EGOS center:
               cognition + governance)
```

### COMO LER (How to Read This Model)

1. **Start at the center (L0 = EGOS).** The kernel governs all axes. It can change its mind, and it is accountable.
2. **Navigate by axis, not by number.** A component's axis describes its *responsibility*, not its importance or execution order.
3. **Axes are orthogonal on purpose.** Proof (PROVA) does not depend on Operation (OPERAÇÃO) — it anchors facts independently. Integration (INTEGRAÇÃO) does not depend on Proof — it connects to the external world independently.
4. **Dependencies flow inward.** Components on each axis declare what they depend on (`depends_on`). Follow those declarations before activating a capability.
5. **Each component points to its own SSOT.** This map is an index, not a duplicate. For authoritative details, follow the pointer.

---

## The Four Concerns

### L0 — EGOS (Cognition + Governance)

The center of the model. EGOS is the entity that:
- Holds the constitution of rules (agents, governance policies, frozen zones)
- Orchestrates capabilities across all axes
- Can change its mind (and tracks that it did, and why)
- Is accountable — every decision traces back to the version of governance in effect at the time

Key principle: **EGOS operates across the entire workspace.** It is not confined to a single repo or runtime. The kernel runs wherever its constitution is loaded.

---

### OPERAÇÃO — Where EGOS Acts

The operational axis covers everything with a physical or temporal footprint:
- **Runtimes** — the processes that execute agents (on-demand, scheduled, always-on)
- **Repos and packages** — the code that implements capabilities
- **Data stores** — persistent state (databases, graph engines)
- **Deployed surfaces** — APIs, bots, dashboards, storefronts

A component on this axis *does* something. It consumes resources, produces side effects, and can fail.

---

### PROVA — Immutable Proof (Trust via Math)

The proof axis anchors claims about the system using cryptographic primitives — not trust in a person or a process, but trust in mathematics:

- **Sigstore / Rekor** — supply-chain signing (cheapest layer; no blockchain needed for most cases)
- **OpenTimestamps → Bitcoin** — anchors the existence of the governance constitution at a point in time (Bitcoin as an immutable timestamp substrate)
- **EAS → Base** — Ethereum Attestation Service on Base L2; attests that a specific AI decision was made under a specific version of governance rules (chain-of-custody for AI)

The key insight: these tools prove **that a rule existed at time T** and **that a decision was made under that rule** — without requiring anyone to trust the operator.

> **Note on $ETHIK:** a governance token exists on Base as part of the PROVA axis experiments. It is currently dormant and outside the scope of active public work. It is mentioned here only for completeness; no details about its mechanics are provided.

---

### INTEGRAÇÃO — The External World

The integration axis connects EGOS to external environments:
- **MCPs (Model Context Protocol servers)** — expose EGOS capabilities to AI assistants (Claude, ChatGPT, Gemini)
- **LLM routing** — multi-provider request routing (cost control, capability matching)
- **Messaging channels** — WhatsApp, Telegram, and web chat
- **Public data sources** — feeds that enrich EGOS capabilities with open data

Components on this axis are interfaces, not implementations. They mediate between EGOS and the outside world.

---

## Governance Anti-Degradation

The axis model is only useful if it stays accurate. EGOS enforces this via:

1. **Doc-Drift Shield** — a pre-commit hook that validates claims declared in `.egos-manifest.yaml`. Stale or false claims block the commit.
2. **`/start` re-check** — every session re-reads the operating surface and reconciles it against known state.
3. **`depends_on` declarations** — components declare their dependencies explicitly; activating a capability without satisfying its dependencies fails closed (not silently).

The model does not rely on human discipline to stay accurate — it relies on automated enforcement.

---

## Key Design Principles

| Principle | Expression in EGOS |
|-----------|-------------------|
| Evidence-first | Claims without proof are invalid. Every capability points to a verifiable artifact. |
| Fail closed | Missing dependency → halt, not silent skip. Unknown state → escalate, not assume. |
| Minimum code | No speculative abstractions. Only what is asked for and proven to work. |
| HITL (Human in the Loop) | No publish, deploy, or delete without human approval. AI proposes; human decides. |
| One SSOT per domain | Each fact lives in exactly one place. Maps index; they do not duplicate. |
| Red Zone escalation | Ethics, public copy, pricing, architecture, security, PII → stop and escalate to human. |

---

*This document is part of the EGOS public architecture documentation.*
*For the ecosystem map (repos and components), see [`ecosystem.md`](./ecosystem.md).*
*For the event and handoff chain, see [`event-chain.md`](./event-chain.md).*
