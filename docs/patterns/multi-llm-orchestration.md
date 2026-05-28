# Multi-LLM Orchestration — Claude + Codex Pipeline

> **SSOT canonical** para roteamento de modelos, integração Claude Code ↔ Codex CLI e monitoramento de quota.
> **Origem:** Arquitetura Opus 2026-05-12 — Plus $20 quota apertada exige roteamento inteligente.
> **Enforcement:** lazy-loaded via `~/.claude/egos-rules/llm-routing.md` | pré-commit opt-in | `/start` Layer 4.8 | `/end` Phase 13.

---

## §1. Modelos disponíveis

### Claude (Anthropic)

| Model ID | Alias | Custo relativo | Uso canônico |
|---|---|---|---|
| `claude-haiku-4-5` | Haiku | 1x (mais barato) | Mecânico: lint, format, rename, grep |
| `claude-sonnet-4-6` | Sonnet | ~10x | Default — implementação multi-arquivo |
| `claude-opus-4-7` | Opus | ~50x | Arquitetura, segurança, decisões críticas |

### OpenAI Codex (via ChatGPT Plus $20)

| Model | Uso | Quota |
|---|---|---|
| `gpt-5.3-codex` | Corriqueiro — scaffolding, testes, refactor | 5x janela 5h (Plus) |
| `gpt-5.5` | **RARO** — adversarial review, pré-push final | Drena rápido — usar com parcimônia |

> ⚠️ **Plus $20 constraint:** quota é 5x base por janela de 5h + cap semanal.
> GPT-5.5 deve ser usado **no máximo 2x/sessão**. Comunidade reporta drenagem rápida (fórum OpenAI, Mai/2026).

---

## §2. Tabela de roteamento por tarefa

| Tarefa | Modelo | Gatilho |
|---|---|---|
| Lint fix, format, rename mecânico | **Haiku** | `/model haiku` |
| Implementação multi-arquivo, sessão normal | **Sonnet** | Default |
| Decisão arquitetural crítica, segurança | **Opus** + 2ª opinião **gpt-5.5** | `/banda` → manual |
| Scaffolding, geração de testes, refactor médio | **gpt-5.3-codex** | `/duo <task>` |
| Code review automatizado pré-commit | **gpt-5.3-codex** (default) → **gpt-5.5** se diff > 500L | `EGOS_CODEX_REVIEW=1` |
| Adversarial review pré-PR/push | **gpt-5.5** (RARO) | `/end` Phase 13 |
| Geração de ideias, Dreamer cron VPS | Hermes-4 local ou **gpt-5.3-codex** | cron 23h |

**Princípio:** modelo mais barato que resolve o problema. **5.5 é precioso.**

---

## §3. Quota Plus $20 — thresholds e fallback

| Nível | Janela 5h restante | Ação |
|---|---|---|
| 🟢 Verde | > 50% | Normal — todos os modelos disponíveis |
| 🟡 Amarelo | 30–50% | Usar com parcimônia. Evitar `/duo --heavy` e `/codex:adversarial-review` |
| 🔴 Vermelho | < 30% | **Fallback Claude-only.** `/duo` desabilitado. `/end` Phase 13 pulado. |

- Monitor: `bun scripts/codex-usage.ts --json`
- Alarme em `~/.claude/hooks/session-status.sh` (linha automática após custo Claude)
- Fallback é automático via check no Layer 4.8 e Phase 13

---

## §4. Gatilhos no pipeline EGOS

### `/start` — Layer 4.8 (Codex Health Check)
- Roda `scripts/codex-usage.ts --json`
- Mostra nivel de quota (🟢/🟡/🔴) no Verification Checkpoint
- 🔴 = aviso "usar Claude-only hoje"

### `/duo <task>` — Paralelismo Claude + Codex
- Claude (modelo atual) e Codex (gpt-5.3-codex padrão) resolvem o mesmo task
- Claude sintetiza divergências e apresenta ao usuário
- Hard-cap sugerido: 4x/dia (informativo, não enforced automaticamente)
- Flag `--heavy`: escala Codex pra gpt-5.5 (RARO, confirmar quota antes)

