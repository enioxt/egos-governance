# Vocabulary — EGOS Governance

Some terms in this repository come from the EGOS operational language.
This glossary maps them to generic equivalents so the content is accessible to everyone.

---

| EGOS term | Generic equivalent | Description |
|-----------|-------------------|-------------|
| **Banda Cognitiva** | Hierarchical Review | 4-role deliberation sequence: Critic → Supporter → Questioner → Conductor. Used before structural decisions. |
| **Council Protocol** | Multi-LLM Review Panel | 3+ independent LLMs review critical decisions (architecture, security, pricing). Each model sees the problem fresh. |
| **Opus Mode** | Deep Work Cognitive OS | Operational mode that enforces anti-hallucination discipline: every claim is classified as CONFIRMED / INFERRED / HYPOTHESIS / PROPOSED ACTION. |
| **Tutor Mode** | Maximum-Detail Explanation | Agent behavior mode for teaching: maximum depth, no infantilizing, Socratic method. |
| **Single Pursuit** | WIP Limit | Maximum 2 strategic decisions in-flight simultaneously. More than 2 = context switching cost exceeds progress. |
| **SSOT** | Single Source of Truth | One canonical file per domain. No competing files. Pre-commit enforces. |
| **Frozen Zone** | Protected File | Files that cannot be edited without explicit approval + proof-of-work (e.g., core pre-commit chain). |
| **Sprint Protocol** | Sprint Methodology | Structured sprints with explicit WIP limits, wave-by-wave execution, and evidence-first commits. |
| **Capability Registry** | Feature Registry | Central manifest of all implemented capabilities with maturity grade and `VERIFIED_AT` evidence per entry. |
| **Gem Hunter** | Discovery Agent | Background agent that scans for underused or undiscovered capabilities in the codebase. |
| **HARVEST.md** | Learning Log | Appended by post-commit hooks: captures `LEARNING: <insight>` from commit bodies into persistent log. |
| **Karpathy Doctrine** | Simplicity-First Principles | Five rules inspired by Andrej Karpathy: state assumptions first, minimum code, touch only what you must, define success verifiably, fail visibly. |
| **Premortem** | Pre-failure Analysis | Before executing a decision, assume it already failed 6 months later and work backwards to identify why. |
| **Dual Pursuit** | Two-Track Strategy | Running two independent value tracks simultaneously (e.g., Intelink institutional + Central EGOS commercial). |
| **Evidence-First** | Proof-Required | No claim in durable docs without automated test, metric, manifest entry, or reproducible dry-run. |

---

*Terms in `docs/` files often use the EGOS vocabulary. This glossary is the translation layer.*
