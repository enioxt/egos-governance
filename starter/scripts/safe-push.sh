#!/usr/bin/env bash
# scripts/safe-push.sh — non-destructive push wrapper for agents and CI
#
# Why: 2026-04-06, scheduled jobs and stale runners caused a force-push to
# main that dropped 9 commits of in-progress work. This wrapper makes it
# impossible to repeat that mistake. Use this in EVERY agent and workflow
# that pushes to a protected branch.
#
# Usage:
#   bash scripts/safe-push.sh                       # push current branch
#   bash scripts/safe-push.sh main                  # push to main
#   bash scripts/safe-push.sh main 5                # push to main, retry up to 5x
#
# Exit codes:
#   0  — push succeeded
#   1  — rebase conflict (manual intervention required)
#   2  — push failed after all retries
#   3  — explicit force-push attempt blocked
#   4  — invalid arguments
#
# Behavior:
#   - Refuses to use --force unless EGOS_ALLOW_FORCE_PUSH=1 (and even then logs)
#   - Always fetches origin before push
#   - On non-fast-forward, rebases onto the latest origin and retries
#   - Hard-stops on rebase conflicts (no auto-resolution — humans only)
#   - Logs the full attempt chain for postmortem

set -euo pipefail

BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"
MAX_RETRIES="${2:-3}"
PROTECTED="main master production prod"

# --- guard 1: refuse explicit force flag ---
case " $* " in
  *" --force "*|*" -f "*|*" --force-with-lease "*)
    if [[ "${EGOS_ALLOW_FORCE_PUSH:-0}" != "1" ]]; then
      echo "🛑 safe-push: --force flag detected and EGOS_ALLOW_FORCE_PUSH != 1. Refusing." >&2
      echo "   If this is intentional human action: EGOS_ALLOW_FORCE_PUSH=1 bash scripts/safe-push.sh ..." >&2
      exit 3
    fi
    echo "⚠️  safe-push: EGOS_ALLOW_FORCE_PUSH=1 — allowing destructive push. You own the consequences." >&2
    ;;
esac

# --- guard 2: check branch is protected (informational) ---
is_protected=0
for p in $PROTECTED; do
  [[ "$BRANCH" = "$p" ]] && is_protected=1 && break
done
if [[ $is_protected -eq 1 ]]; then
  echo "ℹ️  safe-push: '$BRANCH' is a protected branch — using strict mode (no force, rebase on conflict)" >&2
fi

# --- pre-flight: auto-rebase if behind origin ---
git fetch origin "$BRANCH" 2>/dev/null || true
BEHIND=$(git rev-list --count "HEAD..origin/$BRANCH" 2>/dev/null || echo 0)
if [ "$BEHIND" -gt 0 ]; then
  echo "↻ safe-push: local is $BEHIND commits BEHIND origin/$BRANCH — rebasing before push..."
  if ! git -c core.hooksPath=/tmp/empty-hooks rebase "origin/$BRANCH"; then
    echo "🛑 safe-push: pre-flight rebase conflict. Resolve manually:" >&2
    echo "   git fetch origin $BRANCH && git rebase origin/$BRANCH" >&2
    git rebase --abort 2>/dev/null || true
    exit 1
  fi
  echo "✅ safe-push: pre-flight rebase complete"
fi

# --- attempt push with retry on non-FF ---
for attempt in $(seq 1 "$MAX_RETRIES"); do
  echo "→ safe-push attempt $attempt/$MAX_RETRIES on '$BRANCH'..."
  if git push origin "HEAD:$BRANCH"; then
    echo "✅ safe-push: success on attempt $attempt"
    # Invoke post-push hook (git has no native post-push — must be explicit).
    # Handles Codex review submission + Hermes event-driven trigger.
    HOOK="$(git rev-parse --show-toplevel)/.husky/post-push"
    if [ -x "$HOOK" ]; then
      "$HOOK" >&2 || true  # non-blocking: hook failures must not fail push
    fi
    exit 0
  fi

  echo "↻ Push failed — fetching origin/$BRANCH..."
  git fetch origin "$BRANCH"

  echo "↻ Rebasing onto origin/$BRANCH..."
  if ! git -c core.hooksPath=/tmp/empty-hooks rebase "origin/$BRANCH"; then
    echo "🛑 safe-push: rebase conflict on attempt $attempt. NOT auto-resolving." >&2
    echo "   Files in conflict:" >&2
    git status --porcelain | grep -E '^(UU|AA|DD|DU|UD)' >&2 || true
    echo "   Aborting rebase. Resolve manually:" >&2
    echo "     git fetch origin $BRANCH" >&2
    echo "     git rebase origin/$BRANCH" >&2
    echo "     # resolve conflicts, git add, git rebase --continue" >&2
    echo "     bash scripts/safe-push.sh $BRANCH" >&2
    git rebase --abort 2>/dev/null || true
    exit 1
  fi
done

echo "🛑 safe-push: failed after $MAX_RETRIES attempts. The branch is moving too fast or there is a remote issue." >&2
exit 2
