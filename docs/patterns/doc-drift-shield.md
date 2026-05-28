# EGOS Doc-Drift Shield

> **Version:** 1.0.0 | **Created:** 2026-04-07 | **Status:** Active
> **Purpose:** Prevent README/documentation from drifting out of sync with code.
> **Scope:** All EGOS ecosystem repositories.

## Problem

AI-assisted development produces code at a velocity that outpaces manual documentation updates. By the time a README says "15 PII patterns", the code may have 17, or 12. By the time a README says "77M Neo4j nodes", the graph has grown to 83.7M. These drifts erode trust with partners, investors, and future contributors.

**Real example (discovered 2026-04-07 during EGOS diagnostic):**
- Carteira Livre README claimed 54 pages → actual: **134** (+148% drift)
- Carteira Livre README claimed 68 APIs → actual: **254** (+273% drift)
- BR-ACC README claimed 77M nodes → actual: **83,773,683** (+8.8% drift)
- CV claimed "VPS Contabo" → actual: **Hetzner VPS** (categorical drift)

This is not a documentation problem. It is a **contract verification problem**.

## Solution: 4-layer Shield

The EGOS Doc-Drift Shield treats every quantitative claim in any README as a **reproducible contract** with a verification command. Each layer provides independent protection:

```
┌────────────────────────────────────────────────────────────┐
│ L4. CCR Weekly Report ← structural patterns, LLM proposals │
├────────────────────────────────────────────────────────────┤
│ L3. VPS Sentinel Agent ← daily scan, auto-patch, Telegram  │
├────────────────────────────────────────────────────────────┤
│ L2. Pre-commit Hook ← block drift locally, pair staging    │
├────────────────────────────────────────────────────────────┤
│ L1. Contract Manifest (.egos-manifest.yaml) ← source truth │
└────────────────────────────────────────────────────────────┘
```

## Layer 1 — Contract Manifest

Each repository has one `.egos-manifest.yaml` at its root. This file declares every quantitative claim in the README with a reproducible shell command.

### Schema

```yaml
# .egos-manifest.yaml
schema_version: "1.0.0"
repo: "<repo-name>"
updated_at: "YYYY-MM-DD"
updated_by: "<author>"

# README/documentation claims declared as verifiable contracts
claims:
  - id: <unique_snake_case_id>
    description: <one-line human description>
    readme_location: <file:line or file:heading anchor>
    command: <shell command producing a single numeric/string value>
    tolerance: <exact | ±N% | ±N>
    last_value: <value at time of last verification>
    last_verified_at: <YYYY-MM-DD>
    category: <commits|pages|apis|tests|loc|entities|integrations|domains|custom>

# Domains that must be publicly reachable
domains:
  - url: <https URL>
    expected_status: <200|307|308>
    checked_at: <YYYY-MM-DD>

# External API endpoints that must respond
endpoints:
  - name: <name>
    url: <url>
    method: <GET|POST>
    expected_status: <code>
    expected_contains: <substring in body>
```

### Tolerance types

| Tolerance | Meaning | Use for |
|-----------|---------|---------|
| `exact` | Must match `last_value` exactly | Commit counts, static file counts |
| `±N%` | Value within N percent of last_value | LOC, line-based metrics |
| `±N` | Value within N absolute of last_value | Small discrete metrics |
| `min:N` | Value must be at least N | Growing metrics (nodes, commits) |
| `max:N` | Value must be at most N | Error budgets, dead code |

### Example (Carteira Livre)

```yaml
schema_version: "1.0.0"
repo: "carteira-livre"
updated_at: "2026-04-07"
claims:
  - id: total_commits
    description: "Total commits to main branch"
    readme_location: "README.md:L7 badge"
    command: "git log --pretty=format:'%h' main | wc -l | tr -d ' '"
    tolerance: "min:1690"
    last_value: "1690"
    last_verified_at: "2026-04-07"
    category: "commits"
  - id: nextjs_pages
    description: "Next.js page.tsx files under app/"
    readme_location: "README.md:L8 badge"
    command: "find app/ -name 'page.tsx' 2>/dev/null | wc -l | tr -d ' '"
    tolerance: "±5"
    last_value: "134"
    last_verified_at: "2026-04-07"
    category: "pages"
```

## Layer 2 — Pre-commit Hook

When a commit modifies code files, the hook runs the verifier. If any claim drifts beyond tolerance, the commit is blocked.

### Pairing rule (Palmieri 2026)

If the staged diff includes source files (`*.ts`, `*.tsx`, `*.py`) and touches code that would affect any declared claim, the staged diff MUST also include either:
- An update to `README.md` with the new value
- An update to `.egos-manifest.yaml` with the new `last_value`

Otherwise the hook blocks with:

```
❌ DOC-DRIFT BLOCKED: <claim_id> drifted from <last> to <current> (tolerance: ±<N>).
   Fix: either update README.md OR update .egos-manifest.yaml last_value and re-stage.
   Override: add "DOC-DRIFT-ACCEPTED: <reason>" to commit body.
```

### Location

`.husky/doc-drift-check.sh` — sourced from the main `.husky/pre-commit` chain.

### Override mechanism

Emergency bypass via commit message body containing:
```
DOC-DRIFT-ACCEPTED: <reason why drift is intentional>
```

All overrides are logged to `docs/jobs/doc-drift-overrides.log` for weekly review.

## Layer 3 — VPS Sentinel Agent

`agents/agents/doc-drift-sentinel.ts` runs daily at 03:00 BRT via cron on Hetzner VPS.

### Workflow

