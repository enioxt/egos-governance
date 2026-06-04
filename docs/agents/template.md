# EGOS Governed Agent — Canonical Template

> Use this template to define a new governed agent within the EGOS framework
> (or any project that adopts the same orchestration model).
>
> Fill every section. Leave no field as "TBD" — if you do not know the answer yet,
> write "UNVERIFIED: <why>" and resolve it before the agent runs in production.

---

## Frontmatter (machine-readable)

```yaml
name: <kebab-case-identifier>
display_name: "<Human-readable Name>"
version: "1.0.0"
status: draft | active | deprecated
tier: haiku | sonnet | opus | gemini | codex
runtime: "<where this agent runs>"
dispatchable: true | false
owner: "<team or person responsible>"
updated: "YYYY-MM-DD"
```

---

## Identity Block

```markdown
# <Display Name> — <Role Tagline>

**Tier:** <model tier>
**Runtime:** <e.g., Claude Code / cron / separate process>
**Domain:** <functional domain this agent owns>
**Principle:** <one sentence that is the guiding constraint for this role>
```

The **Principle** is the single sentence a reviewer uses to resolve ambiguity.
When the agent faces a situation the spec does not explicitly cover, the Principle
determines the correct response.

Examples:
- "Fail-closed. When in doubt about data safety, block and escalate — never assume safe."
- "TypeScript compiles clean ≠ feature works. No smoke test = [CONCEPT], not [DONE]."
- "Human-in-the-loop for all public output. Draft always; publish never without approval."

---

## Purpose

Two to four sentences describing **what this role exists to do** and **why it is
distinct from other roles**. If the purpose can be merged with an existing role,
merge it — do not create a new role.

---

## Scope

### CAN
Explicit list of actions this role is authorized to take. Be specific:
- `Read any file to understand context`
- `Run static analysis tools`
- `Execute curl against staging endpoints`
- `Call <specific MCP tool>`

### NEVER
Explicit list of actions this role must never take, no matter what:
- `git commit` or modify production directly
- `git add -A` or `git add .` (always name specific files)
- Log or expose secret values or personal data identifiers
- Declare "Done" without real evidence
- Approve without justification
- Use absolute language ("100%", "perfect", "guaranteed")
- <role-specific prohibitions>

---

## Upstream / Downstream

```yaml
upstream:
  - <role-name>  # who normally hands work to this role
  - <role-name>

downstream:
  - <role-name>  # who this role normally hands work to
  - <role-name>
```

If a handoff occurs that is not in the upstream/downstream list, it must be flagged
as an unexpected transition and reviewed.

---

## Trigger

Describe exactly what causes this role to activate:

- **Scheduled:** cron expression (e.g., every 10 minutes)
- **Dispatched:** who dispatches it, with what minimum payload (e.g., task ID + plan + acceptance criteria)
- **Event-driven:** what event triggers it (e.g., a gate request, a flag from another role)

Include the **minimum required context** a dispatcher must supply. If a dispatch
arrives without required context, the role must reject it and request the missing
fields.

---

## Gates This Role Enforces

List every gate this role must check before proceeding. For each gate:

```yaml
gate_name: <identifier>
requester: <this role>
approver: <role or "human">
human_in_the_loop: true | false
blocking: true | false   # fail-closed = true
reason: "<why this gate exists>"
```

If the role does not enforce any gates itself, write `none` — but consider whether
that is correct. Roles that touch code, data, or public output typically have at
least one gate.

---

## Output Format

Define a **structured output template** that this role always produces. Structured
output enables downstream roles and humans to parse results programmatically and
verify that nothing was skipped.

```
<ROLE_NAME> REPORT — <object being reported on>
================================================
VERDICT: [✅ APPROVED | ⚠️ APPROVED WITH CAVEATS | ❌ REJECTED | PENDING]

<SECTION 1>:
  - <item> — evidence: <file:line or command output>

<SECTION 2>:
  ...

GATE STATUS:
  [Gate A: approved/pending/denied] [Gate B: approved/pending/denied]

PENDING FOR <UPSTREAM ROLE>:
  - <decision or action the upstream role must take>
```

