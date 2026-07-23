# §K. Karpathy Principles [T3 — alignment]

> **Sources:** (1) Karpathy "Recipe for Training NN" — princípios técnicos. (2) Karpathy abr/2026 — Doutrina do Entendimento.
> **Lazy-loaded** by CLAUDE.md global. Apply for non-trivial tasks (3+ tool calls / 5+ files).

---

## §0. KARPATHY DOCTRINE — Entendimento não pode ser terceirizado

> *"You can outsource your thinking. YOU CANNOT OUTSOURCE YOUR UNDERSTANDING."* — Karpathy

**Regra-mãe:** A IA pode pensar com o mantenedor, mas nunca pode entender por ele.

**SSOT canonical:** `egos/docs/personal-os/UNDERSTANDING_PROTOCOL.md`
**Mapa de delegação:** `egos/docs/personal-os/ENIO_UNDERSTANDING_MAP.md`
**Gates automáticos:** `egos/docs/personal-os/FOCUS_GATES.md`

**5 regras constitucionais.** Toda mudança gerada deve satisfazer ≥1:
1. Aumentar entendimento do mantenedor sobre o sistema
2. Aumentar capacidade de execução (sem aumentar dependência)
3. Proteger foco (bloquear dispersão)
4. Reduzir complexidade desnecessária
5. Transformar insight em regra/prompt/workflow reutilizável

Se artefato aumenta complexidade SEM aumentar entendimento → rejeitar, simplificar ou adiar.

**Trigger histórico:** INC-2026-05-08 (landing page declared "✅ 10/10" based on HTTP 200, without the engineer having seen the page render in a browser).

**Domínios Red Zone (NUNCA terceirizar):** ética/Guard Brasil, promessa pública (copy), pricing, arquitetura final, segurança, setores regulados, claims médicos/jurídicos. Mapa completo em `ENIO_UNDERSTANDING_MAP.md` §🔴.

**Visual Proof Gate:** deploy de UI exige screenshot real. HTTP 200 ≠ prova de função.

---

## 1. Think Before Coding
- State assumptions explicitly before implementing
- Multiple interpretations OK; ambiguous PRs rejected
- "Make this better" without specifics → ask for concrete changes

## 2. Simplicity First
- Minimum code that solves the problem
- No premature abstractions (wait for 3rd repetition)
- No speculative features ("might be useful later")
- Hard limit: new file >500 LOC = blocked
- Warn: new file >300 LOC = ask "is this minimal?"
- DRY ≠ excuse for abstraction. Three identical lines > bad abstraction.

## 3. Surgical Changes
- Modify ONLY what was requested
- No "while I was here" refactors
- One responsibility per commit
- Large changes (>50 lines): include "Plan:" in commit body
- Drive-by improvements → reject, separate PR

## 4. Goal-Driven Execution
- Every task has explicit success criteria
- Tests-first: write test, verify it fails, implement, verify it passes
- Before /end: verify goal from /start is met
- "Seems to work" ≠ measurable validation
- "Feature implemented" without evidence → ask reproduction/test

## Rejection criteria summary
- Vague "better" without specifics
- Bug fix without reproduction
- Commit touching 10+ unrelated files
- Tests claimed without test code/output
- "No errors" without running actual workflow

## Self-test
"Would a senior engineer say this is overcomplicated?" If yes → simplify.