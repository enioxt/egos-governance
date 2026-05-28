# EGOS Quorum Protocol — Multi-AI Review for Critical Decisions
> **Version:** 1.0.0 | **Created:** 2026-04-10 | **Status:** ACTIVE
> **Rule:** §34 do `~/.claude/CLAUDE.md` global (a ser adicionado no refactor)

---

## 1. O que é

Decisões críticas do EGOS passam por **quórum obrigatório de 3+ LLMs independentes** antes de execução. O Claude Code (orquestrador) prepara o meta-prompt + arquivos, Enio coleta as avaliações manualmente, e o orquestrador consolida e executa.

**Nome interno:** "Quórum" (não "congresso" — evitar tom pomposo, manter técnico).

---

## 2. Quando o Quórum é obrigatório

| Trigger | Exemplos concretos | Quórum mínimo |
|---|---|---|
| **Mudança no CLAUDE.md global** (qualquer seção A/Core) | Adicionar/remover/reescrever §1-§33 | 3 LLMs + Enio |
| **Mudança arquitetural do kernel** | Trocar runtime (Bun→Node), trocar DB (Supabase→outro), mudar model routing chain | 3 LLMs + Enio |
| **Novo produto/vertical público** | Lançar EGOS Lab, novo pricing Guard Brasil, novo repo público | 2 LLMs + Enio |
| **Decisão de cortar/arquivar repo ou sistema** | Arquivar egos-lab, matar agents, deprecar package | 2 LLMs + Enio |
| **Publicação pública de artigo âncora** | Showcase EGOS, manifesto técnico, post que vai virar referência | 3 LLMs + Enio |
| **Mudança no Evidence Gate ou Doc-Drift Shield** | Alterar o que bloqueia commits | 2 LLMs + Enio |

### Quando NÃO precisa de quórum
- Commits normais de código
- Bug fixes
- Documentação interna (handoffs, TASKS.md)
- Tasks operacionais (deploy, cron, monitoring)
- Adição de novos scripts/agents (desde que não mudem arquitetura)

---

## 3. Processo — passo a passo

### 3.1 Orquestrador prepara (Claude Code)

1. Identifica que a decisão requer quórum (checklist do §2 acima)
2. Avisa Enio: "Esta decisão requer Quórum. Preparando meta-prompt."
3. Gera:
   - `meta-prompt.md` — instruções para os LLMs avaliadores (sem contexto prévio, auto-contido)
   - `artifact.md` — o arquivo/decisão sendo avaliado (cópia limpa)
   - `context.md` (opcional) — contexto adicional se necessário
4. Salva em `docs/quorum/YYYY-MM-DD-<topic>/` para histórico
5. Entrega a Enio com instruções de onde colar

### 3.2 Enio coleta (manual)

1. Cola meta-prompt + artifact em cada LLM (Gemini, Grok, GPT, Perplexity — mínimo 3)
2. Coleta respostas em texto
3. Retorna ao Claude Code com as respostas (cola no chat ou salva em arquivo)

### 3.3 Orquestrador consolida (Claude Code)

1. Lê todas as avaliações
2. Produz:
   - **Tabela de consenso** (onde 3+ concordam)
   - **Tabela de divergência** (onde discordam + minha posição)
   - **Plano de ação** consolidado
3. Enio aprova ou pede ajustes
4. Executa

### 3.4 Registro

Cada quórum fica registrado em:
- `docs/quorum/YYYY-MM-DD-<topic>/decision.md` — resultado final
- `docs/quorum/YYYY-MM-DD-<topic>/responses/` — respostas brutas dos LLMs
- Commit message inclui `QUORUM: <topic> — N LLMs + human approved`

---

## 4. Regras do meta-prompt

Todo meta-prompt gerado pelo orquestrador DEVE:

1. **Ser auto-contido** — o LLM avaliador não tem contexto prévio sobre EGOS
2. **Incluir dados reais verificados** — números, paths, estados (não claims não-verificados)
3. **Incluir aviso anti-alucinação** — "NÃO assuma que X existe. Se mencionar script Y, diga 'não posso verificar'."
4. **Pedir output estruturado** — tabela, classificação, top N, veredicto
5. **Pedir divergência** — "Diga onde discorda dos outros avaliadores" (se for rodada 2+)
6. **Não pedir motivação** — "Não elogie. Aponte problemas e proponha soluções."
7. **Tom técnico** — sem emojis, sem coaching, sem frases performáticas

---

## 5. LLMs do painel (curado, atualizar conforme necessário)

| LLM | Força principal | Quando priorizar |
|---|---|---|
| **Gemini** | Realismo brasileiro, correção factual, cortes cirúrgicos | Sempre (baseline) |
| **Grok** | Red teaming, matemática financeira, agressividade útil | Decisões com risco financeiro ou de mercado |
| **GPT (ChatGPT)** | Estruturação, camadas, separação de concerns, análise profunda | Decisões arquiteturais complexas |
| **Perplexity** | Pesquisa com fontes, dados atualizados, citações | Decisões que dependem de dados externos recentes |
| **Claude (Sonnet/Opus)** | Orquestração, contexto do código, consolidação | Sempre (orquestrador, não avaliador — evitar viés de confirmação) |

**Regra:** Claude Code **não vota** no quórum. Ele prepara, consolida e executa. Não avalia. Isso evita viés de confirmação — se eu preparei a proposta, não devo também avaliá-la.

---

## 6. Histórico de Quórums

| Data | Tópico | LLMs | Resultado |
|---|---|---|---|
| 2026-04-10 | CLAUDE.md global audit | Gemini + Grok + GPT + Perplexity | Consenso: cortar 40%, separar em camadas, adicionar precedência + rollback + cost control |

---

*Próximo quórum previsto: publicação do artigo âncora showcase (Camada 7)*
