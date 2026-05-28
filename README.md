# egos-governance

> **Governance OS for Agentic Software Delivery**

Battle-tested patterns, pre-commit pipeline, and meta-cognitive skills for teams running AI agents in production.

[![CI](https://github.com/enioxt/egos-governance/actions/workflows/ci.yml/badge.svg)](https://github.com/enioxt/egos-governance/actions/workflows/ci.yml)
[![Security](https://github.com/enioxt/egos-governance/actions/workflows/security.yml/badge.svg)](https://github.com/enioxt/egos-governance/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Why This Exists

Every rule in this repository was forged by a real incident.

We run AI agents in production — multi-model pipelines, parallel Claude/Codex workers, MCP servers, WhatsApp integrations. We made mistakes. We documented them. We built systems to prevent them from happening again.

This is not theoretical best-practices. It's **operational scar tissue** — and it's yours to use.

---

## 5 Things You Won't Find Elsewhere

### 1. Documentation Drift Shield
4-layer enforcement that prevents your README from lying about your code: contract manifest (YAML), pre-commit hook (blocking), daily VPS sentinel cron, weekly LLM analysis pass.

### 2. Capability Promotion Gates
Objective maturity gates that move capabilities from `experimental → candidate → alpha → beta → rc → production`. No more "we'll productionize it later." Each promotion requires passing criteria.

### 3. Swarm Commit Policy
Race condition prevention for parallel agent workloads. Solved after a production incident where two background agents committed conflicting state to the same branch simultaneously.

### 4. Quorum Protocol
Critical decisions (architecture, security, pricing) require review from 3+ independent LLMs before execution. Not because any one model is wrong — because they're wrong in different ways.

### 5. Incident-Driven Governance
`docs/incidents/` contains anonymized post-mortems of real production failures, each with the rule it created. LangChain won't publish their post-mortems. We will.

---

## Structure

```
egos-governance/
├── docs/
│   ├── patterns/     ← Reusable governance patterns
│   ├── practices/    ← Operating modes (Opus Mode, Banda Cognitiva, Council)
│   ├── standards/    ← Quality frameworks (MCP rubric, Engineering 2026)
│   └── incidents/    ← ⭐ Real post-mortems → rules (the flagship)
├── starter/          ← Clone this to bootstrap your own governed repo
│   ├── .husky/       ← 10 pre-commit gates
│   ├── scripts/      ← Governance automation
│   ├── .claude/      ← Meta-cognitive slash commands
│   └── agents/       ← Background agent skills
└── packages/         ← MCP servers (alpha)
    ├── mcp-eval-runner/
    ├── mcp-governance/
    └── mcp-skills-registry/
```

---

## Quickstart (5 minutes)

```bash
# Clone the starter template into your project
git clone https://github.com/enioxt/egos-governance my-project
cd my-project/starter

# Install dependencies
bun install   # or: npm install

# Install pre-commit hooks
bunx husky install

# Verify everything works
bash .husky/pre-commit

# Test the runtime smoke check
bun scripts/runtime-smoke.ts
```

You now have:
- ✅ 10 pre-commit gates (secrets, typecheck, doc-drift, frozen zones, registry parity...)
- ✅ `safe-push.sh` preventing force-push accidents
- ✅ `task-reconciliation.ts` keeping TASKS.md honest
- ✅ Meta-cognitive slash commands for Claude Code (`/banda`, `/premortem`, `/council`...)

---

## Patterns at a Glance

| Pattern | What it solves | File |
|---------|---------------|------|
| Doc Drift Shield | README diverging from reality | [docs/patterns/doc-drift-shield.md](docs/patterns/doc-drift-shield.md) |
| Capability Promotion | Premature "production" claims | [docs/patterns/capability-promotion-rules.md](docs/patterns/capability-promotion-rules.md) |
| Swarm Commit Policy | Parallel agent git conflicts | [docs/patterns/swarm-commit-policy.md](docs/patterns/swarm-commit-policy.md) |
| Quorum Protocol | Single-LLM architectural hallucinations | [docs/patterns/quorum-protocol.md](docs/patterns/quorum-protocol.md) |
| Multi-LLM Orchestration | Cost + quota-aware model routing | [docs/patterns/multi-llm-orchestration.md](docs/patterns/multi-llm-orchestration.md) |

---

## Practices (Operating Modes)

| Practice | What it is | File |
|----------|-----------|------|
| Opus Mode | Cognitive OS for deep sessions — anti-hallucination + classification system | [docs/practices/opus-mode.md](docs/practices/opus-mode.md) |
| Banda Cognitiva | Hierarchical multi-role review before big decisions | [docs/practices/banda-cognitiva.md](docs/practices/banda-cognitiva.md) |
| Council Protocol | Multi-LLM review panel for critical decisions | [docs/practices/council-protocol.md](docs/practices/council-protocol.md) |
| Karpathy Doctrine | Minimum code, maximum understanding — applied | [docs/practices/karpathy-doctrine.md](docs/practices/karpathy-doctrine.md) |

---

## MCP Servers (Alpha)

> ⚠️ **EXPERIMENTAL — DO NOT USE IN PRODUCTION YET**
> These are `0.1.0-alpha`. APIs will change. No SLA.

| Package | What it does |
|---------|-------------|
| `@egos-public/mcp-eval-runner` | Behavioral evaluation harness for AI agents and MCPs |
| `@egos-public/mcp-governance` | Governance rules, SSOT drift detection, policy enforcement as MCP tools |
| `@egos-public/mcp-skills-registry` | Discovery and serving of agent skills, slash commands, and personas |

```bash
# When stable (not yet)
# npm install @egos-public/mcp-eval-runner
```

---

## Vocabulary

Some names in this repo come from the EGOS operational vocabulary. Quick reference:

| EGOS term | Generic meaning |
|-----------|----------------|
| Banda Cognitiva | Hierarchical Review (4 roles: Critic → Supporter → Questioner → Conductor) |
| Council Protocol | Multi-LLM Review Panel |
| Opus Mode | Deep Work Cognitive OS |
| Tutor Mode | Maximum-detail explanation mode |
| Single Pursuit | WIP limit enforcement (max 2 in-flight decisions) |
| EPOS | Personal Operating System interview (private, not in this repo) |

Full glossary: [VOCABULARY.md](VOCABULARY.md)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). TL;DR:

- All PRs require CI passing (typecheck + test + starter-smoke + security scan)
- New patterns require an incident story OR a proof-of-problem
- No speculative abstractions — solve what you have, not what you might have

---

## License

MIT — see [LICENSE](LICENSE).

Exception: `packages/guard-brasil*` (not in this repo) is separately licensed.

---

## Status

| Component | Status |
|-----------|--------|
| `docs/patterns/` | 🟡 In progress — 6 patterns being extracted |
| `docs/incidents/` | ✅ 5 incidents published |
| `starter/` | 🟡 In progress — pre-commit + scripts |
| `packages/` | 🔴 Alpha — not ready for production |
| MCP npm publish | ⏳ After 90 days stability |

---

*Built in production, documented honestly. — [@enioxt](https://github.com/enioxt)*
