---
description: Premortem — antecipa modos de falha antes de executar decisão/refactor/deploy. Trigger automático em prompts com "premortem", "pré-mortem", "antes de fazer X", "o que pode dar errado", "risco de Y", "antes de quebrar isso".
---

# /premortem — Antecipação estruturada de falhas

> **Origem:** workflow usado por Enio 2026-05-20 (sem skill capturada). Codex 2026-05-21 confirmou: inline é contingência, não padrão. Este artefato versiona o processo.
> **Princípio:** assumir que a decisão JÁ FALHOU em 6 meses. Voltar no tempo e identificar por quê.

## Quando invocar

- Antes de refactor não-trivial (toca 3+ arquivos)
- Antes de deploy em produção com tráfego real
- Antes de decisão arquitetural irreversível (DB schema, auth, billing)
- Antes de Red Zone (copy pública, pricing, contexto policial/segurança)
- Quando usuário pede "antes de mexer nisso, faz um premortem" ou variações

## Estrutura obrigatória (não pular passo)

### §1 — Contexto da decisão (3 linhas máx)
- O que estou prestes a fazer?
- Por que agora?
- Qual o estado de "sucesso" se 6 meses passassem sem incidente?

### §2 — Premissa do exercício
"São 6 meses depois. A decisão deu errado. Conta a história."

### §3 — Modos de falha (mínimo 5)
Para cada modo:
| ID | Falha | Probabilidade (B/M/A) | Severidade (B/M/A) | Sinal precoce |
|---|---|---|---|---|
| F1 | ... | ... | ... | ... |

Não aceitar menos de 5 — força raciocínio sob pressão.

### §4 — Mitigações por modo
Para cada F com prob×sev ≥ M×M:
- Ação preventiva (antes de executar)
- Sentinela (alerta tempo real)
- Plano de rollback (se acontecer)

### §5 — Gate de execução
- [ ] Mitigações para F-críticas (prob×sev ≥ M×M) estão aplicadas OU registradas como aceite explícito de risco
- [ ] Sentinelas de sinal precoce estão wired
- [ ] Plano de rollback tem owner + tempo estimado
- [ ] Se Red Zone: parar e pedir confirmação de Enio (CLAUDE.md §0.5 Karpathy)

## Output esperado

Arquivo `.md` em `docs/audits/premortem-<topic>.md` (não usar timestamp no nome — proibido pelo hook doc-proliferation). Tópico = slug da decisão.

## Anti-padrão

- "Tudo bem, é simples" → forçar §3 com 5 modos mesmo assim
- Apenas listar falhas sem mitigações §4
- Pular §5 gate
- Usar este protocolo para decisões triviais (ruído > sinal)
