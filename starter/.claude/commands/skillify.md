---
description: /skillify — Converter workflow one-off em SKILL.md permanente. Triggered after completing any repeatable workflow. Runs 3-Question Test + 3-Scenario Test before saving.
---

# /skillify — One-off → Permanent Skill

> **Princípio (Garry Tan):** "When someone asks how I 'prompt' my AI, the answer is: I don't. The skills are the prompts."
> **Regra:** toda tarefa repetível merece uma skill. Toda skill merece os 3 testes antes de existir.

---

## CONTRATO DO AGENTE

1. Só executar APÓS um workflow ter sido concluído com sucesso nesta sessão
2. Gerar SKILL.md APENAS se o 3-Question Test passar (3/3)
3. Rodar 3-Scenario Test ANTES de salvar o arquivo
4. Nunca criar skill para workflow one-off genuíno (sem possibilidade de repetição)
5. SKILL.md deve ser auto-ativável por trigger de contexto

---

## PHASE 1 — Capturar o workflow concluído

```bash
echo "=== Skillify: capturando workflow desta sessão ==="
echo "Workflow identificado: [descrever em 1 linha o que acabou de ser feito]"
echo "Arquivos afetados: $(git diff --name-only HEAD~1 HEAD 2>/dev/null | head -10)"
```

Identificar:
- O que foi feito (o "job")
- Quais foram os passos principais (max 7)
- Qual foi o artefato final
- O que teria dado errado sem este workflow
- Com que frequência isso pode se repetir

---

## PHASE 2 — 3-Question Test (obrigatório antes de criar skill)

Responder as 3 perguntas. Se qualquer resposta for negativa → **NÃO criar skill**, registrar motivo.

**Q1: Esta tarefa vai se repetir em cenários diferentes?**
- Sim (com parâmetros variáveis) → PASS
- Sim (idêntica, nunca varia) → provavelmente vira CRON, não skill
- Não (context único, one-off real) → FAIL → parar aqui

**Q2: A qualidade melhora com instruções explícitas?**
- Sim (contexto e passos não são óbvios) → PASS
- Talvez (comportamento default já é bom o suficiente) → PASS com observação
- Não (modelo já faz isso naturalmente) → FAIL → parar aqui

**Q3: O custo de criar + manter a skill é menor que o benefício?**
- Skill terá uso ≥2x/mês → PASS
- Skill resolve erro recorrente real → PASS
- Skill seria criada por completude, nunca usada → FAIL → parar aqui

**Resultado:** 3/3 PASS → prosseguir | < 3 PASS → documentar em TASKS.md como `[CONCEPT]` apenas

---

## PHASE 3 — 3-Scenario Test

Antes de escrever a skill, simular 3 cenários:

1. **Happy path** — caso típico, tudo normal. O que o agente deve fazer passo a passo?
2. **Edge case** — input incompleto, arquivo faltando, ambiguidade. Como a skill deve lidar?
3. **Stress test** — contexto complexo, múltiplas variáveis. A skill mantém qualidade?

Se qualquer cenário não tiver comportamento claro → skill está mal especificada. Refinar antes de criar.

---

## PHASE 4 — Gerar SKILL.md

Criar em `.claude/skills/<slug>/SKILL.md` com o template:

```markdown
---
name: <nome em kebab-case>
description: <1-2 linhas do que faz + quando auto-ativar>
version: 1.0.0
created: <YYYY-MM-DD>
last_validated: <YYYY-MM-DD>
origin_workflow: <descrição do workflow que originou esta skill>
trigger_phrases:
  - "<frase que auto-ativa esta skill>"
  - "<outra frase>"
test_results:
  q1_repeatable: true
  q2_improves_with_instructions: true
  q3_cost_benefit_positive: true
  happy_path: PASS
  edge_case: PASS
  stress_test: PASS
---

# <Nome da Skill>

## Quando usar
<Triggers automáticos — quando o agente deve carregar esta skill sem ser chamado explicitamente>

## Contexto
<Por que esta skill existe — problema que resolve>

## Passos
1. <passo 1 — imperativo, acionável>
2. <passo 2>
...

## Edge cases
- **Se X acontecer:** fazer Y
- **Se arquivo faltar:** fazer Z

## Verificação de qualidade
- [ ] Artefato final gerado?
- [ ] Sem erros no console?
- [ ] Resultado validado por Enio (se necessário)?

## Exemplo de uso
\`\`\`
# Prompt de trigger
<exemplo de prompt que auto-ativa esta skill>
\`\`\`

## Não fazer
- <anti-pattern 1>
- <anti-pattern 2>

## Weekly Refinement
- Atualizar quando skill falhar → descrever o que falhou + fix aplicado
- Versionar com patch bump (1.0.0 → 1.0.1)
```

---

## PHASE 5 — Registrar no skill-discovery

```bash
# Verificar se packages/skill-discovery/src/index.ts indexa .claude/skills/ automaticamente
grep -r "claude/skills" packages/skill-discovery/src/ | head -5

# Se não indexar: adicionar entry manual no registry ou verificar aggregator.ts
cat packages/skill-discovery/src/aggregator.ts | head -30
```

Se aggregator não incluir `.claude/skills/`, reportar como task `SKILL-UNIF-001d` (já existe).

---

## PHASE 6 — Output final

Reportar:
```
✅ SKILLIFY COMPLETE
  Skill: .claude/skills/<slug>/SKILL.md
  Trigger phrases: <lista>
  3-Question Test: 3/3 PASS
  3-Scenario Test: PASS/PASS/PASS
  Skill-discovery: [indexado / pendente SKILL-UNIF-001d]
  Próxima revisão: <data em 30 dias>
```

---

## Quando NÃO usar /skillify

- Workflow aconteceu UMA vez e é contextual único
- O modelo já faz naturalmente (não precisa de instrução)
- Skill seria arquitetura antes de primeiro uso real
- Já existe skill similar em `.claude/skills/` — atualizar a existente em vez de criar nova

---

## Manutenção

**Weekly Refinement Cycle** — toda vez que uma skill falhar:
1. Identificar o que falhou (passo, edge case, falta de contexto)
2. Atualizar SKILL.md com o fix
3. Bump patch version (1.0.0 → 1.0.1)
4. Adicionar entrada no `## Weekly Refinement` da skill

**Decay:** se uma skill não foi usada em 90 dias → marcar como `deprecated` e mover para `.claude/skills/_deprecated/`.

---

*Origem: Garry Tan (GBrain) + Khairallah playbook + Browserbase Autobrowse "iteration=graduation" | 2026-05-11*
