#!/usr/bin/env bash
# check-registry-parity.sh — enforce CAPABILITY_REGISTRY.md parity with packages/apps/agents
# Origem: registry drift discovery 2026-05-27 (13 packages/apps sem entry).
# SSOT: docs/governance/REGISTRY_PARITY_DECISION.md
#
# Modos:
#   (default)             → hard-fail on NEW staged packages/apps/agents sem registry entry
#   --audit               → full-scan warn-only listing pre-existing drift (exit 0)
#   --strict-quality      → additionally treat Status: unverified|phantom|concept|missing
#                           as drift (only verified|partial pass). Opt-in via flag OR
#                           EGOS_REGISTRY_PARITY_STRICT_QUALITY=1. Codex Q3 fix 2026-05-28.
#   EGOS_REGISTRY_PARITY_STRICT=1 → also fail on pre-existing drift (audit mode block)
#   EGOS_REGISTRY_PARITY_SKIP=<reason> → bypass commit (logs reason)
#
# Commit-message escape hatch: include "REGISTRY-PARITY-SKIP: <reason>" in message.
#
# Exit codes:
#   0 = OK
#   1 = HARD-FAIL (new item without registry entry, or strict audit violation)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REGISTRY="$ROOT_DIR/docs/CAPABILITY_REGISTRY.md"
GRACE_FILE="$ROOT_DIR/.registry-grace.yaml"
ADR="docs/governance/REGISTRY_PARITY_DECISION.md"

MODE="precommit"
STRICT_QUALITY="${EGOS_REGISTRY_PARITY_STRICT_QUALITY:-0}"
for arg in "$@"; do
  case "$arg" in
    --audit) MODE="--audit" ;;
    --strict-quality) STRICT_QUALITY=1 ;;
    precommit) MODE="precommit" ;;
  esac
done

# ── Escape hatches ────────────────────────────────────────────────────────────
if [ -n "${EGOS_REGISTRY_PARITY_SKIP:-}" ]; then
  echo "  [registry-parity] SKIP via env: $EGOS_REGISTRY_PARITY_SKIP"
  exit 0
fi

MSG_FILE="${COMMIT_MSG_FILE:-${GIT_DIR:-.git}/COMMIT_EDITMSG}"
COMMIT_MSG=""
[ -f "$MSG_FILE" ] && COMMIT_MSG="$(cat "$MSG_FILE" 2>/dev/null || echo "")"
if echo "$COMMIT_MSG" | grep -qE "REGISTRY-PARITY-SKIP: ?[^[:space:]]+"; then
  REASON="$(echo "$COMMIT_MSG" | grep -oE "REGISTRY-PARITY-SKIP: ?[^\\n]+" | head -1)"
  echo "  [registry-parity] SKIP explícito no commit msg: $REASON"
  exit 0
fi

# ── Helpers ───────────────────────────────────────────────────────────────────

# Grace expiry enforcement (Codex Q2 fix 2026-05-28): after grace_until,
# items WITHOUT permanent:true are dropped from grace and start hard-failing.
GRACE_UNTIL=""
if [ -f "$GRACE_FILE" ]; then
  GRACE_UNTIL="$(grep -E '^grace_until:' "$GRACE_FILE" 2>/dev/null | awk '{print $2}' | tr -d '"' || true)"
fi
GRACE_EXPIRED=0
if [ -n "$GRACE_UNTIL" ] && [ "$(date +%Y-%m-%d)" \> "$GRACE_UNTIL" ]; then
  GRACE_EXPIRED=1
fi

