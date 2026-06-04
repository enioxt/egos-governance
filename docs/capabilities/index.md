# EGOS Capabilities — Curated Index

> **Classification key:** `demonstrable` — live, testable, evidence-confirmed |
> `prototype` — code exists, partial or hardening needed |
> `research` — design documented, not yet implemented |
> `roadmap` — intended future direction, not started.
>
> **Principle (evidence-first):** a capability that has no golden-case test or live proof is
> labelled honestly. "Demonstrable" means you can invoke it today and observe real output.

---

## Demonstrable

These capabilities are live or runnable. Each has a verifiable artifact (endpoint, test suite,
or live deployment).

### 1. Governed Document Intake (`item-intake`)

**What it does:** Converts unstructured inputs (photos, PDFs, scanned menus/spreadsheets) into
structured, human-reviewed output ready for a point-of-sale or catalogue system. A HITL
(human-in-the-loop) review pass happens before anything is committed — the AI can be wrong,
nothing writes itself.

**How it works:**
- Vision LLM extracts items and prices from the source image/PDF.
- A normalisation pass reconciles names, handles ambiguous entries, and flags uncertain items.
- Output is an XLSX + a markdown review sheet for human sign-off.

**Evidence:** Public endpoint at `egos.ia.br/tools`. Validated against a real 56-item cafeteria
menu: 56/56 items extracted, 55/56 prices correct — the one error (flagged, not silently
accepted) demonstrates the HITL gate working as designed.

**Public:** Yes — generic pattern, no domain-specific data exposed.

---

### 2. Guard Brasil — Brazilian PII Scanner (TypeScript)

**What it does:** Detects and masks Brazilian personal identifiers in text before it reaches
an LLM or is stored. Covers 16 PII patterns defined under LGPD, including CPF, CNPJ, RG, CNH,
SUS card, health data (LGPD art. 11), vehicle plates, court case numbers, and person names
detected via contextual labels.

**Key properties:**
- `full` and `partial` masking modes (banking-style "***.***.***-42" for confirmation UIs).
- ATRiAN ethical validation layer (rejects inputs that violate configured ethical constraints).
- SHA-256 receipt per scan — the caller can verify the scan happened without replaying PII.
- 20/20 tests passing; REST API live at `guard.egos.ia.br`.

**Evidence:** `packages/guard-brasil/src/guard.test.ts` (20 passing), REST endpoint smoke-testable.

**Public:** Yes — the PII detection patterns and masking logic are general-purpose LGPD tooling.

---

### 3. Governed Agent Orchestration (12-role runtime)

**What it does:** Provides a runtime for coordinating multiple AI agents under an explicit
governance structure. Agents operate in defined roles (Prime, Critic, Supporter, Questioner,
Conductor, Curator, Sentinel, Investigator, Guardian, and others). Hand-offs between roles are
logged. Certain classes of decision (ethics, security, architecture, public copy) are flagged
as "Red Zone" and require human authorisation before proceeding.

**Key properties:**
- Event bus with typed payloads — no fire-and-forget.
- Frozen zones: critical files cannot be modified without breaking pre-commit.
- Banda Cognitiva: a 4-role adversarial review triggered before important decisions.
- Council Protocol: routes critical decisions to 3+ independent LLMs for review.

**Evidence:** `agents/runtime/runner.ts` + `agents/runtime/event-bus.ts` (frozen, production),
`agents/registry/triggers.json` (12 registered roles).

**Public:** Yes — the patterns (role definitions, Red Zone protocol, Banda/Council) are the
publishable part. Operational configuration is internal.

---

### 4. Metaprompts + Generator (14 prompts, 57 golden cases)

**What it does:** A library of 14 reusable metaprompts for common governed AI tasks
(pre-mortem analysis, SSOT drift check, capability promotion review, etc.), a REST API that
serves them dynamically, and an eval harness with 57 golden cases that run on every CI push.

**Evidence:** `docs/metaprompts/MP-*.md` (14 files), `packages/eval-runner/evals/metaprompts/`
(57 cases, green), `apps/api/src/routes/meta-prompts.ts` (live endpoint).

**Public:** Yes — the metaprompts themselves and the generator pattern are open governance
artifacts.

---

### 5. Pre-commit Governance Pipeline (10 gates)

**What it does:** A pre-commit hook chain that runs before every commit and blocks on real
violations. Gates include: secret leak detection (Gitleaks regex + pattern blocklist),
TypeScript typecheck (zero implicit `any`), documentation drift check (manifest claims vs
code), frozen zone enforcement, registry parity (code vs SSOT index), and TASKS.md
auto-archive when size limit is exceeded.

