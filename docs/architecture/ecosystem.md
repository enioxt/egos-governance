# EGOS Ecosystem Map

> **Version:** 1.0.0
> **Audience:** Engineers and contributors exploring the EGOS ecosystem.
> **Purpose:** A sanitized map of the public repos, packages, and services that make up EGOS — plus a clear statement of what is private or internal.

---

## Reading Guide

- Components are grouped by **axis** (see [`overview.md`](./overview.md) for the model).
- Each entry shows: **name**, **public visibility**, and **one-line purpose**.
- Private/internal components are listed by category only — no operational details.
- `status` reflects current development state, not deployment health.

---

## L0 — EGOS Kernel

| Component | Visibility | Purpose |
|-----------|-----------|---------|
| **egos** (kernel repo) | Private | The constitution, orchestration rules, agent registry, and governance policies. The source of truth for all other components. |
| **BLUEPRINT-EGOS** | Public | Architectural blueprint and specification of the EGOS ecosystem. |
| **egos-governance** | Public | Governance OS — rule sets, SSOTs, and cross-repo synchronization tooling. |
| **egos-rules** | Public | Public mirror of the EGOS operational rules and opus-mode guidelines. |

---

## OPERAÇÃO Axis — Public Components

### Runtimes

EGOS operates across three runtimes that divide responsibility by temporal pattern:

| Runtime | Pattern | Role |
|---------|---------|------|
| **Claude Code** | On-demand | Primary development and orchestration runtime. EGOS Prime operates here. |
| **Hermes** | Always-on (24/7) | Scheduled events, watchdog monitoring, HITL delivery via messaging channels. |
| **Gemini** | Cron (periodic) | Coherence and drift detection. GitHub is the SSOT that synchronizes all three. |

### Public Repos and Packages

| Repo / Package | Status | Purpose |
|----------------|--------|---------|
| **egos-lab** | Active | Platform for demos and experimental applications. Hosts Eagle Eye (public procurement monitor). |
| **egos-cortex** | Active | Cognitive and memory layer for the ecosystem. |
| **852** | Active | Chatbot platform for organizations. Demonstrates EGOS chatbot runtime. |
| **guard-brasil-skill** | Active | Security audit framework for Brazilian PII (LGPD compliance). Claude Code skill. |
| **egos-governance-skill** | Active | Claude Code skill for EGOS governance operations. |
| **gem-hunter** | Alpha | Discovers and curates AI/Web3 projects. |
| **gem-hunter-skill** | Active | Claude Code skill companion to Gem Hunter. |
| **awesome-gems** | Active | Curated list of notable AI/Web3/open-source projects. |
| **omniview** | Active | Forensic video analysis tool. |
| **ARCH** | Active | AI assistant for architecture and urban planning workflows. |
| **EGOSv3** | Reference | EGOS v3 — historical reference implementation. |
| **Pochete2.0** | Active | Standalone project in the EGOS orbit. |

### Deployed Public Surfaces

| Surface | Purpose |
|---------|---------|
| `egos.ia.br/tools` | Item-intake tool — converts menu photos/PDFs and spreadsheets into governed point-of-sale data. Live. |
| `egos.ia.br` | EGOS public presence. |
| `guard.egos.ia.br` | Guard Brasil API — PII detection and LGPD compliance as a service. |
| `mcp.egos.ia.br` | MCP servers — EGOS capabilities exposed to AI assistants. |
| `lab.egos.ia.br` | EGOS Lab — experimental applications and demos. |
| `gemhunter.egos.ia.br` | Gem Hunter — AI/Web3 discovery interface. |

### Internal / Private Components (not detailed publicly)

The following operational components exist but are not documented publicly. They handle infrastructure, sensitive data, or capabilities that require controlled access:

- **VPS infrastructure** — production host, reverse proxy, container orchestration. No IP addresses, credentials, port mappings, or container names are disclosed.
- **EGOS Gateway** — internal messaging orchestrator connecting WhatsApp, Telegram, and the Master API. Deployed; configuration is private.
- **EGOS HQ** — internal dashboard.
- **Storefront / Central EGOS** — multi-tenant commerce layer (client storefronts). Partially deployed; de-prioritized.
- **852.egos.ia.br** — production deployment of the 852 chatbot. Operational details private.
- **Supabase instance** — multi-tenant cloud database. Schema and project details are private.

