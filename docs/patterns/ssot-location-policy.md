# SSOT Location Policy — egos kernel only

> **Status:** ACCEPTED — regra T1 canonical
> **Data:** 2026-05-18 | **Decisor:** o mantenedor | **Autor:** Claude Sonnet 4.6
> **Origem:** o mantenedor 2026-05-18 — *"como vou achar SSOT/canonical no 852? ou no forja? o lugar correto é sempre o EGOS framework"*

---

## §1. Decisão

**Todo SSOT (Single Source of Truth) e todo doc canônico do EGOS mora em `github.com/enioxt/egos` (kernel).**

Leaf-repos (feature-repos, tools, integrations) **não podem** declarar nada como "canonical" ou "SSOT". Devem **apontar** para o canonical no kernel via `UPSTREAM_KERNEL.md`.

## §2. Por quê

1. **Achabilidade.** o mantenedor (e qualquer agente) precisa saber **onde procurar**. 1 lugar > N lugares.
2. **Drift.** Quando o canonical mora num leaf, mudanças no kernel não propagam — e mudanças no leaf não voltam para a base. Resultado: documentação desatualizada (caso 852 == canonical, contradito por handoffs 2026-05-*).
3. **Cross-projeto.** Decisões arquiteturais valem para múltiplos projetos. Não podem viver no projeto que apenas as descobriu primeiro.
4. **Princípio EGOS já documentado.** `docs/CLAUDE.md` §7 SSOT map lista 18 domínios — todos apontam para arquivos no kernel. Leaf-canonical é violação desse mapa.

## §3. Regras enforçáveis

### §3.1 O que é "SSOT" para esta regra

Qualquer arquivo que:
- Tem `canonical`, `SSOT`, `source of truth`, `fonte única`, `fonte da verdade` no título/descrição/header
- Define padrão arquitetural cross-projeto
- Define schema, contrato, política, regra de governança
- É referenciado por 2+ projetos

Não é SSOT (pode ficar no leaf):
- Docs internos do projeto (`leaf/docs/onboarding.md`)
- Roadmap específico do projeto
- Decisões locais (`leaf/docs/decisions/local-X.md`)
- README do leaf

### §3.2 Onde no kernel cada tipo mora

| Tipo | Path canonical (em `egos/`) |
|---|---|
| Capabilities reutilizáveis | `docs/CAPABILITY_REGISTRY.md` |
| Architecture decisions (ADRs) | `docs/governance/` |
| Module standards (chatbot/admin/auth/etc) | `docs/modules/` |
| Integration registry | `docs/INTEGRATION_REGISTRY.md` |
| Multi-LLM orchestration | `docs/governance/MULTI_LLM_ORCHESTRATION.md` |
| MCP architecture | `docs/governance/MCP_*.md` |
| Hermes fork | `docs/governance/HERMES_EGOS_FORK_DECISION.md` |
| Capability backlog cards | `docs/capabilities/CBC-*.md` |
| Cross-repo routing | `docs/CROSS_REPO_CONTEXT_ROUTER.md` |
| Coordination patterns | `docs/COORDINATION.md` + `COORDINATION_PATTERN.md` |
| Quorum decisions | `docs/quorum/YYYY-MM-DD-<topic>/` |
| Tasks (cross-projeto) | `TASKS.md` (kernel) |
| Tasks (projeto-local) | `<leaf>/TASKS.md` (não duplica cross-projeto) |

### §3.3 Padrão de propagação para leaf

Cada leaf-repo deve ter:

1. **`<leaf>/docs/UPSTREAM_KERNEL.md`** — apontando para o canonical:

```markdown
# Upstream Kernel — EGOS Framework

> Este leaf-repo é guiado por SSOT no kernel EGOS.
> NÃO declarar canonical aqui — apontar para o kernel.

## Canonicals que governam este leaf

- Chatbot standards: `egos/docs/modules/CHATBOT_SSOT.md`
- Admin scaffold: `egos/docs/modules/ADMIN_SCAFFOLD_SSOT.md`
- Auth/Tenant: `egos/docs/modules/AUTH_TENANT_SSOT.md`
- Integration registry: `egos/docs/INTEGRATION_REGISTRY.md`
- (etc)

## Última sincronização
- kernel commit: <SHA>
- data: <YYYY-MM-DD>
- aplicado por: <agente|humano>
```

2. **`<leaf>/AGENTS.md`** — sempre começa com `<!-- PROPAGATED FROM egos@<SHA> -->`

3. **Leaf-specific extensions** ficam em `<leaf>/docs/extensions/` claramente marcados como "delta deste projeto, não canônico cross-projeto"

## §4. Enforcement

### §4.1 Pre-commit hook

`<leaf>/.husky/_checks/11-leaf-canonical-check.sh` (novo) — bloqueia commit em leaf se detectar:
- arquivo novo com `canonical`/`SSOT` no header sem flag `LOCAL_DECISION`
- alteração em `<leaf>/docs/modules/*` (deveria ser no kernel)

### §4.2 `/start` v6.10+ (kernel skill)

Layer 4.6 (leaf-repo SSOT discovery) — quando cwd é leaf, **sempre** ler `UPSTREAM_KERNEL.md` E **avisar** se kernel commit referenciado é > 7 dias mais antigo que `egos@HEAD`. Force re-propagação.

### §4.3 `/end` v6.3+ (kernel skill)

Phase 7 (Disseminate) — quando sessão tocou em decisão arquitetural cross-projeto, **bloquear `/end`** até confirmar:
- Decisão consolidada no kernel (não no leaf onde foi descoberta)
- `UPSTREAM_KERNEL.md` dos leafs afetados atualizado

### §4.4 `/disseminate` (kernel skill)

Após mudança em `egos/docs/CAPABILITY_REGISTRY.md` ou `docs/governance/`, rodar `/disseminate` para propagar para leafs via PR ou direct commit (conforme política do leaf).

## §5. Migração — leafs que hoje violam

| Leaf | Violação atual | Como migrar |
|---|---|---|
| tool-repo-A | `README.md` "Implementação canônica de referência" | Renomear para "Implementação de referência do padrão kernel" + adicionar `UPSTREAM_KERNEL.md` |
| feature-repo-B | docs próprios sem `UPSTREAM_KERNEL.md` | Criar `UPSTREAM_KERNEL.md` apontando para kernel; remover qualquer claim de "canonical" |
| standalone-client | 100% standalone (não usa kernel `@egos/*`) | Caso especial: tratá-lo como cliente independente (não leaf), mas extrair admin-scaffold canonical para kernel |
| integration-repo | docs governance no leaf | Mover para `egos/docs/<domain>/` (subpath kernel) |
| plugin-host | docs próprios + plugins | Plugins = código (OK ficar no leaf). Decisões de policy = canonical no kernel `docs/governance/HOST_*.md` |

## §6. Exceções

- **Code SSOT** (não doc) pode ficar no leaf se for específico do projeto (ex: tabelas Supabase de Carteira-Livre).
- **Hermes plugins** ficam em `hermes-egos/plugins/` (é código, não decisão arquitetural).
- **Migrations Supabase** ficam no projeto que as usa (mas decisão de schema é canonical no kernel).

## §7. Refs

- `docs/COORDINATION_PATTERN.md` CRC-PATTERN-v1 (2026-04-26)
- `docs/INCIDENTS/INC-009-leaf-silo-work.md`
- `~/.claude/CLAUDE.md` §7 (SSOT Map)
- INC-009 (leaf-silo work) — pattern original do problema

---

*v1.0 — 2026-05-18 | Aceito pelo mantenedor em sessão 2026-05-18*
