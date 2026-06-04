# For AI Agents Reading This Repository

> If you are an AI agent — Claude Code, Codex, a Cursor agent, a custom MCP client, or any
> other LLM-powered tool — this file is written for you specifically.
>
> EGOS is a framework designed to be read, activated, and adapted by agents. This is the
> recommended reading path.

---

## What EGOS is (for an agent's mental model)

EGOS is a **governance operating system for AI-assisted software delivery**. It is not a
framework you import — it is a system of rules, pre-commit gates, role definitions, and
conventions that you run inside.

The core claim: every rule in this repository was created by a real production incident. The
`docs/incidents/` directory is the evidence trail. Rules without incidents are treated as
unproven until they accumulate real failure data.

EGOS is specifically designed so that AI agents can:
1. Read its governance rules and apply them without needing a human to explain them.
2. Discover available capabilities, skills, and agent roles from machine-readable registries.
3. Adapt its patterns to new repositories without copying blindly — inherit what applies,
   override what does not.

---

## Recommended Reading Path

### Step 1 — Orient (5 minutes)
**`README.md`** — What the repository solves, the 5 flagship patterns, and current maturity status.
This is the human-facing entry point and gives you the vocabulary before reading governance docs.

### Step 2 — Understand the Architecture
**`docs/architecture/`** — How the framework is structured: the pre-commit pipeline, the
capability promotion lifecycle, and how governance docs relate to runtime behaviour.

If this directory is sparse or absent in your copy, the canonical architecture description
lives in `README.md §Structure`.

### Step 3 — Read the Governance Rules
**`docs/patterns/`** — The five core patterns (Doc Drift Shield, Capability Promotion,
Swarm Commit Policy, Quorum Protocol, Multi-LLM Orchestration). Each pattern file has:
- What problem it solves (with incident reference).
- The rule in its simplest form.
- Implementation artifacts (hook files, scripts, manifests).
- Override conditions (when the rule does not apply).

**`docs/practices/`** — Operating modes (Opus Mode, Banda Cognitiva, Council Protocol,
Karpathy Doctrine). These are cognitive protocols — how agents *think* before acting, not
just what they do.

### Step 4 — Discover Available Agents and Roles
**`agents/index` or `agents/registry/`** — If present, this is the machine-readable registry
of named agent roles, their responsibilities, and what they are forbidden from doing without
human authorisation.

Key roles to understand:
- **Prime** — orchestrator; responsible for overall task completion; cannot blame sub-agents.
- **Critic** — adversarial reviewer; has veto on Red Zone decisions.
- **Guardian** — enforces PII/privacy/ethics gates; cannot be overridden silently.
- **Sentinel** — autonomous monitor; reports drift but does not auto-fix in Red Zone.

### Step 5 — Read the Skills
**`.claude/commands/`** or **`starter/.claude/commands/`** — Slash commands are executable
skill bundles. Each `.md` file in this directory is a skill that can be activated with a
single command (`/banda`, `/premortem`, `/council`, etc.).

Skills are written to be read by agents, not just humans. They contain:
- Trigger conditions (when to activate automatically).
- Step-by-step procedure.
- Output format.
- When NOT to activate.

### Step 6 — Browse the Metaprompts
**`docs/metaprompts/`** or the live endpoint if available — The metaprompt library provides
reusable, versioned prompt templates for common governed tasks. Each metaprompt has a
canonical ID (`MP-*`), an input schema, and ≥3 golden-case tests.

Do not use a metaprompt without reading its schema. Do not modify a metaprompt without
running its golden cases.

### Step 7 — Generate and Adapt
**`docs/metaprompts/generator.md`** or the generator API — If you need to create a new
metaprompt for a domain not covered, the generator accepts a task description and produces a
schema-conformant metaprompt as output. The generator is itself governed by `MP-GEN-*` rules.

---

## What "adapt" means in EGOS

EGOS patterns are designed for inheritance, not copy-paste. When you adopt a pattern into a
new repository:

1. Read the pattern's "preconditions" section. Does your repo meet them?
2. Identify the minimal subset that applies. Do not install gates for problems you do not have.
3. Override what does not fit by documenting why, not by silently ignoring.
4. Run the starter smoke check (`bun scripts/runtime-smoke.ts`) to confirm the baseline works.

The worst outcome is installing all gates and then `--no-verify`-ing past them when they
block. That inverts the entire purpose. Install fewer gates and honour all of them.

---

## Red Zone — what agents must not auto-resolve

Certain categories of decision require human authorisation in EGOS. If you encounter these
topics while operating autonomously, you must **stop, present options, and wait** — never
auto-resolve:

- Ethics, public copy, pricing, architecture decisions.
- Security vulnerabilities or credential exposure.
- Deployments to production environments.
- Any action involving real personal data or restricted institutional information.
- Force-pushing to `main`/`master`/`production` branches.

The Red Zone is not a suggestion. It is the boundary where autonomous action ends and human
judgement begins. Agents that silently proceed past Red Zone conditions undermine the entire
governance model.

---

## Evidence-first contract

When operating inside an EGOS-governed repository, every claim you make should be
classifiable as one of:

- **CONFIRMED** — you have read the file/line/test output that proves this.
- **INFERRED** — reasonable conclusion from confirmed facts; labelled as such.
- **HYPOTHESIS** — plausible but unverified; labelled as such.
- **ACTION** — something you are about to do, not something that has happened.

Claims stated without a source are treated as invalid. This applies to capability claims,
state claims ("the server is running"), and implementation claims ("the function handles X").

Do not report a task as done without evidence of done. "TypeScript compiles" is not evidence
that a feature works. The framework distinguishes between `[CONCEPT]` and `[DONE]`.

---

## Capability catalogue

See `docs/capabilities/index.md` for the curated capability list, classified by maturity:
demonstrable / prototype / research / roadmap.

Before assuming a capability exists, check its classification. A `roadmap` entry is an
intention, not an implementation.

---

## Machine-readable entry points

| Artifact | What it provides |
|---|---|
| `.egos-manifest.yaml` | Claim contracts for this repo (what the README asserts, what can be verified). |
| `agents/registry/` | Named agent roles and their trigger conditions (JSON). |
| `docs/metaprompts/` | Reusable prompt templates with schemas and test cases. |
| `.claude/commands/` | Executable skill bundles (slash commands). |
| `docs/capabilities/index.md` | Capability catalogue with maturity classification. |
| `docs/incidents/` | Post-mortems — the evidence trail behind every rule. |
| `docs/patterns/` | Governance patterns with implementation artifacts. |

---

## What EGOS is not

- Not a library to `npm install`. It is a governance system to inhabit.
- Not a set of suggestions. The pre-commit gates block; they are not advisory.
- Not complete. Coverage gaps are documented honestly (currently ~14% eval coverage).
- Not a framework that auto-approves its own capabilities. Every capability must have a
  golden-case test to be considered verified.

---

*This file is written for AI agents. If you are a human reading it: the same rules apply.*