---

## PROVA Axis — Trust via Math

The proof axis anchors EGOS governance claims using cryptographic tools. No personal data or operational secrets are involved — only hashes and timestamps of governance artifacts.

| Component | Status | Purpose |
|-----------|--------|---------|
| **Doc-Drift Shield** | Active | Pre-commit validation that checks declared claims against actual state. Prevents governance documentation from drifting silently from reality. |
| **Guard Brasil** | Active | PII detection library for Brazilian data (CPF, CNPJ, RG, phone, address patterns). Proves non-leakage. Published as `packages/guard-brasil`. |
| **Sigstore / Rekor** | Partial | Supply-chain signing for EGOS artifacts. No blockchain required — uses the Rekor transparency log. |
| **OpenTimestamps → Bitcoin** | Dormant (experiment) | Anchors the EGOS constitution to Bitcoin's immutable ledger. Proves *that a rule existed at time T* without trusting any operator. Cost: ~$0 (OTS protocol uses Bitcoin without spending). |
| **EAS → Base** | Dormant (experiment) | Ethereum Attestation Service on Base L2. Attests that a specific AI decision was made under a specific version of governance. Provides chain-of-custody for AI decisions. |

**On $ETHIK:** A governance token exists on Base as a technical artifact of the EAS/PROVA experiments. It is live on-chain but **dormant** — not actively used, not traded, not marketed. It is outside the scope of current public work. No contract address, tokenomics, or financial details are provided here.

---

## INTEGRAÇÃO Axis

| Component | Status | Purpose |
|-----------|--------|---------|
| **MCPs (10+ servers)** | Active | Model Context Protocol servers that expose EGOS capabilities to Claude, ChatGPT, Gemini, and other AI assistants. |
| **LLM Router** | Active | Multi-provider LLM routing. Routes requests based on capability requirements, cost, and quota. Provider keys are server-side only. |
| **WhatsApp / Telegram channels** | Active | Messaging channels for HITL (human-in-the-loop) delivery and bot interactions. |
| **NotebookLM integration** | Active | One notebook per active EGOS repo/product. Used for explanatory intelligence — never as a technical SSOT. |
| **Public data sources (CNPJ/TSE/Transparência)** | Partial | Open government datasets that feed the public OSINT graph (BRACC). |

### BRACC / EGOS Inteligência

A public OSINT graph (~83.8M nodes) built from open Brazilian government data (CNPJ registry, TSE electoral data, Transparency Portal). It powers cross-reference and anomaly-detection capabilities over **publicly available** information only.

- Repo: **br-acc** (EGOS Inteligência namespace)
- Status: Partial (features paused)
- Co-author: Bruno César

---

## Private / Internal Components (all axes)

The following categories are fully internal. They are listed here so readers understand the boundary, not to describe their contents:

| Category | Reason not detailed |
|----------|-------------------|
| **Governed investigation platform** | Handles sensitive data under custody/provenance. Private by design — institutional/restricted use. |
| **Restricted data stores** | Local-only or access-restricted databases that may hold personal/sensitive data. Never exposed publicly. |
| **Agent memory** | Session memory that may contain PII or sensitive context. Protected by design. |
| **Private commercial products** | Closed-source products (e.g. chat-first ERP, payment flows) — contain integration credentials. |
| **Other private/archived repos** | Various internal repos at different stages of development or archival, not part of the public framework. |

---

## Archived Components

| Component | Note |
|-----------|------|
| **EGOSv2, egos-self** | Historical. The v2/v4/v5 archive contains the complete $ETHIK token system (buy-back contracts, tokenomics, marketplace, validator agents). Reference only — not active. |
| **santiago** | Demo delivery app. Archived. |

---

*For the conceptual model behind this map, see [`overview.md`](./overview.md).*
*For the event and handoff chain, see [`event-chain.md`](./event-chain.md).*
