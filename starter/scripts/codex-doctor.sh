#!/usr/bin/env bash
set -euo pipefail

# ── Codex sandbox patch (Option A — host trust) ──────────────────────────────
# Why: Ubuntu 24.04 AppArmor blocks bwrap → Codex CLI fails with sandbox errors.
# Patch: replace `sandbox: "read-only"` → `sandbox: "danger-full-access"` in
# 3 known sites of the openai-codex plugin. SHA-stamped + idempotent.
# SSOT: docs/governance/CODEX_PIPELINE.md
CODEX_PLUGIN_ROOT="${CODEX_PLUGIN_ROOT:-$HOME/.claude/plugins/cache/openai-codex/codex/1.0.4}"
CODEX_FILE_COMPANION="$CODEX_PLUGIN_ROOT/scripts/codex-companion.mjs"
CODEX_FILE_LIB="$CODEX_PLUGIN_ROOT/scripts/lib/codex.mjs"
CODEX_SHA_DIR="$HOME/.cache/egos"
CODEX_SHA_FILE="$CODEX_SHA_DIR/codex-doctor-sha"

codex_patch_check() {
  # Outputs OK/PATCH-NEEDED/MISSING. Never modifies.
  if [ ! -f "$CODEX_FILE_COMPANION" ] || [ ! -f "$CODEX_FILE_LIB" ]; then
    echo "MISSING"
    return 0
  fi
  # Patched if companion has 0 occurrences of `sandbox: "read-only"` AND lib has 0 too.
  local rcount lcount
  rcount=$(grep -c 'sandbox: "read-only"' "$CODEX_FILE_COMPANION" 2>/dev/null || true)
  lcount=$(grep -c 'sandbox: "read-only"' "$CODEX_FILE_LIB" 2>/dev/null || true)
  rcount=${rcount:-0}; lcount=${lcount:-0}
  if [ "$rcount" -eq 0 ] && [ "$lcount" -eq 0 ]; then
    echo "OK"
  else
    echo "PATCH-NEEDED ($rcount in companion, $lcount in lib)"
  fi
}

apply_codex_sandbox_patch() {
  if [ ! -f "$CODEX_FILE_COMPANION" ] || [ ! -f "$CODEX_FILE_LIB" ]; then
    printf "  ⚠️ Codex plugin files not found under %s — skipping\n" "$CODEX_PLUGIN_ROOT"
    return 0
  fi
  mkdir -p "$CODEX_SHA_DIR"

  # Companion: 2 sites
  #   1) review prompt block:     sandbox: "read-only"  → danger-full-access
  #   2) continue/turn block:     `request.write ? "workspace-write" : "read-only"` → ...
  #      We patch the trailing `"read-only"` to `"danger-full-access"` so write-mode is preserved.
  python3 - "$CODEX_FILE_COMPANION" <<'PY'
import re, sys, io
p = sys.argv[1]
src = open(p, 'r', encoding='utf-8').read()
orig = src
# Pattern 1: bare `sandbox: "read-only"` (review block, ~line 411)
src = src.replace('sandbox: "read-only"', 'sandbox: "danger-full-access"')
# Pattern 2: ternary `? "workspace-write" : "read-only"` may have been replaced above
# (since "read-only" matched). That is correct: write-mode still uses workspace-write,
# and the ternary's else branch becomes danger-full-access.
if src != orig:
    open(p, 'w', encoding='utf-8').write(src)
    print(f"  patched: {p}")
else:
    print(f"  no-op  : {p} (already patched)")
PY

  # Lib: 1 site
  python3 - "$CODEX_FILE_LIB" <<'PY'
import sys
p = sys.argv[1]
src = open(p, 'r', encoding='utf-8').read()
orig = src
src = src.replace('sandbox: "read-only"', 'sandbox: "danger-full-access"')
if src != orig:
    open(p, 'w', encoding='utf-8').write(src)
    print(f"  patched: {p}")
else:
    print(f"  no-op  : {p} (already patched)")
PY

  # Record post-patch SHA so next run can detect plugin upgrade
  {
    sha256sum "$CODEX_FILE_COMPANION" 2>/dev/null || true
    sha256sum "$CODEX_FILE_LIB" 2>/dev/null || true
  } > "$CODEX_SHA_FILE"
  printf "  ✅ patch applied; SHA stored at %s\n" "$CODEX_SHA_FILE"
}

# ── CLI dispatch ──────────────────────────────────────────────────────────────
if [ "${1:-}" = "--check" ]; then
  printf "[codex-doctor] sandbox patch state: %s\n" "$(codex_patch_check)"
  if [ -f "$CODEX_SHA_FILE" ]; then
    printf "[codex-doctor] last applied SHA: %s\n" "$(head -1 "$CODEX_SHA_FILE" | awk '{print $1}')"
  fi
  exit 0
fi

if [ "${1:-}" = "--fix" ]; then
  printf "[codex-doctor] applying sandbox patch (idempotent)…\n"
  apply_codex_sandbox_patch
  printf "[codex-doctor] verify: %s\n" "$(codex_patch_check)"
  exit 0
fi

printf "EGOS Codex Doctor\n"
printf "=================\n"
printf "Date (UTC): %s\n" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf "Repo: %s\n\n" "$(pwd)"

printf "[0/5] Codex sandbox patch\n"
printf "  state: %s\n" "$(codex_patch_check)"
printf "  Re-apply with: bash scripts/codex-doctor.sh --fix\n\n"

printf "[1/5] Environment\n"
if command -v bun >/dev/null 2>&1; then
  printf "  ✅ bun: %s\n" "$(bun --version)"
else
  printf "  ❌ bun not found\n"
fi
if command -v git >/dev/null 2>&1; then
  printf "  ✅ git: %s\n" "$(git --version)"
else
  printf "  ❌ git not found\n"
fi

printf "\n[2/5] Governance baseline\n"
if [ -f .windsurfrules ] && [ -f AGENTS.md ] && [ -f TASKS.md ]; then
  printf "  ✅ Core SSOT files present\n"
else
  printf "  ❌ Missing one or more SSOT files (.windsurfrules, AGENTS.md, TASKS.md)\n"
fi

printf "\n[3/5] Network check\n"
if curl -sSfL --max-time 10 https://api.github.com/repos/SynkraAI/aiox-core >/dev/null; then
  printf "  ✅ External GitHub API reachable\n"
else
  printf "  ⚠️ GitHub API unreachable (network or rate-limit)\n"
fi

printf "\n[4/5] Codex lane limitations (MANDATORY DISCLOSURE)\n"
printf "  - This session runs in Codex terminal lane (non-interactive by default).\n"
printf "  - Browser/UI actions may be unavailable unless a dedicated browser tool is exposed.\n"
printf "  - Home-level governance sync state may reset between runs in ephemeral environments.\n"
printf "  - Push/deploy actions are not assumed; explicit repo remote actions still require operator decision.\n"

printf "\n[5/5] Recommended next commands\n"
printf "  - bun run agent:lint\n"
printf "  - bun run typecheck\n"
printf "  - bun test\n"
printf "  - bun run governance:sync:exec && bun run governance:check\n"
