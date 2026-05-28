# Contributing to egos-governance

Thank you for your interest. This is a small, opinionated project. We keep contributions focused.

---

## What we accept

- **New governance patterns** — must have: incident story OR reproducible problem, before/after, rule created
- **Improvements to existing patterns** — clarifications, better examples, additional context
- **Starter improvements** — pre-commit checks, scripts, slash commands that are genuinely generic
- **Bug fixes** — CI, script errors, broken links
- **Incident post-mortems** — real production failures (anonymized) that led to a rule

## What we don't accept

- Theoretical best-practices without production evidence
- Client-specific or org-specific tooling
- Breaking changes to `starter/` without prior issue discussion
- Additions to `packages/` (alpha packages are closed to external contribution until 1.0)

---

## Process

1. Open an issue first for patterns or significant changes
2. Fork + create a branch
3. CI must pass: `bun run typecheck && bun test`
4. Starter smoke: `bash starter/.husky/pre-commit` must not error
5. Security scan: `bun run scan` must return 0 findings
6. PR description: include the problem statement and evidence

---

## Code Style

- TypeScript strict mode, no `any`
- Bun-first (not Node)
- Shell scripts: `set -euo pipefail`, no bash-isms if sh works
- Comments: only when WHY is non-obvious. Never document WHAT.

---

## Response SLA

Best-effort. Typically 7 days. This is maintained by one person as a side project.

---

*Thanks for building with governance in mind.*
