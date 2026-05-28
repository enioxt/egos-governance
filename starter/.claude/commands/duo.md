---
name: duo
description: "Paralelismo Claude + Codex — resolve o mesmo task com dois modelos e sintetiza divergências. Use para decisões importantes onde uma segunda opinião independente agrega valor: refactors críticos, bugs difíceis, design de API. Flag --heavy escala Codex para gpt-5.5 (RARO — confirmar quota antes). Hard-cap sugerido: 4x/dia."
---

# /duo — Claude + Codex Paralelo

Você está executando `/duo`. Objetivo: resolver `$ARGUMENTS` com Claude (você) e Codex em paralelo, depois sintetizar.

## CONTRATO

1. **Verificar quota primeiro** — se 🔴, avisar e rodar só Claude
2. **Resolver task com Claude** (você) — response completa
3. **Disparar Codex** via `/codex:rescue $ARGUMENTS` ou bash
4. **Ler output Codex** de `reviews/` ou `/codex:result`
5. **Sintetizar** — mostrar divergências explicitamente

---

## PASSO 1 — Verificar quota Codex

```bash
EGOS_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "$HOME/egos")
CODEX_STATUS=$(bun "$EGOS_ROOT/scripts/codex-usage.ts" --json 2>/dev/null || echo '{"alarm_level":"unknown"}')
ALARM=$(echo "$CODEX_STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('alarm_level','unknown'))" 2>/dev/null || echo "unknown")
PCT=$(echo "$CODEX_STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); v=d.get('window_5h_remaining_pct'); print(v if v is not None else '?')" 2>/dev/null || echo "?")

echo "Codex quota: 5h ${PCT}% [${ALARM}]"

if [ "$ALARM" = "red" ]; then
  echo "🔴 Codex quota crítica — /duo desabilitado. Rodando só Claude."
  exit 0
fi

# Flag --heavy: escala para gpt-5.5
HEAVY=$(echo "$ARGUMENTS" | grep -q "\-\-heavy" && echo "yes" || echo "no")
MODEL="gpt-5.3-codex"
if [ "$HEAVY" = "yes" ]; then
  MODEL="gpt-5.5"
  echo "⚠️  --heavy: usando gpt-5.5. Confirme que vale a quota."
fi
echo "Modelo Codex selecionado: $MODEL"
```

Se quota 🔴: informar e **não chamar Codex**. Claude resolve sozinho.

---

## PASSO 2 — Claude resolve

Resolva `$ARGUMENTS` completamente. Não pule esta etapa — o output de Claude é o baseline.

**Classifique sua resposta:** CONFIRMADO / INFERIDO / HIPÓTESE para cada claim.

---

## PASSO 3 — Disparar Codex

```bash
# Opção A (se codex-plugin-cc instalado): background job
echo "Dispatching Codex (model: $MODEL)..."
# /codex:rescue $ARGUMENTS --model $MODEL --background
# Depois: /codex:result para ver output

# Opção B: exec direto (síncrono, para tasks rápidas)
echo "$ARGUMENTS" | codex exec --model "$MODEL" 2>&1 | tee /tmp/duo-codex-output.md
echo "Codex output salvo em /tmp/duo-codex-output.md"
```

---

## PASSO 4 — Sintetizar divergências

Após receber output Codex:

**Formato de saída obrigatório:**

```
## /duo Synthesis — $ARGUMENTS

### Claude diz:
[resumo 2-3 linhas do que Claude propôs]

### Codex diz:
[resumo 2-3 linhas do que Codex propôs]

### Divergências identificadas:
- [item 1]: Claude→X | Codex→Y | **Recomendação:** [escolha + motivo]
- [item 2]: Acordo ✅

### Síntese final:
[o que implementar, baseado no melhor de ambos]

### Quota consumida: [model usado] | 5h restante: [%]
```

---

## Regras de uso

- **Máx 4x/dia** (informativo — não enforced automaticamente)
- **`--heavy` = gpt-5.5**: só para tasks que valem a quota. Decisões de arquitetura, security review crítica.
- **Não auto-aplicar** fixes do Codex sem Enio revisar a síntese
- **Fallback Claude-only** se Codex timeout ou quota 🔴

---

## Rate limit tracking

```bash
# Verificar uso do dia
grep "duo" ~/.codex/sessions/2026/$(date +%m-%d)* 2>/dev/null | wc -l || echo "0 sessions today"
```
