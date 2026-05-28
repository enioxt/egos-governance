# INC-005 — External LLM Phantom: Treating Pasted Output as Evidence

> **Date:** 2026 | **Severity:** 🟠 High | **Category:** AI Reliability

---

## What Happened

A developer pasted a ChatGPT-generated analysis into a task document. The analysis mentioned 3 specific functions by name, claiming they were "already implemented" in the codebase. Based on this, the next agent skipped implementing those functions.

The functions did not exist. They were hallucinated by ChatGPT. The downstream agent built on top of non-existent foundations, and the bug was discovered only during integration testing — 6 hours later.

A second variant of this: an agent received a Grok summary claiming "the migration was applied on 2026-04-12." The migration had never been applied. The agent proceeded without running it.

## Root Cause

External LLM outputs (ChatGPT, Gemini, Grok, Perplexity) generate confident-sounding prose about things that may not exist. They describe the ideal state, not the actual state. Treating them as ground truth without verification is a category error.

High-density buzzword lists (8+ capitalized technical terms) are a signal: the more confident and abstract the list, the higher the likelihood of phantom content.

## Rule Created

**R1-2:** `External LLM paste = UNVERIFIED. Every named feature/file/function = PHANTOM until verified.`

Classification system:
- `REAL` — verified via `git log --grep`, `Glob`, `grep`, or live endpoint
- `CONCEPT` — plausible but not verified (mark as hypothesis, not fact)
- `PHANTOM` — claimed to exist but doesn't (document and discard)

```bash
# Verification workflow for external LLM claims
# Claim: "function processWebhook() is implemented in apps/gateway/"
grep -r "processWebhook" apps/gateway/src/ | head -5
# If 0 results → PHANTOM
```

Pre-verification is mandatory before:
- Adding a task as "done" based on LLM output
- Skipping implementation because LLM says "it's already there"
- Citing a metric from an LLM summary without source

## Result

The classification system adds friction but prevents phantom-based decisions. 3 confirmed phantom catches in the 6 weeks after the rule was deployed.

---

*This rule is encoded in: `R1-2` of `AGENTS.md`, `OPUS_MODE_V1.md §2`*
