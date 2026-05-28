# SWARM COMMIT POLICY — Sprints com agentes paralelos

> **Versão:** 1.0 | **Data:** 2026-05-20 | **Status:** canonical T2
> **Origem:** Sprint MCP-FULL-ADMIN 2026-05-20 — 3+ tentativas de commit Opus falharam silenciosamente por race condition com Sonnet agents em background.
> **Aplicação:** TODA sessão Claude Code que despache 1+ agentes em background via `Agent` tool.

---

## 🎯 Regra principal

**Em sprint com agentes paralelos ativos, NÃO commitar incrementalmente da janela principal.**

Os agentes em background fazem `git add` + `git commit` dos próprios arquivos. Tentar commitar do Opus em paralelo causa:

1. **Race condition**: agente modifica arquivos enquanto pre-commit hook roda (30-90s)
2. **Staged drift**: meu `git add` pega arquivos que o agente acabou de modificar
3. **Commit failures silenciosos**: hook falha em validações (doc-drift, typecheck, governance sync) por conta de estado misto
4. **Friction loops**: 2-3 tentativas seguidas que terminam com staged area no mesmo estado

---

## 📋 Sintomas (quando detectar essa situação)

- `git status` mostra arquivos staged que VOCÊ não adicionou (foram agentes)
- `git commit` em background termina exit 0 mas `git log` mostra HEAD inalterado
- Pre-commit hook leva >2min (normal: 30-60s) — provavelmente porque arquivo mudou durante hook
- `pgrep husky` retorna processos múltiplos
- Tentativa de re-commit gera diferente staged set
- Friction detector dispara 2+ vezes seguidas no mesmo contexto

---

## ✅ Procedimento correto

### Durante o sprint (agentes ativos):

1. **Janela Opus NÃO faz git commit/git add/git stash**
2. Trabalho cirúrgico do Opus (edição de arquivos NÃO conflitantes) é OK — fica unstaged até o fim
3. Agentes Sonnet/Haiku fazem seus próprios commits incrementais — não interferir
4. Se precisar testar smoke local ou rodar typecheck: só leitura/build, sem commit

### Final do sprint (quando todos agentes retornam):

1. Verificar todos agentes terminaram (`ps`, notificação background, etc)
2. Aguardar ~30s para garantir que último agente fechou tudo
3. Rodar `git status` — ver estado real
4. Fazer **UM commit consolidado** com:
   - Trabalho do Opus (TASKS.md, CAPABILITY_REGISTRY.md, docs, etc)
   - Arquivos staged dos agentes que não foram commitados isoladamente
5. Push origin/main com `bash scripts/safe-push.sh`

---

## 🚫 Anti-patterns confirmados

- ❌ Commit em background com `&` + Monitor — não acelera, só esconde falha
- ❌ Tentar 3+ vezes o mesmo commit esperando que funcione
- ❌ `git stash` durante sprint — agentes podem perder rastro do estado
- ❌ `git add -A` — sempre arquivos específicos (regra T0 #4 separada)
- ❌ Skip hooks com `--no-verify` — viola regra T0 (nunca skip hooks sem autorização)

---

## 🔒 Enforcement futuro

### `/start` v6.10+
Adicionar Layer de detecção: se houver `Agent` running quando user pede commit, agente AVISA antes de tentar.

### Pre-commit hook
Adicionar check em `scripts/check-swarm-active.ts`:
```bash
# Conta processos Sonnet/Haiku ativos no mesmo working tree
ACTIVE_AGENTS=$(pgrep -f "claude.*sonnet\|claude.*haiku" | wc -l)
if [ "$ACTIVE_AGENTS" -gt 0 ]; then
  echo "⚠️  $ACTIVE_AGENTS agentes ativos. Recomendado aguardar antes de commit."
  echo "   Override: EGOS_ALLOW_SWARM_COMMIT=1"
fi
```
Warn-only inicialmente, não bloqueia.

### CLAUDE.md §6
Referência adicionada (versão atual).

---

## 📝 Resumo de bolso

```
Sprint com agentes paralelos:
  → Opus NÃO commita durante o sprint
  → Agentes commitam seus próprios arquivos
  → Trabalho Opus fica unstaged/staged até o fim
  → No final: UM commit consolidado + push

Detecção de problema:
  → pre-commit hook >2min sem terminar
  → 2+ tentativas commit falham silenciosamente
  → friction detector dispara repetidamente
  → STOP, aguardar agentes
```

---

*v1.0 — 2026-05-20 (originado de sprint MCP-FULL-ADMIN, race condition entre Opus + Sonnet Fases 1-2)*