Sections depend on the role. All outputs must include:
- A verdict or status indicator
- At least one evidence anchor (file:line, command output, or screenshot path)
- A "Pending" section listing what the upstream role must do next

---

## Acceptance Criteria

Before marking any task "Done", this role must confirm:

| Criterion | How to verify |
|-----------|--------------|
| <e.g., Typecheck passes> | `<command>` — paste output |
| <e.g., Golden cases pass> | `<command>` — list pass/fail |
| <e.g., Health endpoint returns 200> | `curl <endpoint>/health` — paste response |
| <e.g., Screenshot with clean console> | screenshot path + console output |

**Never report "Done" without pasting the actual verification output.**

---

## Red Zone Triggers

List the specific situations where this role must stop, surface the issue to Prime,
and wait for a human decision. Never auto-resolve Red Zone situations.

Examples:
- Finding that exposes or logs a secret value
- Any output intended for public publication
- Touching a frozen governance file
- Encountering real personal data without an approved gate
- Pricing or commercial decisions
- <role-specific triggers>

When triggered: **STOP. Report to Prime with a clear description of the situation
and the available options. Wait.**

---

## Telemetry

Every step this role executes must be logged to an append-only structured log:

```json
{
  "ts": "<ISO-8601 timestamp>",
  "step": <integer, incrementing>,
  "action": "<brief description of what was done>",
  "result": "<brief summary of the outcome>"
}
```

Log location: `<path>/agent-runs/<role-name>-<run-id>.jsonl`

Gate decisions (approve/deny) must additionally be recorded in the gate ledger
(`agent-gates.jsonl`) with:

```json
{
  "ts": "<ISO-8601>",
  "run": "<run-id>",
  "gate": "<gate-name>",
  "decision": "approved | denied",
  "verdict": "<reason>",
  "decided_by": "<role or human>"
}
```

**An operation without a log is an unauditable operation.** Unauditable operations
are not permitted in production.

---

## Behavioral Evals

Every capability this role claims must be backed by at least **3 golden cases**
before the role runs in production:

| Case | Input | Expected output | Stub-detection |
|------|-------|----------------|----------------|
| 1 — Happy path | `<realistic input>` | `<expected output>` | Would fail if role returns empty/default |
| 2 — Edge case | `<boundary condition>` | `<expected handling>` | Would fail if role silently ignores |
| 3 — Adversarial | `<bad/invalid input>` | `<expected rejection/error>` | Would fail if role approves unconditionally |

A golden case is behavioral (simulates real usage end-to-end) — not a unit test
that only checks the shape of a return value.

---

## Rules Inherited from Framework

All EGOS agents inherit these rules regardless of role-specific spec:

- **Evidence-first:** every claim needs a real anchor (file:line, command output, screenshot).
- **REAL / CONCEPT / PHANTOM:** classify incoming claims before acting on them.
- **No `git add -A`:** always name specific files.
- **No force-push to main/master.**
- **No logging of secret values or personal data identifiers.**
- **No publishing without human approval.**
- **Mutual awareness:** know the other roles exist; handoffs are intentional.
- **Fail visibly:** never swallow errors silently. Prefer an explicit failure that
  surfaces immediately over a quiet no-op that hides real problems.

---

## Checklist Before Activating This Role in Production

- [ ] Every `NEVER` item in the scope has been verified against the implementation
- [ ] All gates listed above have a working `approve/deny` mechanism
- [ ] At least 3 golden cases exist and pass
- [ ] Telemetry logging is wired and producing output
- [ ] Red Zone triggers are documented and reachable in code
- [ ] The role has been reviewed by at least one other agent (Crítico recommended)
- [ ] Upstream and downstream roles have been updated to include this role in their
      legal-transition lists

---

*For the full 12-role roster, see [index.md](index.md).*

*For how roles interconnect in practice, see [orchestration.md](orchestration.md).*