**Evidence:** `.husky/pre-commit` (chain), `scripts/doc-drift-verifier.ts`, `scripts/task-reconciliation.ts`.
All gates tested against real incidents — each rule has a post-mortem entry.

**Public:** Yes — the entire starter template (hooks + scripts) is the flagship shareable artifact.

---

### 6. Behavioral Evaluation Harness (`eval-runner`)

**What it does:** Runs golden-case tests against AI agent capabilities and MCPs. A capability
without ≥3 passing golden cases is marked `unverified:` in the registry. Stubs that silently
return empty results are banned (`throw new Error('NOT_IMPLEMENTED')` is the required form).

**Current coverage:** ~14% of registered capabilities have eval coverage — this is an honest
number, reported as a gap, not hidden.

**Evidence:** `packages/eval-runner/`, 57 metaprompt cases green.

**Public:** Yes — the harness pattern and the honest coverage number are both publishable.

---

### 7. Doc-Drift Shield (4-layer documentation integrity)

**What it does:** Prevents documentation from diverging from the codebase it describes.
Layer 1: per-repo YAML manifest with claim contracts. Layer 2: pre-commit hook blocks if
claims are unverifiable. Layer 3: daily sentinel cron re-checks all known repos. Layer 4:
weekly LLM analysis pass flags semantic drift.

**Evidence:** `.egos-manifest.yaml` per repo, `scripts/doc-drift-verifier.ts`, `.github/workflows/governance-drift.yml`.

**Public:** Yes — the pattern and the manifest format are shareable.

---

## Prototype

Code exists, the core loop works, but completeness or hardening is partial.

| Capability | Status note | Public? |
|---|---|---|
| Multi-LLM Orchestration (cost-aware routing) | Operational for internal routing; quota logic tested. Public pattern documented. | Yes — pattern only |
| Capability Promotion Gates | Criteria documented and enforced in registry; automation partial. | Yes |
| SSOT Drift Detection (cross-repo) | Works for ~7 known repos; inventory incomplete (32 repos total). | Yes — pattern |
| MCP Governance Server | Serves governance rules and drift detection as MCP tools; alpha, API unstable. | Yes — alpha |
| MCP Eval-Runner Server | Exposes eval harness as MCP tools; alpha. | Yes — alpha |
| MCP Skills Registry Server | Discovers and serves agent skills; alpha. | Yes — alpha |
| Adaptive Atomic Retrieval (ARR) | Code exists (`packages/atomizer/`, `packages/search-engine/`); zero production consumers. | Yes |
| Governed investigation stack | End-to-end analysis pipeline with custody chain, provenance whitelist, and financial detectors — mature codebase, institutional/restricted use only. | No — restricted domain |
| Public graph OSINT platform | Open-source graph of public Brazilian data (procurement, corporate registry); live but on feature pause. | Yes — public data only |

---

## Research

Designed and documented; not yet implemented as running code.

| Capability | Description | Public? |
|---|---|---|
| Trust via Mathematics (blockchain anchoring) | Anchoring governance decisions to Bitcoin/OpenTimestamps + EAS attestations on an L2. Zero token, zero speculation — chain-of-custody for AI decisions. Design complete; implementation not started. | Yes — tesis only |
| Full eval coverage (all capabilities) | Expanding the 14% eval coverage to approach 100%. Gap acknowledged, roadmap exists. | Yes |
| Cross-case alert pipeline | Nightly cron correlating entities across multiple independent investigations; table exists, pipeline not wired. | No — restricted domain |

---

## Roadmap

Intended future direction; no significant code exists yet.

| Capability | Notes |
|---|---|
| Infrastructure-as-Code (Terraform/Helm) | Current infra is shell-script driven; IaC is acknowledged as a gap. |
| Content analytics / CTR tracking | No engagement tracking on published content yet. |
| Kyte API integration | Integration with third-party catalogue management API; deferred pending partner confirmation. |
| Expanded report types | Investigation report generator currently covers 1 of 6 planned report types. |

---

## What is intentionally not listed here

- Credentials, IPs, VPS addresses, internal paths.
- Valuation estimates or financial projections (no public claims without legal review).
- Content from active institutional investigations or police operations (restricted by nature).
- $ETHIK token (live on-chain, dormant by decision — legal review required before any public reference).
- Any personally identifiable information or case data.

---

*Last curated: 2026-06-04 — evidence-first, no inflation. Capabilities classified by what is
demonstrably true today, not what is intended.*