```
For each repo in workspace:
  1. Read .egos-manifest.yaml
  2. For each claim: run command, compare to last_value
  3. If drift detected:
     a. Update .egos-manifest.yaml (new last_value + last_verified_at)
     b. Generate unified diff of suggested README changes
     c. Create branch drift-YYYY-MM-DD
     d. Commit changes to that branch
     e. Open GitHub issue with the diff (via gh CLI)
     f. Send Telegram alert to @egosin_bot
  4. Write report to docs/jobs/YYYY-MM-DD-doc-drift.md
  5. Exit 0 (never blocks anything)
```

### Cron entry

```cron
0 3 * * * cd /opt/egos && bun agents/agents/doc-drift-sentinel.ts --exec >> /var/log/doc-drift.log 2>&1
```

### Safety

- Never pushes to main directly — always a branch
- Never runs if manifest is missing (just logs a warning)
- Never overwrites human changes — only adjusts last_value
- Rate-limited: max 1 GitHub issue per claim per 7 days

## Layer 4 — CCR Weekly Report + Global Rules

### Part A: Claude scheduled job module

The existing **Governance Drift Sentinel** CCR job (daily 0h17 BRT) gains a `doc-drift-analyzer` module that:

1. Reads `docs/jobs/*-doc-drift.md` from the last 7 days
2. Identifies patterns: which repos drift most? which claims drift every day?
3. Proposes structural fixes: "remove claim X because it drifts every day, replace with stable metric"
4. Generates a proposed commit on branch `claude/doc-drift-structural-YYYY-WW`
5. Opens PR for human review

### Part B: Global hard rules

Added to `~/.claude/CLAUDE.md §27 Doc-Drift Rules`:

1. **Declaration rule:** Every quantitative claim in a README MUST have a corresponding entry in `.egos-manifest.yaml` of the same repo.
2. **Pairing rule:** Any commit that affects an existing claim MUST update `last_value` in the same commit.
3. **New feature rule:** Every feature that introduces a new quantitative claim MUST declare it in the manifest BEFORE the README mentions it.
4. **Pre-commit rule:** No commit passes the pre-commit gate if claim drift exceeds tolerance without explicit override.
5. **Override rule:** Overrides require `DOC-DRIFT-ACCEPTED: <reason>` in the commit body.
6. **Staleness rule:** CI fails if `.egos-manifest.yaml` is older than 30 days in a repo that had commits in the last 30 days.
7. **Badge rule:** README badges with numeric values MUST link to the corresponding manifest entry via anchor comment.

## Tooling

| Tool | Path | Purpose |
|------|------|---------|
| Verifier | `egos/agents/agents/doc-drift-verifier.ts` | Run commands, compare to tolerance |
| Sentinel | `egos/agents/agents/doc-drift-sentinel.ts` | Daily autonomous scan |
| Pre-commit | `egos/.husky/doc-drift-check.sh` | Block drift at commit time |
| Schema | `egos/schemas/egos-manifest.schema.json` | Validate manifest format |
| Doc | `egos/docs/DOC_DRIFT_SHIELD.md` | This document |

## Rollout plan

### Phase 1 (2026-04-07) — Foundation ← YOU ARE HERE
- [x] Write DOC_DRIFT_SHIELD.md (this doc)
- [ ] Create `.egos-manifest.yaml` in 3 pilot repos: egos, br-acc, carteira-livre
- [ ] Add CLAUDE.md §27 rules
- [ ] Write doc-drift-verifier.ts
- [ ] Wire pre-commit hook
- [ ] Write doc-drift-sentinel.ts
- [ ] Deploy sentinel cron to VPS
- [ ] Extend CCR Governance Drift Sentinel job

### Phase 2 (+7 days) — Expansion
- [ ] Roll out manifest to: 852, forja, egos-lab, egos-inteligencia
- [ ] Auto-generate initial manifests from existing READMEs
- [ ] Dashboard in your governance HQ showing drift status across all repos

### Phase 3 (+30 days) — Intelligence
- [ ] LLM-powered claim extraction from unstructured README text
- [ ] Automatic "suggested claim" detection in new PRs
- [ ] Integration with Gem Hunter for third-party claim verification

## Related work (state-of-the-art 2026)

| Project | URL | Key idea we borrowed |
|---------|-----|----------------------|
| doc-drift (jbrockSTL) | github.com/jbrockSTL/doc-drift | LLM-powered PR checks for stale docs |
| DeepDocs | medium.com/@deepdocs | Auto-sync documentation with code changes |
| Two git hooks (Palmieri) | fedestyla medium article | Pairing hook: stage code + docs together |
| Specmatic | specmatic.io | Contract-driven development with executable specs |
| specfact-cli | github.com/nold-ai/specfact-cli | Keep intent, specs, tests, code in sync |
| docsync (suhteevah) | github.com/suhteevah/docsync | Tree-sitter powered local drift detection |

## Philosophy

Documentation drift is not solved by discipline. It is solved by **structural enforcement** plus **continuous verification**. The EGOS Doc-Drift Shield applies both principles:

- **Structural:** claims are machine-readable contracts, not prose
- **Continuous:** layers 2 and 3 run every commit + every day

When the user asks "how do you prove 83.7M nodes?", the answer is always the same:

```bash
cat .egos-manifest.yaml | grep -A2 neo4j_nodes
# then run the command field and see the result yourself
```

That is non-negotiable reproducibility.

---

*Companion docs: [`MASTER_INDEX.md`](MASTER_INDEX.md), [`SSOT_REGISTRY.md`](../modules/SSOT_REGISTRY.md), [`CAPABILITY_REGISTRY.md`](../CAPABILITY_REGISTRY.md)*
