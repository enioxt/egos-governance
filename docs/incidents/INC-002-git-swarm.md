# INC-002 — Git Swarm: `git add -A` in Background Agents

> **Date:** 2026 | **Severity:** 🔴 Critical | **Category:** Agent Safety

---

## What Happened

A background agent finished its task and ran `git add -A` before committing. Unknown to the agent, another parallel agent had written temporary debug files and an unreviewed `.env.local` to the working directory during its own run.

The first agent committed everything — including the debug files and the env file with real API keys. The commit went to a feature branch (not main), but the secrets were in git history.

No keys were exposed publicly, but the branch had to be force-deleted, history rewritten, and all affected keys rotated. 2 hours of remediation.

## Root Cause

`git add -A` adds everything in the working tree, not just the files the agent touched. In a multi-agent environment, the working tree is shared state.

## Rule Created

**R0-4:** `NEVER git add -A in background agents. Always git add <specific-file>`

```bash
# BAD — adds everything in working tree
git add -A
git add .

# GOOD — explicit list of files the agent touched
git add src/specific-module.ts
git add docs/specific-doc.md
```

Additional rules derived:

- `TASKS.md` must be committed before spawning background agents (agents lose uncommitted state)
- Read in parallel, write sequentially: never 2+ write agents on the same repo at the same time
- `gitleaks` pre-commit hook added (blocking): catches secrets before they enter history

## Result

No accidental mass-staging incidents since rule was enforced. The pre-commit hook catches stragglers.

---

*This rule is encoded in: `R0-4` of `AGENTS.md`, pre-commit gitleaks gate (check 01)*