# Build the in-grace slug set (one slug per line) from .registry-grace.yaml.
# After grace_until, only items with `permanent: true` are kept.
collect_grace_slugs() {
  if [ ! -f "$GRACE_FILE" ]; then
    return 0
  fi
  if [ "$GRACE_EXPIRED" = "1" ]; then
    # Parse YAML: keep only blocks containing permanent: true
    # On each new slug, flush prior tracked slug if it was permanent.
    # NOTE: POSIX [[:space:]] required for mawk compatibility (\s only works in gawk)
    awk '
      BEGIN { slug=""; perm=0 }
      /^[[:space:]]*-[[:space:]]+slug:/ {
        if (slug != "" && perm == 1) print slug
        slug = $3
        perm = 0
        next
      }
      /^[[:space:]]*permanent:[[:space:]]*true/ { perm = 1 }
      END { if (slug != "" && perm == 1) print slug }
    ' "$GRACE_FILE" 2>/dev/null | sed 's/[",]//g'
    return 0
  fi
  # Pre-expiry: all listed slugs valid
  grep -E '^[[:space:]]*-[[:space:]]+slug:' "$GRACE_FILE" 2>/dev/null | sed -E 's/^[[:space:]]*-[[:space:]]+slug:[[:space:]]*//; s/[[:space:]]*$//' || true
}

is_in_grace() {
  local slug="$1"
  collect_grace_slugs | grep -Fxq "$slug"
}

is_in_registry() {
  local slug="$1"
  [ -f "$REGISTRY" ] || return 1
  # Match common shapes: package name, path, or explicit slug
  grep -qE "(^|[^A-Za-z0-9_-])${slug}([^A-Za-z0-9_-]|$)" "$REGISTRY"
}

# Extract the Status field for the §-section containing this slug.
# Echoes: verified|partial|unverified|phantom|concept|missing-status|none
# Scans CAPABILITY_REGISTRY.md, tracks current §-section header and last seen
# Status line. When the slug appears inside a section (header OR body line like
# "Path: packages/<slug>/"), we record the next Status: line. If no Status is
# found inside any matching section, returns missing-status. If slug never
# appears, returns none.
get_entry_status() {
  local slug="$1"
  [ -f "$REGISTRY" ] || { echo "none"; return; }
  awk -v slug="$slug" '
    BEGIN { in_section=0; matched=0; status="missing-status"; found_any=0 }
    /^## §[0-9]+/ {
      # flush prior section if it had a slug match
      if (matched && found_any == 0) { found_any = 1; final = status }
      in_section = 1
      matched = 0
      status = "missing-status"
      header = $0
      # check header for slug
      if (index(header, slug) > 0) matched = 1
      next
    }
    in_section && index($0, slug) > 0 { matched = 1 }
    in_section && /^>[[:space:]]*\*\*Status:\*\*/ {
      line = $0
      sub(/^>[[:space:]]*\*\*Status:\*\*[[:space:]]*/, "", line)
      sub(/[[:space:]]+.*$/, "", line)
      sub(/\*+$/, "", line)
      if (line != "") status = tolower(line)
    }
    END {
      if (matched && found_any == 0) { found_any = 1; final = status }
      if (found_any) print final
      else print "none"
    }
  ' "$REGISTRY"
}

# Quality predicate: only verified|partial are considered "high-quality" pass.
is_quality_pass() {
  local status="$1"
  case "$status" in
    verified|partial) return 0 ;;
    *) return 1 ;;
  esac
}

