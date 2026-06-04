# MP-AUDIT-001 — Capability Audit Prompt

> **Version:** 1.0.0 · **Status:** CANONICAL · **Updated:** 2026-06-03

---

## Purpose

Guide an agent to audit a claimed capability according to a 4-state lifecycle:
USED, DOCUMENTED, VALIDATED, TESTED. Result: an audit report with verifiable
evidence — never an opinion.

## When to Use

- Before promoting a capability from `unverified:` to `ACTIVE`.
- When the evaluation runner detects coverage below the project target.
- When touching a legacy capability entry in the registry (organic migration).
- When a capability is suspected of being a stub: it claims to do something but returns
  empty results silently (INC-008 pattern: stub returning `[]` instead of raising an error).

## Expected Input

```
CAPABILITY_ID : <e.g., CBC-EVAL-001 or §N in your capability registry>
SCOPE         : <path of the module that implements it — verify with ls before>
GOLDEN_DIR    : <folder with golden-case test files, e.g., tests/eval/>
PROMO_CRITERIA: <e.g., "≥3 golden cases severity=block passing">
```

## Expected Output

```
CAPABILITY AUDIT — <CAPABILITY_ID>
===================================
CURRENT STATUS : <USED | DOCUMENTED | VALIDATED | TESTED — mark all that apply>
EVIDENCE       : <path:line for each declared status>

GOLDEN CASES   : <N found in <path>>
  - <id>: <description> [PASS | FAIL | MISSING]

STUBS DETECTED:
  - <file:line> — returns [] or silent equivalent

GAPS (delta to full lifecycle):
  - [ ] <missing item>

VERDICT        : READY-FOR-PROMOTION | PARTIALLY-VALIDATED | NOT-VALIDATED
NEXT-ACTION    : <task with explicit owner>
```

## Limits

- Does NOT promote automatically — report only; commit is the orchestrator's responsibility.
- Does NOT invent golden cases: if the folder is empty, declare `GOLDEN CASES: 0 found`.
- Does NOT report "VALIDATED" without real runner output (`run your test runner`).
- A stub with `throw new Error('NOT IMPLEMENTED')` is correct (surfaces error visibly).
- A stub returning `[]` silently is a violation — report as critical gap.

## Acceptance Criteria

1. `EVIDENCE` has a verifiable path (not inferred) for each declared status.
2. Golden case count is real (from grep/ls), never an estimate.
3. Verdict uses exactly one of the three canonical values above.
4. Stubs list `file:line`; absence states "none detected (searched: grep 'return \[\]' <scope>)".
5. Next action has an explicit owner (agent role or person name).

## Red Zone

Stop and report to orchestrator if:

- Capability involves PII, sensitive personal data, or financial data — audit must not
  log real content.
- Scope includes frozen files that must not change.
- A golden case contains a real secret (token, key): `[RED ZONE — SECRET IN TEST FIXTURE]`.
- Promotion would imply changing pricing or public copy — human approval required.

## Example — Minimal

**Input:** `CAPABILITY_ID=§42`, `SCOPE=src/eval/`, `GOLDEN_DIR=tests/eval/`

**Output (structure):**
```
CURRENT STATUS : DOCUMENTED, TESTED
EVIDENCE       : docs/capabilities.md §42 (line 312); runner.test.ts (7 passing)
GOLDEN CASES   : 2 found — <your-real-eval-id-1> [PASS], <your-real-eval-id-2> [PASS]
               # NOTE: IDs above are ILLUSTRATIVE. Always verify with:
               # ls tests/eval/<your-folder>/ before referencing any ID.
STUBS          : none detected (searched: grep 'return \[\]' src/eval/)
GAPS           : [ ] third golden case severity=block
VERDICT        : PARTIALLY-VALIDATED
NEXT-ACTION    : Builder creates third golden case; Orchestrator reviews and commits.
```

## Example — Advanced (pre-release audit)

**Scenario:** `CBC-GUARDRAIL-001` before public release. The audit report must include:

- Real count of test files: `ls tests/eval/guardrails/*.ts | wc -l`
- Pasted output of `your-test-runner tests/eval/ --filter guardrails`
- Result of `grep -rn "return \[\]" src/guardrails/`
- Smoke: `curl -s http://localhost:3100/health` → HTTP status + first 200 chars
- If a token is required for smoke: `<!-- SMOKE-PENDING: requires .env with API_TOKEN -->`

Verdict can only be `READY-FOR-PROMOTION` when all items above are green and the golden
case count with `severity=block` is ≥ 3.

---

> **Anti-copy-paste note:** adapt paths, capability IDs, and criteria to your project.
> Verify every path with `ls` before referencing it. Capability IDs in the examples
> are illustrative — use your registry's real IDs. Do not copy secrets into the audit report.
