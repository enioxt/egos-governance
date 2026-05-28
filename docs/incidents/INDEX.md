# Incident-Driven Governance

> Every rule in this repository was forged by a real incident. This is the index.
>
> **Why we publish these:** LangChain won't tell you their post-mortems. Big tech won't either.
> These are the mistakes we made operating AI agents in production — and the rules that came from them.
> Our governance is not theoretical. It's scar tissue.

---

| Incident | Rule Created | Category | Severity |
|----------|-------------|----------|----------|
| [INC-001](INC-001-force-push.md) | Never force-push main | Git Safety | 🔴 Critical |
| [INC-002](INC-002-git-swarm.md) | Never `git add -A` in background agents | Agent Safety | 🔴 Critical |
| [INC-005](INC-005-external-llm-phantom.md) | External LLM output = UNVERIFIED until cross-checked | AI Reliability | 🟠 High |
| [INC-006](INC-006-subagent-phantom.md) | Subagent reports = synthesis, not evidence | Agent Reliability | 🟠 High |
| [INC-DB-001](INC-DB-001-silent-schema-mismatch.md) | Schema-first writes, always smoke-test with real key | Data Integrity | 🔴 Critical |

---

*Each incident file follows the format: what happened → root cause → rule created → result.*
