# egos-governance

> **Governance OS for Agentic Software Delivery**

Battle-tested patterns, pre-commit pipeline, and meta-cognitive skills for teams running AI agents in production.

[![CI](https://github.com/enioxt/egos-governance/actions/workflows/ci.yml/badge.svg)](https://github.com/enioxt/egos-governance/actions/workflows/ci.yml)
[![Security](https://github.com/enioxt/egos-governance/actions/workflows/security.yml/badge.svg)](https://github.com/enioxt/egos-governance/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status: Beta](https://img.shields.io/badge/governance%20docs-beta-blue.svg)](#status)

> **Maturity:** governance docs (patterns · incidents · standards) are **Beta** — battle-tested, stable enough to adopt. The `packages/` (MCP servers) remain **Alpha** — see [Status](#status).

> 🤖 **Are you an AI agent reading this?** Start at **[docs/FOR_AI_AGENTS.md](docs/FOR_AI_AGENTS.md)** — the EGOS framework is built to be read, activated and adapted by AI agents (not copied blindly).

> **This repo is a curated, public view of the EGOS framework** — its architecture, governed-agent model, capabilities and metaprompts. It is curation + improvement, not a dump of the private monorepo. Sensitive/operational components are intentionally excluded.

---

## Comece aqui — grátis em 2 minutos

> Antes de ler sobre o que construímos, aqui está algo que você pode usar agora.

### Metaprompt: Assistente Profissional Governado

Cole no campo de instruções do ChatGPT, Claude ou Gemini. Troque os `[colchetes]`. Pronto.

```
Você é [Nome do Assistente], um assistente profissional governado especializado em [área], trabalhando com [usuário/equipe] em [contexto].
Seu propósito é apoiar [atividades] com precisão, ética e foco em valor prático.

Atua exclusivamente em:
- [Área 1]  - [Área 2]  - [Área 3]
Fora do escopo, responda: "Isso está fora do meu escopo atual. Posso ajudar com [alternativas]."

── CONFIGURAÇÃO INICIAL (se houver [colchetes] não preenchidos) ──
Se este prompt tiver campos entre colchetes, você ainda NÃO está configurado. Entre em modo TUTOR DE CONFIGURAÇÃO:
Regra de ouro: UMA pergunta por vez. Nunca liste todos os gaps. Conduza — não espere.
Neste modo, use linguagem natural e conversacional — sem o formato estruturado de classificação (Síntese/Evidências/Riscos). Esse formato é para o modo operacional, não para o tutor.
Fluxo obrigatório:
1. Pergunta única de abertura: "Olá! Antes de começar, preciso entender em qual área você quer que eu atue. Pode ser algo como: jurídico, saúde, finanças, cripto, conteúdo digital, vendas... Qual é a sua área?"
2. Com a resposta, infira HIPÓTESES para todos os outros campos ([nome], [contexto], [atividades], [Áreas], [alternativas]) com base no que o usuário disse.
3. Apresente o pacote completo: "Com base na sua área ([área]), aqui está como me configuraria: [Nome]: [sugestão] | Escopo: [Área 1], [Área 2], [Área 3] | Atividades: [sugestão] | Contexto: [sugestão]. Confirma ou quer ajustar algo?"
4. Usuário confirma → entra no modo operacional imediatamente. Usuário ajusta → refaz só o ponto ajustado.
NÃO peça o nome do assistente antes da área. NÃO explique por que cada campo existe. NÃO liste gaps. Seja tutor: lidere, infira, proponha, confirme.

── CLASSIFICAÇÃO OBRIGATÓRIA ──
Classifique afirmações relevantes como:
- CONFIRMADO: base verificável  - INFERIDO: deduzido dos dados  - HIPÓTESE: plausível, não verificado
- NÃO SEI: base insuficiente  - AÇÃO: passo a executar

── ANTI-ALUCINAÇÃO ──
Nunca invente datas, nomes, valores, leis, decisões, diagnósticos, estatísticas, referências, links ou fatos.
Sem fonte/base lógica = HIPÓTESE ou NÃO SEI. Diga "não sei" e qual informação falta.
Proibido: "100%", "garantido", "infalível", "único", "sem risco". Prefira: "alta confiança baseada em evidências".

── PROTEÇÃO DE DADOS ──
Sensíveis: CPF/RG/CNH/passaporte, dados bancários, endereço/telefone/e-mail privado, prontuários, dados de menores, dados de terceiros.
Ao receber: avise, mascare (ex: CPF ***.***.***-**), não repita literal, não retenha além da sessão.

── ZONA VERMELHA (pause antes) ──
Ação de alto impacto: enviar comunicação oficial, publicar, deletar, assinar, comprometer recursos, opinião conclusiva sobre pessoa, expor terceiro, decisão irreversível.
Protocolo: (1) identifique a ação (2) liste riscos (3) proponha alternativa mais segura (4) aguarde confirmação explícita (5) registre no resumo.

── LIMITAÇÕES ──
Não substituo profissional habilitado. Decisão de consequência jurídica/médica/financeira/reputacional → "Esta análise é auxiliar. Consulte um profissional habilitado."

── CRITÉRIO DE EVIDÊNCIA ──
Antes de afirmar: verifique a fonte, cheque consistência, separe fato de inferência/hipótese, indique lacunas.

── MODO DE RESPOSTA ──
Direto, profissional, sem jargão. Resumo executivo no início de respostas longas. Foco no próximo passo. Pedido ambíguo → pergunte antes.

── FORMATO DE SAÍDA ──
Classificação: [CONFIRMADO/INFERIDO/HIPÓTESE/NÃO SEI/AÇÃO]
Síntese: [resposta direta]
Evidências: [fontes/dados/base lógica]
Riscos: [se houver]
Próxima ação: [recomendação objetiva]

── REGRA FINAL ──
Em dúvida relevante: pare, classifique a dúvida, apresente opções, aguarde instrução. Nunca adivinhe silenciosamente.
```

> **Teste de 1 minuto:** depois de configurar, pergunte ao assistente: *"O que muda na sua capacidade agora que você está ativado?"* A resposta vai mostrar o método EGOS em ação — é a demonstração mais direta do que está por baixo.

---

### Checklist: Segurança de IA em 1 Página

Para qualquer profissional que usa ChatGPT/Claude/Gemini no trabalho.

- [ ] **Dado real só com necessidade** — "o LLM precisa deste dado ou posso descrever o padrão?"
- [ ] **PII mascarada antes de colar** — CPF/nome/processo → `[NOME]`, `[CPF]`, `[PROCESSO]`
- [ ] **LLM externo ≠ ambiente sigiloso** — é servidor de terceiro; sigilo profissional → verifique ToS ou use modelo local
- [ ] **Output de IA é INFERIDO** — número/data/citação gerada precisa de verificação independente antes de usar
- [ ] **Nunca cole credenciais** — senhas, tokens, chaves, certificados
- [ ] **Histórico tem memória** — usou dado sensível? limpe depois; verifique se a conta não treina com seus dados
- [ ] **Releia antes de publicar** — alucinação de IA é confiante; leia com o olho de quem recebe

---

### O que é o EGOS

EGOS é um framework aberto de **governança para IA** — método, metaprompts e guardrails que funcionam hoje no ChatGPT, Claude e Gemini. Não é "mais um assistente": é a disciplina que faz a IA ser **auditável, honesta e segura**.

**O método que você pode levar:**
- Protocolo de classificação de certeza (CONFIRMADO/INFERIDO/HIPÓTESE/NÃO SEI/AÇÃO)
- Red Zone — pausa + confirmação humana antes de ação irreversível
- Guard Brasil — mascaramento PII/LGPD privacy-first
- Evidence-first — afirmação sem prova = inválida
- Eval comportamental — capacidade só é "real" com golden cases
- Rituais de sessão `/start` e `/end` com evidência, não vibes
- SSOT — uma fonte canônica por domínio, sem dispersão

> Se quiser ir mais fundo: o método completo está neste repositório, aberto. **[egos.ia.br](https://egos.ia.br)**

---

## The 5 Pillars *(Os 5 Pilares)*

The rule runs, the proof opens, you decide. In EGOS, a rule becomes executable code — the gates in this kit are that principle made real.

1. **Every number has a source** (*Verdade Provada*) — a claim without proof is invalid; classification as CONFIRMED/INFERRED/HYPOTHESIS.
2. **The AI drafts, you decide** (*Humano Soberano*) — publishing, signing, deciding is a human act; the decision is logged with a criterion and a hash.
3. **The rule runs, it doesn't stay on paper** (*Regra Vira Gate*) — a rule without executable enforcement is a manifesto; every rule in this kit has a gate.
4. **What's yours stays yours** (*Dado Soberano*) — the engine travels in git; the real data never does. The PII/secret gates exist because of this.
5. **If it's not ready yet, the screen says so** (*Entender antes de Produzir*) — honest state: PROVEN/PARTIAL/CLAIMED declared, never implied.

Canonical source: EGOS framework — https://egos.ia.br/#/transparencia

---

## Why This Exists

Every rule in this repository was forged by a real incident.

We run AI agents in production — multi-model pipelines, parallel Claude/Codex workers, MCP servers, WhatsApp integrations. We made mistakes. We documented them. We built systems to prevent them from happening again.

This is not theoretical best-practices. It's **operational scar tissue** — and it's yours to use.

---

## 5 Governance Patterns Forged From Real Incidents

### 1. Documentation Drift Shield
4-layer enforcement that prevents your README from lying about your code: contract manifest (YAML), pre-commit hook (blocking), daily VPS sentinel cron, weekly LLM analysis pass.

### 2. Capability Promotion Gates
Objective maturity gates that move capabilities from `experimental → candidate → alpha → beta → rc → production`. No more "we'll productionize it later." Each promotion requires passing criteria.

### 3. Swarm Commit Policy
Race condition prevention for parallel agent workloads. Solved after a production incident where two background agents committed conflicting state to the same branch simultaneously.

### 4. Quorum Protocol
Critical decisions (architecture, security, pricing) require review from 3+ independent LLMs before execution. Not because any one model is wrong — because they're wrong in different ways.

### 5. Incident-Driven Governance
`docs/incidents/` contains anonymized post-mortems of real production failures, each with the rule it created. We publish ours.

---

## Structure

```
egos-governance/
├── docs/
│   ├── FOR_AI_AGENTS.md  ← 🤖 start here if you are an AI agent
│   ├── architecture/  ← Axis model (EGOS at center) · ecosystem map · event chain
│   ├── agents/        ← 12 governed roles · orchestration · agent template
│   ├── capabilities/  ← Capability catalog by maturity (evidence-first)
│   ├── metaprompts/   ← Curated metaprompts + the generator concept
│   ├── patterns/      ← Reusable governance patterns
│   ├── practices/     ← Operating modes (Opus Mode, Banda Cognitiva, Council)
│   ├── standards/     ← Quality frameworks (MCP rubric, Engineering 2026)
│   └── incidents/     ← ⭐ Real post-mortems → rules (the flagship)
├── starter/          ← Clone this to bootstrap your own governed repo
│   ├── .husky/       ← 10 pre-commit gates
│   ├── scripts/      ← Governance automation
│   ├── .claude/      ← Meta-cognitive slash commands
│   └── agents/       ← Background agent skills
└── packages/         ← MCP servers (alpha)
    ├── mcp-eval-runner/
    ├── mcp-governance/
    └── mcp-skills-registry/
```

---

## Quickstart (5 minutes)

```bash
# Clone the starter template into your project
git clone https://github.com/enioxt/egos-governance my-project
cd my-project/starter

# Install dependencies
bun install   # or: npm install

# Install pre-commit hooks
bunx husky install

# Verify everything works
bash .husky/pre-commit

# Test the runtime smoke check
bun scripts/runtime-smoke.ts
```

You now have:
- ✅ 10 pre-commit gates (secrets, typecheck, doc-drift, frozen zones, registry parity...)
- ✅ `safe-push.sh` preventing force-push accidents
- ✅ `task-reconciliation.ts` keeping TASKS.md honest
- ✅ Meta-cognitive slash commands for Claude Code (`/banda`, `/premortem`, `/council`...)

---

## Patterns at a Glance

| Pattern | What it solves | File |
|---------|---------------|------|
| Doc Drift Shield | README diverging from reality | [docs/patterns/doc-drift-shield.md](docs/patterns/doc-drift-shield.md) |
| Capability Promotion | Premature "production" claims | [docs/patterns/capability-promotion-rules.md](docs/patterns/capability-promotion-rules.md) |
| Swarm Commit Policy | Parallel agent git conflicts | [docs/patterns/swarm-commit-policy.md](docs/patterns/swarm-commit-policy.md) |
| Quorum Protocol | Single-LLM architectural hallucinations | [docs/patterns/quorum-protocol.md](docs/patterns/quorum-protocol.md) |
| Multi-LLM Orchestration | Cost + quota-aware model routing | [docs/patterns/multi-llm-orchestration.md](docs/patterns/multi-llm-orchestration.md) |

---

## Practices (Operating Modes)

| Practice | What it is | File |
|----------|-----------|------|
| Opus Mode | Cognitive OS for deep sessions — anti-hallucination + classification system | [docs/practices/opus-mode.md](docs/practices/opus-mode.md) |
| Banda Cognitiva | Hierarchical multi-role review before big decisions | [docs/practices/banda-cognitiva.md](docs/practices/banda-cognitiva.md) |
| Council Protocol | Multi-LLM review panel for critical decisions | [docs/practices/council-protocol.md](docs/practices/council-protocol.md) |
| Karpathy Doctrine | Minimum code, maximum understanding — applied | [docs/practices/karpathy-doctrine.md](docs/practices/karpathy-doctrine.md) |

---

## MCP Servers (Alpha)

> ⚠️ **EXPERIMENTAL — DO NOT USE IN PRODUCTION YET**
> These are `0.1.0-alpha`. APIs will change. No SLA.

| Package | What it does |
|---------|-------------|
| `@egos-public/mcp-eval-runner` | Behavioral evaluation harness for AI agents and MCPs |
| `@egos-public/mcp-governance` | Governance rules, SSOT drift detection, policy enforcement as MCP tools |
| `@egos-public/mcp-skills-registry` | Discovery and serving of agent skills, slash commands, and personas |

```bash
# When stable (not yet)
# npm install @egos-public/mcp-eval-runner
```

---

## Vocabulary

Some names in this repo come from the EGOS operational vocabulary. Quick reference:

| EGOS term | Generic meaning |
|-----------|----------------|
| Banda Cognitiva | Hierarchical Review (4 roles: Critic → Supporter → Questioner → Conductor) |
| Council Protocol | Multi-LLM Review Panel |
| Opus Mode | Deep Work Cognitive OS |
| Tutor Mode | Maximum-detail explanation mode |
| Single Pursuit | WIP limit enforcement (max 2 in-flight decisions) |
| EPOS | Personal Operating System interview (private, not in this repo) |

Full glossary: [VOCABULARY.md](VOCABULARY.md)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). TL;DR:

- All PRs require CI passing (typecheck + test + starter-smoke + security scan)
- New patterns require an incident story OR a proof-of-problem
- No speculative abstractions — solve what you have, not what you might have

---

## License

MIT — see [LICENSE](LICENSE).

Exception: `packages/guard-brasil*` (not in this repo) is separately licensed.

---

## Status

| Component | Status |
|-----------|--------|
| `docs/patterns/` | 🟡 In progress — 6 patterns being extracted |
| `docs/incidents/` | ✅ 5 incidents published |
| `starter/` | 🟡 In progress — pre-commit + scripts |
| `packages/` | 🔴 Alpha — not ready for production |
| MCP npm publish | ⏳ After 90 days stability |

---

*Built in production, documented honestly. — [@enioxt](https://github.com/enioxt)*
