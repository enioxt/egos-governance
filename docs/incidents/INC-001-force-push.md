# INC-001 — Force Push on Main

> **Date:** early 2026 | **Severity:** 🔴 Critical | **Duration:** ~40 minutes lost work
> **Category:** Git Safety

---

## What Happened

A background agent finished a large refactor and pushed directly to `main` with `--force`. The branch had diverged from origin because another parallel agent had committed in between. The force-push silently overwrote 4 commits that had not been rebased.

The commits were recoverable from `reflog`, but required 40 minutes of investigation, a manual cherry-pick, and a team-wide halt while the repo state was trusted again.

## Root Cause

Two causes combined:

1. No enforcement preventing `git push --force` on protected branches
2. Background agents operated with full git permissions, no guardrails

## Rule Created

**R0-1:** `NEVER git push --force to main/master/production/hotfix/release`

```bash
# scripts/safe-push.sh — the ONLY approved push method
git fetch origin
git rebase origin/main
git push origin HEAD
```

Pre-push hook added: any `--force` flag on protected branches = immediate exit 1.

```bash
# .husky/pre-push
protected="main master production prod release hotfix"
current_branch=$(git rev-parse --abbrev-ref HEAD)
for branch in $protected; do
  if [ "$current_branch" = "$branch" ]; then
    # Check if force push attempted
    if echo "$@" | grep -q "\-\-force\|-f"; then
      echo "[GIT SAFETY] Force push to $branch BLOCKED. Use scripts/safe-push.sh"
      exit 1
    fi
  fi
done
```

Exception gate: `EGOS_ALLOW_FORCE_PUSH=1` env var (set only in emergency shell, never in CI).

## Result

Zero force-push incidents since the hook was deployed. The `safe-push.sh` script has caught 3 silent divergence issues that would have caused similar problems.

---

*This rule is encoded in: `R0-1` of `AGENTS.md`, `.husky/pre-push`, `scripts/safe-push.sh`*
