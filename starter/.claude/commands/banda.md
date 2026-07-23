---
description: Banda Cognitiva — revisão hierárquica em 4 papéis (Crítico → Apoiador → Questionador → Maestro) antes de decisões importantes. Triggers `/banda <questão>` ou usuário pede "pensa bem" / "critica" / "segunda opinião".
---

# /banda — Banda Cognitiva

> **Script:** `bun scripts/banda.ts` | **Integração:** `docs/governance/PREMORTEM_BANDA_INTEGRATION.md`
> **Princípio:** nenhuma decisão importante passa por uma única perspectiva. 4 papéis sequenciais — cada um vê o output do anterior.

## Quando invocar

- Antes de decisão importante com trade-offs não-óbvios
- Quando usuário pede "pensa bem", "critica isso", "segunda opinião", "tem certeza?"
- Após `/premortem` em Red Zone — banda delibera sobre os riscos mapeados
- Ao comparar duas abordagens com consequências sérias (Opção A vs B)

## Papéis (ordem obrigatória)

| # | Papel | Postura | Input |
|---|-------|---------|-------|
| 1 | Crítico Extremo | Adversarial construtivo | Questão + contexto |
| 2 | Apoiador Máximo | Maximiza potencial | Questão + output do Crítico |
| 3 | Questionador | Socrático — questiona premissas | Questão + outputs 1+2 |
| 4 | Maestro | Executivo — sintetiza decisão | Todos os outputs anteriores |

## Como usar

**Via script (com contexto de arquivo):**
```bash
bun scripts/banda.ts \
  --question "Devemos migrar para MongoDB?" \
  --context "@docs/audits/premortem-mongodb.md" \
  --mode default
```

**Modos:**
- `default` — Sonnet 4.6 em todos (~$0.20/banda)
- `economico` — Haiku 4.5 em todos (~$0.05/banda)
- `council` — GPT-5.4 / Sonnet / Gemini 2.5 Pro / Opus 4.7 (~$1-3/banda, máx qualidade)

## Cuidado adicional: Red Zone

Decisões em Red Zone (copy pública, pricing, arquitetura irreversível, deploy produção com tráfego real, segurança/setores regulados) devem passar por `/premortem` **antes** de `/banda`:

```
1. /premortem → identifica modos de falha + mitigações
2. /banda     → delibera se vale executar mesmo com os riscos mapeados
```

Se chegar direto em `/banda` sem premortem em Red Zone, o Crítico Extremo deve perguntar: "Foi feito premortem? Se não, recomendo rodar /premortem primeiro."

## Output

- Console: síntese do Maestro (YAML com decisão, ação escolhida, próximo passo)
- Arquivo: `docs/banda/YYYY-MM-DD-<slug>.yaml` (trace completo dos 4 papéis)

## Anti-padrão

- Usar banda para decisões triviais (ruído > sinal — custo desnecessário)
- Pular a ordem dos papéis (sequencial é intencional — cada papel calibra o próximo)
- Ignorar recomendação ABORTAR do Crítico sem gate explícito de Enio
- Usar em Red Zone sem ter feito `/premortem` antes