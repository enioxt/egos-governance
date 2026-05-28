# Strategy — egos-governance

> **Tese:** Governance OS for Agentic Software Delivery
> **Maintained by:** [@enioxt](https://github.com/enioxt) — best-effort, open to contributors
> **Funding:** [GitHub Sponsors](https://github.com/sponsors/enioxt) (when available)

---

## Kill Criteria

We are honest about success metrics. If this doesn't get traction, we will archive it without guilt.

| Checkpoint | Minimum threshold | Decision |
|-----------|-----------------|---------|
| Day 30 | ≥50 stars OR ≥3 external issues | Continue |
| Day 60 | ≥100 stars OR ≥1 external PR | Continue |
| Day 90 | ≥300 stars OR ≥3 external PRs | **Strong signal — grow** |
| Day 90 (fail) | <50 stars AND 0 external PRs | Archive without guilt |

"Archive without guilt" means: mark as archived, keep accessible, write a post-mortem, move on. The knowledge is preserved.

---

## Versioning

- `main` = stable, CI passing
- SemVer: `MAJOR.MINOR.PATCH`
- `packages/*` use `0.x.y-alpha` until 90 days + 5+ issues closed

---

## Scope (What This Is)

- Governance patterns for AI-agent software delivery
- Pre-commit pipeline for agentic repos
- Meta-cognitive skills for Claude Code / AI assistants
- MCP servers for governance automation
- Real incident post-mortems

## Not in Scope (What This Isn't)

- EPOS (personal interview system — private to EGOS kernel)
- Intelink (police intelligence tool — sensitive)
- Central EGOS (multi-tenant SaaS platform — commercial)
- G Peças / client-specific code
- Any personally identifiable data

---

## Contributor Policy

- New patterns: must have incident story OR reproducible problem statement
- PRs: CI must pass (typecheck + tests + starter-smoke + security)
- Response SLA: best-effort, typically 7 days
- Breaking changes: discussed in issue first, minor bump

---

*Last updated: 2026-05-28*
