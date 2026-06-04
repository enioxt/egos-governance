# MP-AGENT-002 — Agent Result Audit Prompt

> **Version:** 1.0.0 · **Updated:** 2026-06-03

---

## Purpose

Sub-agents (Explore, Codex, external LLM output pasted into context) produce _synthesis_,
not evidence. Accepting their output without verification is the root cause of phantom
features entering task lists, migrations being written for tables that don't exist, and
PRs citing non-existent code.

This metaprompt generates the prompt that forces the verifier to classify each structural
claim as **REAL / CONCEPT / PHANTOM** with `file:line` or `command+SHA` evidence before
any commit, SSOT edit, or task-tracker update.

## When to Use

- After any Explore / Plan / Agent tool output, before taking action.
- When receiving output from an external LLM (ChatGPT, Gemini, Grok) pasted into context.
- Before accepting score tables without a verifiable auto-generation marker.
- When you detect 8+ capitalised terms without `file:line` — a phantom signal.

## Expected Input

```json
{
  "agent_output": "<full text from the sub-agent>",
  "original_task": "<task that was dispatched>",
  "expected_artifacts": ["path/to/file.ts", "endpoint /api/v1/x"],
  "verification_tool": "grep | ls | curl | your-code-search-tool"
}
```

Required: `agent_output`, `original_task`.

## Expected Output

Prompt that instructs the verifier to produce:

```
AUDIT — <agent> — <date>
claim "<X>" → REAL    evidence: src/routes/ops.ts:42
claim "<Y>" → CONCEPT referenced in doc/Y.md L18, no implementation verified
claim "<Z>" → PHANTOM grep across codebase: no result

PHANTOM SCORE: N of M claims = PHANTOM
ACTION:
  Accept   → REAL claims with file:line or cmd+SHA
  Return   → CONCEPT claims (ask for file:line or implementation)
  Block    → commit/SSOT-edit dependent on PHANTOM claim
  Escalate → orchestrator if >30% of top-3 are PHANTOM
```

## Limits

- Does not execute verification — generates instructions for the verifier or orchestrator.
- Does not cover runtime behaviour; claims about live endpoints require a real `curl`.
- A score table marked as auto-generated still needs the generator run identified and
  the run SHA recorded — the marker alone does not guarantee correctness.

## Acceptance Criteria

| # | Input scenario | Expected result |
|---|----------------|-----------------|
| GC-1 | "implemented GET /api/v1/orders/export" | REAL if grep finds handler; PHANTOM if not found |
| GC-2 | Compliance table 0-100 without auto-gen marker | Column classified PHANTOM VECTOR, merge blocked |
| GC-3 | "handleFoo refactored to streaming" | CONCEPT if function exists without streaming; PHANTOM if function not found |

## Red Zone

Escalate to orchestrator without auto-resolving when:

- More than 30% of the top-3 verified claims are PHANTOM in a production commit base.
- Output mentions changes in frozen zones (files that must never change).
- Claims involve pricing, public copy, PII, secrets, or "migration applied" / "deploy done".

## Example — Minimal

**Input:** agent reports "route POST /api/v1/tenant-provision implemented with migration".

**Generated prompt instructs verifier:**
```
For each claim below, classify as REAL/CONCEPT/PHANTOM with file:line evidence.
Re-verify top 3 via grep or your code-search tool before accepting.
Do not commit based on a PHANTOM claim.

Claims:
- "POST /api/v1/tenant-provision exists"  → grep src/routes/ for "tenant-provision"
- "X-Auth-Token authenticated"            → grep the header in the handler
- "migration included"                    → ls db/migrations/ | grep tenant_provision
```

## Example — Advanced

**Scenario:** Explore agent returned a guardrail audit with a Compliance 0-100 score
table and 12 claims about `src/gateway/`.

**Generated prompt instructs verifier to:**
1. For each score without `VERIFIED_AT` + `evidence` (file:line): classify that column
   as PHANTOM VECTOR and block SSOT edits.
2. Re-verify top-3 via your code-search tool:
   - "guardrails.yaml exists" → `ls src/gateway/guardrails.yaml`
   - "validate-guardrails.ts validates schema" → `grep validateGuardrails src/`
   - "3 golden cases in eval runner" → `grep -r 'GC-' tests/eval/`
3. If 2+ of the top-3 are PHANTOM: escalate to orchestrator, do not edit SSOT.

---

> **Anti-copy-paste note:** adapt the verification commands to your repository's actual
> structure. Paths in the examples are illustrative. The classification pattern
> (REAL / CONCEPT / PHANTOM) is universal and should be preserved verbatim.
