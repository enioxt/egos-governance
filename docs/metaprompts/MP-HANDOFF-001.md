# MP-HANDOFF-001 — Handoff Generation Prompt

> **Version:** 1.0.0 · **Status:** CANONICAL · **Updated:** 2026-06-03

---

## Purpose

Generate a structured, verifiable handoff between agent windows (or between sessions),
preserving: commits with SHA, decisions + rejected options, session todos, and next
tasks without conflict. Prevents silent state loss when context is compacted or when
multiple windows operate on the same working tree.

## When to Use

- End of session (mandatory handoff phase).
- Switching the primary agent role (e.g., orchestrator → builder).
- After context compaction: context was reduced and the next agent needs to reload state.
- Any time 3+ commits are not documented in an active handoff.
- Fallback when the full session-end skill cannot run due to low context.

## Expected Input

| Field | Type | Required |
|-------|------|----------|
| `ORIGIN` | name of the window/agent that is closing | yes |
| `DESTINATION` | name of the window/agent that will continue | yes |
| `commits_sha` | list of SHAs from this session (git log --oneline) | yes |
| `decisions` | list of decisions + rejected option + reason | yes |
| `todos` | snapshot of current todo state | yes |
| `date` | ISO date (YYYY-MM-DD) | yes |
| `frozen_zones_touched` | list or "none" | yes |
| `commits_hold` | local commits not yet pushed + reason | conditional |

## Expected Output

Markdown file in your handoffs directory (e.g., `docs/handoffs/handoff_YYYY-MM-DD.md`)
following a consistent template. Required sections:

1. **What ORIGIN did this session (with SHA)** — every item MUST have a SHA;
   without SHA = `[CONCEPT]`
2. **Validation of last message from the other window** — CORRECT / PARTIAL / DIVERGES + evidence
3. **Decisions + rejected options** — explicit reason why X and not Y
4. **Session todos snapshot** — in-progress todos need % and blocker
5. **Next tasks WITHOUT conflict** — segregated by window (destination proposes,
   origin commits, Red Zone = human)
6. **Retained state / pending** — commits on hold, frozen zones touched

### Fidelity scoring

If you have a handoff fidelity scorer in your project, run it on the generated file.
A reasonable threshold is around 60/100 (warns of context loss); an internal quality
target is ≥ 80/100. Without a scorer, do a manual checklist against the sections above.

## Limits

- Does not replace your task tracker — handoffs are ephemeral (validity ≤ 1 session);
  tasks persist in the tracker.
- Does not duplicate memory from agent run logs; points to them instead.
- Does not record secrets, tokens, or env var values.
- Does not decide Red Zone — reports and stops; decision belongs to the human.
- Does not create a new handoff if one active exists with ≤ 2h elapsed; update the
  existing one instead.

## Acceptance Criteria

- [ ] Every "done" claim carries a verifiable SHA (`git show <sha>` returns success).
- [ ] Decisions section has at least 1 entry with an explicit rejected option.
- [ ] Session todos snapshot reflects current state (not an hour-old version).
- [ ] No literal placeholder text (`<ORIGIN>`, `<DESTINATION>`, `<sha>`) remains
  in the final file.

## Red Zone

- **Pricing / public copy / security** cited in pending items → mark `[RED-ZONE]` and stop.
- **Frozen zones touched** → list explicitly; do not leave implicit.
- **PII in decisions** → replace with an opaque reference (`see project memory entry X`).

## Example — Minimal

```markdown
# Sync Orchestrator → Builder — 2026-06-03

## What Orchestrator did this session (with SHA)
- `b7538e06` — absorb Builder: agent-map verified + proposals + handoffs
- `702629bd` — feat(governance): new audit rule + registry update

## Validation of last message from the other window
- **Analysis: CORRECT** — SHA b7538e06 confirmed via `git show`.

## Decisions + rejected options
- Kept the existing template without extra fields — rejected adding a `risk_score` field
  because it would increase overhead without evidence of use (YAGNI).

## Session todos snapshot
- [x] Write MP-HANDOFF-001
- [ ] Validate fidelity score in CI

## Next tasks WITHOUT conflict
**Builder (proposes diff):** review MP-HANDOFF-001 against governance rules
**Orchestrator (commits):** git add docs/metaprompts/MP-HANDOFF-001.md

## Retained state / pending
- Frozen zones touched: none.
- Commits on hold: none.
```

## Example — Advanced (multi-window, conflict protocol)

```markdown
# Sync Orchestrator → Builder — 2026-06-03

> Extreme Zone ACTIVE — shared git index; read before touching working tree.

## What Orchestrator did this session (with SHA)
- `a14e5a20` — feat(agents): Phase 1 wiring — roster + gate-registry + collision (Critique)
- `e4241785` — feat(skills): /start v6.15 — Layer 4.5a counts active handoffs (anti-drift)
- `75a03284` — chore(handoffs): consolidate to 1 active — archive 22 stale

## Validation of last message from the other window
- **Analysis: PARTIAL** — Builder reported typecheck clean but did not run integration tests.
- **Corrections needed:** missing evidence of `bun test packages/audit/` before declaring [DONE].

## Decisions + rejected options
- Adopted `triggers.json` as wiring SSOT instead of dispersing across each agent file —
  reason: historical drift with 12 files.
- Rejected adding `upstream_sha` field to gate — maintenance cost exceeds benefit for the
  current cycle.

## Session todos snapshot
- [x] Phase 1 wiring committed and pushed
- [/] Integration tests for agent-pipeline — 60% — blocker: event-bus mock is still a stub
- [ ] Propagation to downstream repos

## Next tasks WITHOUT conflict
**Builder (proposes diff, does not commit):**
- Implement non-stub mock for event-bus in `tests/`

**Orchestrator (commits + pushes):**
- git add docs/metaprompts/MP-HANDOFF-001.md && git commit

**Human (Red Zone — do not execute):**
- Decide whether the propagation step runs automatically or with a manual gate

## Retained state / pending
- Commits on hold: none.
- Frozen zones touched: none.

## Coexistence rules (Extreme Zone)
- Builder proposes, Orchestrator commits. Never `git add -A`.
- Do not accumulate: commit/push before 5+ commits or 25+ dirty files.
```

---

> **Anti-copy-paste note:** adapt to your project's directory structure, agent naming
> convention, and task tracker. The fidelity threshold (60/100) is a reference value —
> calibrate it based on what works for your team. SHA values in examples are
> illustrative — always use real SHAs from your own `git log`.
