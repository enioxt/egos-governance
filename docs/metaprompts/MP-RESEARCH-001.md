# MP-RESEARCH-001 — Market Intelligence Prompt

> **Version:** 1.0.0 · **Status:** CANONICAL · **Updated:** 2026-06-03

---

## Purpose

Structure a market, competitor, or technology investigation before a strategic decision.
Applies the evidence classification chain **CONFIRMED → INFERRED → HYPOTHESIS → PROPOSED
ACTION** to separate finding from speculation and guarantee that every number carries its
source.

## When to Use

- Before deciding to enter a segment or create a product without knowing what already
  exists.
- When evaluating a competitor with scattered data (site, repos, job postings, pricing).
- When mapping emerging technologies in a relevant domain.
- Any time an external claim appears without evidence (treat every sub-agent or LLM
  artifact as unverified until proven).

**Do not use** for internal technical implementation research — use code search and
direct file exploration instead.

## Expected Input

```
DOMAIN         : <market / vertical / technology to investigate>
TARGET_DECISION: <which decision this research will support>
HYPOTHESES     : <list of pre-existing assumptions to confirm or refute>
SEED_SOURCES   : <URLs, player names, known repositories>
DEPTH          : <shallow (landscape) | medium (players + gaps) | deep (differentiators + pricing)>
DEADLINE       : <iso-timestamp | "end_of_this_session">
```

## Expected Output

```
DOMAIN INVESTIGATED: <name>
DECISION SUPPORTED : <restatement of TARGET_DECISION>

FINDINGS — CONFIRMED (source + URL or file:line):
  1. <finding> — SOURCE: <url or file:line>
  ...

FINDINGS — INFERRED (basis for inference):
  1. <likely conclusion> — BASIS: <observed pattern>
  ...

UNVERIFIED HYPOTHESES:
  1. <hypothesis> — HOW TO TEST: <concrete method>
  ...

MARKET GAPS (opportunity):
  1. <gap> — CLASSIFICATION: CONFIRMED | INFERRED | HYPOTHESIS
  ...

PROPOSED ACTION:
  <recommended decision + estimated cost + main risk>

SOURCES CONSULTED: <numbered list of URLs or files>
```

No URL or `file:line` = `[INFERRED]` is mandatory — never present as fact.

## Limits

1. No number without a source — inventing percentages or market size is forbidden.
2. No absolutes: "unique in the market", "100%", "guaranteed", "infallible" — replace
   with "high accuracy validated", "resilient, auditable, recoverable".
3. Competitor data only from public sources — never PII, authenticated scraping,
   or customer data without consent.
4. If the domain touches sensitive personal data (health, biometrics, law enforcement)
   → Red Zone: stop, log in task tracker, wait for human approval.
5. Claims from a previous session or another agent = treat as HYPOTHESIS until
   re-verified.

## Acceptance Criteria

- [ ] Every CONFIRMED finding has an inspectable URL or `file:line`.
- [ ] Pre-existing hypotheses are explicitly confirmed or refuted.
- [ ] Market gaps are classified with certainty level (CONFIRMED/INFERRED/HYPOTHESIS).
- [ ] No number appears without a source.
- [ ] Proposed action includes estimated cost and main risk.
- [ ] Sources consulted listed in their own section.

## Red Zone

Stop and report to orchestrator (no self-resolution) if:

- Domain involves real PII, law enforcement data, health data, or personal financial data.
- Research would require authenticated scraping or access to non-public data.
- The supported decision involves public pricing, product copy, or a commercial
  partnership with a third party (requires human gate).
- Result contradicts a decision already recorded in your project memory without a new
  justification.

## Example — Minimal

```
DOMAIN         : AI governance courses for public-sector security teams
TARGET_DECISION: Create or not a "Architecting AI" module for government teams
HYPOTHESES     : No course teaches governance + IDE-native tooling together;
                 existing courses only cover AI usage
SEED_SOURCES   : course-platform-A.com, course-platform-B.com, github.com/example/ai-gov
DEPTH          : medium
DEADLINE       : end_of_this_session
```

## Example — Deep with Red Zone gate

```
DOMAIN         : Open-source crypto forensics tools for law enforcement (Brazil)
TARGET_DECISION: Integrate Chainalysis or build an internal module?
HYPOTHESES     : Chainalysis outside budget for state departments; no PT-BR open-source support
SEED_SOURCES   : chainalysis.com, elliptic.co, github.com/nicehash/breadcrumbs
DEPTH          : deep
DEADLINE       : 2026-06-10T23:59:00Z
```

Red Zone gate active: if the investigation requires real transaction data or personal
identifiers, stop and log `RESEARCH-RED-ZONE-001` in the task tracker before any
collection.

---

> **Anti-copy-paste note:** adapt to your environment before using. Verify that any
> internal governance docs you reference exist in your repo before citing them.
> Do not copy secrets, tokens, or `.env` values. Task IDs in the examples are
> illustrative. Web search results change with each run — cite the snapshot,
> not the expected result.
