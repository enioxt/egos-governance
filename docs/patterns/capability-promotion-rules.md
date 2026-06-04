# Capability Promotion Rules — EGOS

> **MCP-N2-004** | **Versão:** 1.0 | **Data:** 2026-05-13
> **Status:** APROVADO (pós-Codex review)
> **SSOT canonical** para promoção entre níveis de maturidade + para MCP

---

## §1. Filosofia (Codex correção)

Codex GPT-5.5 apontou: **score numérico arbitrário não é prova**. Esta v1.0 substitui o "score ≥4/5" original por **critérios objetivos verificáveis em CI**.

Cada promoção exige:
1. Critérios objetivos cumpridos
2. Behavioral eval em CI (se aplicável)
3. Aprovação owner
4. Audit trail no `maturity_history` do CBC

---

## §2. Os 6 Níveis de Maturidade (MCP-FIX-006)

| Nível | O que significa | Quem promove |
|---|---|---|
| `experimental` | POC, sem contrato estável | Auto (criador) |
| `candidate` | Contrato JSON Schema proposto | Owner + review |
| `alpha` | 1 contexto, sem eval | Owner |
| `beta` | ≥3 golden cases, 2+ contextos | Owner + CI |
| `rc` | 1-2 semanas observação, SLO definido | Owner + on-call |
| `production` | SLO + on-call + threat model | Owner + mantenedor |
| `deprecated` | Substituída por outra capability | Owner |

**Removido:** `idea` (não é capability — é HARVEST entry).

---

## §3. Promoção entre níveis — Critérios

### experimental → candidate
- [ ] **Contrato JSON Schema** declarado (interface inputs/outputs)
- [ ] **Owner** identificado no CBC
- [ ] **Use case real** documentado (não hipotético)

### candidate → alpha
- [ ] **Implementação funcional** existe (não mais POC)
- [ ] **CBC file** criado em `docs/capabilities/`
- [ ] **Validação JSON Schema** passa (`_SCHEMA.json` via ajv)
- [ ] **Path declarado** no `ownership.module`

### alpha → beta
- [ ] **≥3 golden cases** em `tests/eval/capabilities/CBC-*.eval.ts`
- [ ] **Behavioral eval** rodando em CI (GitHub Actions)
- [ ] **2+ contextos de uso** documentados
- [ ] **Replicability declarado** (low/medium/high/universal)
- [ ] **`evidence.proof_type`** preenchido

### beta → rc
- [ ] **Observability** ativa (logs estruturados + health endpoint)
- [ ] **SLO definido** (uptime, latency p95, error rate)
- [ ] **on_call** identificado
- [ ] **Backup/rollback** documentado se stateful
- [ ] **Anti-stub** confirmado (sem `return []` em compliance code — INC-008)
- [ ] **2 semanas** sem falhas críticas (registradas em audit log)

### rc → production
- [ ] **Threat model** documentado se VPS-exposed (`MCP_RISKS.md`)
- [ ] **OAuth2 + escopos** configurados se network-exposed
- [ ] **Audit log** Supabase escrevendo
- [ ] **Pre-flight checklist** Sprint 3 marcado (todos os itens)
- [ ] **Aprovação do mantenedor** explícita
- [ ] **Documentação para humanos** (`docs/MCP_GUIDE.md` entry)

### → deprecated
- [ ] **Substituição** identificada (qual capability assume)
- [ ] **Migration guide** escrito
- [ ] **Sunset date** declarado (mínimo 30d)
- [ ] **Audit log** preservado

---

## §4. Promoção a MCP server (capability → MCP)

**Substitui score ≥5/8 original (Codex MCP-FIX-005).**

### Critérios obrigatórios

1. **Capability em maturity ≥ beta** (não promover alpha)
2. **Behavioral eval CI** rodando + green
3. **Cross-environment use case** validado (≥2 clientes diferentes)
4. **State externalizável** (não RAM-only)
5. **Owner + on_call** identificados
6. **Topologia decidida** (qual MCP domain consolida — MCP-FIX-007)
7. **Threat model** rascunhado (`MCP_RISKS.md` entry)
8. **Custo MCP < benefício de reuso** (justificativa em CBC `mcp_promotion.reason`)

