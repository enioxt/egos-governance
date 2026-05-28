# INC-006 — Subagent Phantom: Audit Reports as Evidence

> **Date:** 2026 | **Severity:** 🟠 High | **Category:** Agent Reliability

---

## What Happened

A Plan-type subagent was spawned to audit the codebase for RLS policy compliance. It returned a report claiming "28 tables have correct RLS policies enabled." The main agent used this number in a compliance document.

The actual number was 4 tables. The subagent had performed a shallow scan, missed 24 tables entirely, and generated a confident summary with round numbers.

A second case: an Explore agent reported "X doesn't exist in the codebase." The main agent deleted what it believed was a duplicate. X did exist — the Explore agent had missed a non-obvious file path.

## Root Cause

Subagent (Agent/Explore/Plan) outputs are **synthesis**, not evidence. They summarize what they found, not what exists. When they scan large codebases, they use excerpts, not full reads. An absolute claim ("X doesn't exist", "all 28 tables") from a subagent without file:line anchor is structurally unreliable.

## Rule Created

**R1-3:** `Subagent reports = synthesis, not evidence. Re-verify top 3 structural claims before committing or updating SSOT.`

Subagent prompts must include:
```
Return evidence tuples: {claim, evidence_path, evidence_line}.
Prefix unanchored claims with UNVERIFIED:.
Absolute claims ("X doesn't exist", "all N items") require file:line proof.
```

Review checklist before using subagent output:
- [ ] Top 3 claims have `file:line` anchors
- [ ] No absolute negatives ("X doesn't exist") without grep evidence
- [ ] Round numbers (10, 20, 100) verified independently
- [ ] Scored tables have `VERIFIED_AT` per row, not just totals

## Result

Subagent outputs are now treated as "directions to investigate" rather than facts. Compliance reports require per-row verification. 2 caught phantom audits in 4 weeks post-rule.

---

*This rule is encoded in: `R1-3` of `AGENTS.md`, `AGENTS.md §R2.1-2`*
