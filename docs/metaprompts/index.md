# EGOS Metaprompts — Index

> **Version:** 1.0.0 · **Updated:** 2026-06-03
> **License:** Open — copy, adapt, share. See the anti-copy-paste note at the bottom.

---

## What is a Metaprompt?

A **metaprompt** is a structured template that tells an AI agent (or an LLM-powered tool)
_how to do a specific type of work_ — not just _what to do_. It encodes:

- The **purpose** of the operation (why this pattern exists).
- The **expected inputs** (what the agent needs before starting).
- The **expected outputs** (what "done" looks like, with evidence requirements).
- **Limits and Red Zones** (what the agent must never do autonomously).
- At least one **worked example** so the pattern can be reproduced.

In the EGOS framework, every metaprompt follows the same anatomy:

```
## Purpose
## When to Use
## Expected Input
## Expected Output
## Limits
## Acceptance Criteria
## Red Zone
## Anti-Copy-Paste Note
## Example(s)
```

This consistency makes metaprompts composable: you can chain them (e.g., run
`MP-AUDIT-001` before running `MP-HANDOFF-001`) without negotiating format.

---

## What is the Metaprompt Generator?

EGOS ships a lightweight REST endpoint that generates structured prompts on-demand:

```
GET  /api/v1/meta-prompts          → list available templates
POST /api/v1/meta-prompts/generate → generate a prompt from a template
```

Six public templates are available: `task`, `review`, `research`, `inception`,
`premortem`, and `grok`. Each embeds the EGOS operating principles automatically so you
do not have to paste them manually. See [`generator.md`](./generator.md) for full
details and examples.

---

## Metaprompts in this collection

### Agents

| ID | Name | Use it when… |
|----|------|--------------|
| [MP-AGENT-001](./MP-AGENT-001.md) | Agent Dispatch Prompt | Delegating work to a sub-agent with clear scope + acceptance criteria |
| [MP-AGENT-002](./MP-AGENT-002.md) | Agent Result Audit Prompt | Verifying sub-agent output before acting on it (anti-phantom check) |

### Skills / Workflows

| ID | Name | Use it when… |
|----|------|--------------|
| [MP-SKILL-001](./MP-SKILL-001.md) | Skill Design Prompt | Turning a repeatable workflow into a permanent, reusable skill |

### Pipeline

| ID | Name | Use it when… |
|----|------|--------------|
| [MP-PIPELINE-001](./MP-PIPELINE-001.md) | Event Pipeline Design Prompt | Designing typed event pipelines between agents with fail-closed gates |

### Security

| ID | Name | Use it when… |
|----|------|--------------|
| [MP-SEC-001](./MP-SEC-001.md) | Security Review Prompt | Reviewing API routes, migrations, auth config before merge |
| [MP-SEC-002](./MP-SEC-002.md) | Prompt Injection Defense Prompt | Hardening any endpoint that forwards user input to an LLM |

### Privacy / Compliance

| ID | Name | Use it when… |
|----|------|--------------|
| [MP-LGPD-001](./MP-LGPD-001.md) | Privacy Compliance Prompt | Auditing a feature that collects, stores, or processes personal data |

### QA / Testing

| ID | Name | Use it when… |
|----|------|--------------|
| [MP-QA-001](./MP-QA-001.md) | Test Case Generation Prompt | Generating golden-case test suites from a spec |

### Code Review

| ID | Name | Use it when… |
|----|------|--------------|
| [MP-REVIEW-001](./MP-REVIEW-001.md) | Architecture Decision Review Prompt | Reviewing irreversible architectural decisions before locking them |

### Research

| ID | Name | Use it when… |
|----|------|--------------|
| [MP-RESEARCH-001](./MP-RESEARCH-001.md) | Market Intelligence Prompt | Investigating a market, competitor, or technology before a strategic decision |

### Handoffs

| ID | Name | Use it when… |
|----|------|--------------|
| [MP-HANDOFF-001](./MP-HANDOFF-001.md) | Handoff Generation Prompt | Closing a session and handing state to the next agent or session |

### Audit

| ID | Name | Use it when… |
|----|------|--------------|
| [MP-AUDIT-001](./MP-AUDIT-001.md) | Capability Audit Prompt | Verifying that a claimed capability has real tests and is not a stub |

---

## How to use these metaprompts

**Option A — Copy and paste directly.**
Open the `.md` file, copy the input schema from the "Expected Input" section, fill in
your values, and send the whole prompt to your LLM. Read the anti-copy-paste note
in each file first.

**Option B — Use the generator endpoint.**
For the six core templates (`task`, `review`, `research`, `inception`, `premortem`,
`grok`), you can generate a ready-to-use prompt via HTTP:

```bash
curl -X POST https://your-api-host/api/v1/meta-prompts/generate \
  -H "Content-Type: application/json" \
  -d '{"type":"review","task":"Add payment webhook handler","context":"Node 20 + Fastify"}'
```

See [`generator.md`](./generator.md) for the full API contract.

**Option C — Import the generator logic.**
If you want to host the generator yourself, copy the stateless `TEMPLATES` object from
the source file in the EGOS repository and adapt it to your framework. No database or
external service required.

---

## Anti-copy-paste principle

Every metaprompt in this collection contains a note that says: **adapt before using**.

That note is not boilerplate — it is the most important line. Metaprompts encode
_patterns_, not instructions for your specific codebase. Before applying any metaprompt:

1. Verify that every file path cited in the template exists in _your_ repo.
2. Replace EGOS-specific references (`your registry of agents`, `your task tracker`,
   `your governance rules`) with your actual equivalents.
3. Remove or adjust any section that does not apply to your environment.
4. Never copy secrets, tokens, private IPs, or personal data from examples.

A metaprompt applied blindly is worse than no metaprompt — it creates phantom
dependencies and false confidence.

---

## Naming convention

`MP-<CATEGORY>-<SEQ>` where category is one of:
`AGENT` · `SKILL` · `PIPELINE` · `SEC` · `LGPD` · `QA` · `REVIEW` · `RESEARCH` ·
`HANDOFF` · `AUDIT` · `DEVOPS` · `ITEM-INTAKE`

New metaprompts should follow this convention and include all mandatory sections.

---

*EGOS Framework · docs/metaprompts/ · open for use and adaptation*