# Determine slug from a staged path
slug_from_path() {
  local path="$1"
  case "$path" in
    packages/*/package.json) echo "${path#packages/}" | sed 's|/package.json||' ;;
    apps/*/package.json)     echo "${path#apps/}"     | sed 's|/package.json||' ;;
    agents/skills/*.ts)      basename "$path" .ts ;;
    *) echo "" ;;
  esac
}

type_from_path() {
  local path="$1"
  case "$path" in
    packages/*) echo "package" ;;
    apps/*)     echo "app" ;;
    agents/*)   echo "agent" ;;
    *)          echo "unknown" ;;
  esac
}

# ── Mode: --audit (full scan, warn-only by default) ───────────────────────────
if [ "$MODE" = "--audit" ]; then
  echo "  [registry-parity] audit mode — scanning all packages/apps/agents"
  if [ "$STRICT_QUALITY" = "1" ]; then
    echo "  [registry-parity] strict-quality=ON (only verified|partial pass)"
  fi
  missing=()
  quality_drift=()
  in_grace_count=0

  scan_item() {
    local type="$1" slug="$2"
    if is_in_grace "$slug"; then in_grace_count=$((in_grace_count + 1)); return; fi
    if ! is_in_registry "$slug"; then
      missing+=("$type:$slug")
      return
    fi
    if [ "$STRICT_QUALITY" = "1" ]; then
      local status
      status="$(get_entry_status "$slug")"
      if ! is_quality_pass "$status"; then
        quality_drift+=("$type:$slug [status=$status]")
      fi
    fi
  }

  while IFS= read -r pkg; do
    slug="$(basename "$(dirname "$pkg")")"
    scan_item "package" "$slug"
  done < <(find "$ROOT_DIR/packages" -mindepth 2 -maxdepth 2 -name package.json 2>/dev/null | sort)

  while IFS= read -r app; do
    slug="$(basename "$(dirname "$app")")"
    [ "$slug" = "_archived" ] && continue
    scan_item "app" "$slug"
  done < <(find "$ROOT_DIR/apps" -mindepth 2 -maxdepth 2 -name package.json 2>/dev/null | sort)

  while IFS= read -r agent; do
    slug="$(basename "$agent" .ts)"
    scan_item "agent" "$slug"
  done < <(find "$ROOT_DIR/agents/skills" -mindepth 1 -maxdepth 1 -name '*.ts' 2>/dev/null | sort)

  echo "  [registry-parity] in-grace items skipped: $in_grace_count"
  total_drift=$(( ${#missing[@]} + ${#quality_drift[@]} ))
  if [ "$total_drift" -eq 0 ]; then
    echo "  [registry-parity] ✅ no drift detected"
    exit 0
  fi

  if [ "${#missing[@]}" -gt 0 ]; then
    echo "  [registry-parity] ⚠️  ${#missing[@]} item(s) missing from registry and grace:"
    for m in "${missing[@]}"; do echo "     → $m"; done
  fi

  if [ "${#quality_drift[@]}" -gt 0 ]; then
    echo "  [registry-parity] ⚠️  ${#quality_drift[@]} item(s) registered but failing strict-quality (status not in {verified,partial}):"
    for q in "${quality_drift[@]}"; do echo "     → quality:$q" ; done
  fi

  echo ""
  echo "  Fix: add §-entry in docs/CAPABILITY_REGISTRY.md OR list in .registry-grace.yaml"
  echo "  For quality drift: promote Status to verified|partial with evidence."
  echo "  Reference: $ADR"

  if [ "${EGOS_REGISTRY_PARITY_STRICT:-0}" = "1" ]; then
    echo "  [registry-parity] ❌ EGOS_REGISTRY_PARITY_STRICT=1 → exit 1"
    exit 1
  fi
  if [ "$STRICT_QUALITY" = "1" ] && [ "${#quality_drift[@]}" -gt 0 ]; then
    echo "  [registry-parity] ❌ --strict-quality with quality drift → exit 1"
    exit 1
  fi
  echo "  [registry-parity] warn-only (audit). Set EGOS_REGISTRY_PARITY_STRICT=1 to block."
  exit 0
fi

# ── Default mode: pre-commit, hard-fail on NEW staged additions ───────────────
# Codex Q1b fix 2026-05-28: include renamed (R) paths — `git mv` shouldn't bypass gate

STAGED_ADDS="$(git diff --cached --diff-filter=AR --name-only 2>/dev/null || true)"
[ -z "$STAGED_ADDS" ] && exit 0

violations=()
quality_violations=()
while IFS= read -r path; do
  case "$path" in
    packages/*/package.json|apps/*/package.json|agents/skills/*.ts) ;;
    *) continue ;;
  esac
  slug="$(slug_from_path "$path")"
  [ -z "$slug" ] && continue
  type="$(type_from_path "$path")"

  if is_in_registry "$slug"; then
    if [ "$STRICT_QUALITY" = "1" ]; then
      status="$(get_entry_status "$slug")"
      if ! is_quality_pass "$status"; then
        quality_violations+=("$type:$slug ($path) [status=$status]")
      fi
    fi
    continue
  fi
  if is_in_grace "$slug"; then
    echo "  [registry-parity] $type:$slug → in grace (ok for now)"
    continue
  fi

  violations+=("$type:$slug ($path)")
done <<< "$STAGED_ADDS"

if [ "${#violations[@]}" -eq 0 ] && [ "${#quality_violations[@]}" -eq 0 ]; then
  echo "  [registry-parity] ✓ no new packages/apps/agents (or all already registered)"
  exit 0
fi

if [ "${#violations[@]}" -gt 0 ]; then
  echo ""
  echo "  [registry-parity] ❌ HARD-FAIL: ${#violations[@]} new item(s) without registry entry:"
  for v in "${violations[@]}"; do echo "     → $v"; done
fi

if [ "${#quality_violations[@]}" -gt 0 ]; then
  echo ""
  echo "  [registry-parity] ❌ STRICT-QUALITY: ${#quality_violations[@]} new item(s) registered with non-pass Status:"
  for v in "${quality_violations[@]}"; do echo "     → $v"; done
  echo "  (acceptable: verified|partial — current: unverified|phantom|concept|missing)"
fi

echo ""
echo "  Fix (choose ONE):"
echo "    1. Add §-entry to docs/CAPABILITY_REGISTRY.md (preferred)"
echo "       Schema: docs/governance/CAPABILITY_SCHEMA.md (Status + Evidence + Owner)"
echo "    2. List slug in .registry-grace.yaml with reason (temporary, until 2026-06-15)"
echo "    3. Escape hatch (emergency only): commit body 'REGISTRY-PARITY-SKIP: <reason>'"
echo "       OR: EGOS_REGISTRY_PARITY_SKIP='<reason>' git commit ..."
echo ""
echo "  ADR: $ADR"
exit 1