### Pre-commit opt-in (`EGOS_CODEX_REVIEW=1`)
- Variável de ambiente desabilitada por default
- Quando ativa: roda `gpt-5.3-codex` sobre diff staged
- Escalona para `gpt-5.5` se diff > 500L ou toca paths críticos
- **Nunca bloqueia commit** — output em `.git/CODEX_REVIEW.md`
- Paths críticos: `auth/`, `migrations/`, `lib/prompts/`, `docs/governance/`

Como ativar:
```bash
export EGOS_CODEX_REVIEW=1   # ativa para esta sessão shell
unset EGOS_CODEX_REVIEW       # desativa
```

### `/end` — Phase 13 (Adversarial Pre-Push Gate)
- Dispara SE: commits da sessão ≥ 3 OU diff toca paths críticos
- Usa gpt-5.5 para adversarial review
- **Nunca bloqueia push** — informa, Enio decide
- Pulado automaticamente se quota 🔴

---

## §5. Integração codex-plugin-cc (oficial OpenAI)

Plugin instalado via: `claude plugin install codex@openai-codex`

Slash-commands disponíveis:

| Comando | Uso | Modelo |
|---|---|---|
| `/codex:review` | Code review uncommitted/branch | gpt-5.3-codex |
| `/codex:adversarial-review` | Review que questiona design | gpt-5.5 |
| `/codex:rescue` | Delegar task travada ao Codex | gpt-5.3-codex |
| `/codex:status` | Jobs rodando/recentes | — |
| `/codex:result` | Output de job anterior | — |
| `/codex:cancel` | Cancelar job ativo | — |
| `/codex:setup` | Verificar instalação + auth | — |

Fluxo de dados: `Claude Code → Codex CLI local → Codex app server → resultado em Claude`

---

## §6. Anti-patterns proibidos

| Anti-pattern | Motivo |
|---|---|
| Auto-aplicar fixes do Codex sem Enio aprovar | Viola Understanding Protocol §3 — remove entendimento |
| Codex blocking no pre-commit | Frozen zone + UX ruim + drena quota |
| gpt-5.5 como default | Quota Plus $20 drena em 1-2 sessões |
| Subagents Claude rodando Codex em loop | INC-006 phantom + custo multiplicativo |
| Criar scripts variantes (`codex-usage-v2.ts`) | Anti-proliferação §7 CLAUDE.md |
| Usar Codex no VPS sem planejar auth OAuth | Codex CLI exige login interativo — VPS headless problemático |

---

## §7. VPS + Hermes (DEFERRED — após 2 semanas validando local)

Decisão: **opção 3 — Codex local-only** por 2 semanas. Medir uso real antes de decidir.

Opções disponíveis quando retomar:
1. **Device-flow manual** no VPS (ssh + browser local, token persiste)
2. **OPENAI_API_KEY** no VPS (paga por token, fora da quota ChatGPT — bom pra cron)
3. **Não integrar VPS** (Hermes continua Hermes-4 + OpenRouter)

Tarefa: `CODEX-VPS-001 [P2]` — criar pra retomar após dados de uso local.

---

## §8. Incidentes e postmortems

- Sem incidentes ainda (pipeline novo, 2026-05-12)
- Quando ocorrer: registrar em `docs/INCIDENTS/INC-CODEX-*.md` + rule atômica aqui

---

## §9. Evolução futura (HIPÓTESE — não implementar antes de 3 repetições)

- `/duo` automático pré-commit (quando 3x manual mostrar valor)
- Hermes plugin `egos-codex-bridge` (após VPS auth resolvido)
- Dashboard HQ para visualização de quota ao longo do tempo
- Cache de reviews Codex (evitar re-review do mesmo hash de commit)

---

*v1.0 — 2026-05-12 | Origem: Arquitetura Opus session 2026-05-12*
*Próxima revisão: 2026-05-26 (2 semanas após uso real) ou após INC-CODEX-001*