### Critérios bloqueantes (NÃO promove se)

- ❌ **Capability one-shot** (operação única) → manter como script
- ❌ **Latência crítica <100ms** → usar library local
- ❌ **Estado RAM-only** → não cross-machine
- ❌ **Compliance lock** (regulated or sensitive intelligence tools) → manter local apenas
- ❌ **Dados sensíveis sem isolamento de tenant** → bloqueado até MCP-FIX-003

### Path de promoção

```
capability beta+ 
  ↓ propose_promotion (mcp-eval-runner ou manual)
  ↓ behavioral eval CI valida
  ↓ topologia decidida (qual domínio)
  ↓ threat model rascunhado
  ↓ aprovação owner
capability promoted → integra MCP existente OU cria novo MCP
  ↓ Sprint 3 pre-flight checklist (se VPS)
  ↓ Production deploy
```

---

## §5. Anti-padrões (NÃO promover)

### Promoção prematura
- ❌ Promover alpha → beta sem ≥3 golden cases (regra MCP-FIX-005)
- ❌ Promover rc → production sem threat model (regra MCP-RISK-002)
- ❌ Promover capability single-use a MCP (overengineering)

### Capability sem evidência
- ❌ CBC criado sem `evidence.proof_path`
- ❌ `behavioral_eval` declarado mas eval file não existe
- ❌ `case_count: 3` mas file tem <3 casos (CI deve validar)

### Stubs em compliance
- ❌ Function compliance retorna `[]` ou `null` em vez de `throw new Error('NOT IMPLEMENTED')` (INC-008)
- ❌ Mock returning false positive como evidence

### Sprawl
- ❌ Criar MCP novo quando capability cabe em domain MCP existente (MCP-FIX-007)
- ❌ MCP com 1 tool só

---

## §6. Enforcement (pre-commit + CI)

### Pre-commit hook `5.96-capability-validate.sh` (a criar)

```bash
# Detecta adição/edit em docs/capabilities/CBC-*.md
# Valida frontmatter contra _SCHEMA.json (ajv)
# Se status >= beta: exige evidence.behavioral_eval + arquivo eval existe
# Se status == production: exige risk_assessment + ownership.on_call
# Falha → block (modo strict) ou warn (modo dev)
```

### CI GitHub Actions

```yaml
name: capability-eval
on: [push, pull_request]
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: bun install
      - run: bun test tests/eval/capabilities/
      - run: bun scripts/capability-audit.ts --fail-on-missing-eval
```

### Audit script (a criar)

`scripts/capability-audit.ts`:
- Lista CBC files com `status >= beta`
- Verifica se eval file existe
- Verifica se eval roda + passa
- Output: `docs/capabilities/_audit-report.md` (AUTO-GEN)
- Exit code 1 se gaps detectados

---

## §7. Workflow padrão (humano + agente)

### Criando capability nova

1. **HARVEST entry** (ideia)
2. **POC** (`experimental`)
3. **Definir contrato** + CBC esqueleto (`candidate`)
4. **Implementar** + use case real (`alpha`)
5. **Escrever golden cases** + CI green (`beta`)
6. **Observability + 2 semanas** (`rc`)
7. **Threat model + maintainer approval** (`production`)
8. **(Se aplicável)** promover a MCP

### Quando algo NÃO virar capability

- **Workflow/script bash** → não capability, mantém em `scripts/`
- **Ideia sem implementação** → HARVEST.md
- **Operação one-shot** (migration, deploy) → script
- **Documentação pura** → docs/

---

## §8. Referências

- **Schema canonical:** `docs/capabilities/_SCHEMA.json`
- **Template:** `docs/capabilities/_TEMPLATE.md`
- **Drift report:** `docs/capabilities/_drift-report.md`
- **Pós-Codex decisions:** `docs/governance/MCP_ARCHITECTURE_DECISIONS.md`
- **Threat model:** `docs/governance/MCP_RISKS.md`
- **MCP Guide:** `docs/governance/MCP_GUIDE.md`
- **INC-008 anti-stub:** behavioral eval ≥3 golden cases obrigatório

---

*v1.0 — 2026-05-13 | MCP-N2-004 | Substitui score numérico por critérios objetivos verificáveis em CI*
