# EGOS Governance Starter

> Bootstrap your agentic repo with battle-tested governance in 5 minutes.

---

## What you get

- **10 pre-commit gates** — secrets detection, typecheck, doc-drift, frozen zones, registry parity, swarm commit policy
- **5 automation scripts** — `safe-push.sh`, `runtime-smoke.ts`, `task-reconciliation.ts`, `codex-doctor.sh`, `check-registry-parity.sh`
- **5 Claude Code slash commands** — `/banda`, `/premortem`, `/snapshot`, `/skillify`, `/duo`
- **5 agent skills** — preflight critique, Karpathy guidelines, citation verifier, relationship mapper, observability agent

---

## Quickstart

```bash
# 1. Copy this directory into your project
cp -r starter/ my-project/
cd my-project

# 2. Install dependencies
bun install

# 3. Install pre-commit hooks
bunx husky install

# 4. Verify everything works
bash .husky/pre-commit

# 5. Test the runtime smoke check
bun scripts/runtime-smoke.ts
```

---

## Pre-commit gates

The `.husky/pre-commit` script runs these checks on every commit:

| Gate | What it checks |
|------|---------------|
| Secrets scan | gitleaks — blocks if secrets detected |
| TypeScript | `bun run typecheck` — blocks on type errors |
| Doc drift | Manifest claims vs actual code |
| Frozen zones | Protected files that need explicit approval to edit |
| Registry parity | Capability registry entries have evidence |
| Swarm commit | Prevents `git add -A` from background agents |
| Force push guard | Blocks force push to main/master |
| TASKS.md commit | Warns if TASKS.md edited but not staged |

---

## Slash commands

Place the `.claude/commands/` directory at your repo root. They're invoked via `/command-name` in Claude Code.

| Command | What it does |
|---------|-------------|
| `/banda` | Hierarchical review before big decisions (Critic→Supporter→Questioner→Conductor) |
| `/premortem` | Assume the decision already failed 6 months later. Find out why. |
| `/snapshot` | Capture current session state to a handoff document |
| `/skillify` | Convert a repeated pattern into a reusable skill |
| `/duo` | Run a task with parallel Claude + Codex verification |

---

## Agent skills

TypeScript skills in `agents/skills/` that can be called from your agent runtime:

| Skill | What it does |
|-------|-------------|
| `preflight-critique.ts` | Runs a pre-flight checklist before executing an agent plan |
| `karpathy-guidelines.ts` | Checks a proposed change against Karpathy's simplicity principles |
| `citation-verifier.ts` | Verifies that named claims (files, functions, APIs) actually exist |
| `relationship-mapper.ts` | Maps entity relationships for knowledge graph use cases |
| `observability-agent.ts` | Collects system metrics and generates health reports |

---

## Adapting to your project

1. **Replace path references**: `$(git rev-parse --show-toplevel)` in scripts auto-detects your repo root
2. **Edit health endpoints** in `agents/skills/observability-agent.ts` — replace the example URLs with your services
3. **Customize pre-commit gates** — comment out gates you don't need yet (each gate is clearly delimited)
4. **Add your own slash commands** to `.claude/commands/` using the same markdown format

---

*Part of [egos-governance](https://github.com/enioxt/egos-governance) — Governance OS for Agentic Software Delivery.*
