# 🔧 MCP Tool Quality Framework

**Version:** 1.0.0  
**Created:** 2025-12-11  
**Sacred Code:** 000.111.369.963.1618

---

## 📖 Propósito

Este documento define o **padrão de qualidade** para todas as tools MCP do EGOSv5.
Ele estabelece como analisar, avaliar e melhorar tools para que cumpram seu papel
no ecossistema Mycelium.

---

## 🔍 Processo de Análise (5 Etapas)

### Etapa 1: Inventário

Listar todas as tools do servidor MCP e agrupar por domínio funcional.

```bash
# Extrair tools do egos-core.ts
grep -E "name: \"[a-z_]+\"" .windsurf/servers/egos-core.ts
```

**Grupos Funcionais:**
- **GUARANI:** Identidade, preferências, arquitetura do agente
- **SYSTEM:** Diagnóstico, status, configuração
- **TASKS:** Gerenciamento de tarefas (CRUD)
- **KNOWLEDGE:** Busca semântica, RAG, web search
- **PATTERNS:** Detecção de padrões psicológicos
- **HANDOFF:** Continuidade entre sessões
- **COMMUNITY:** Contribuições, recompensas
- **NEXUS:** Compilação de prompts

### Etapa 2: Leitura do Código

Para cada tool, responder:
- **O que faz?** (Descrição funcional)
- **Como faz?** (Implementação técnica)
- **Com que recursos?** (DB, APIs, Filesystem)

### Etapa 3: Aplicação do Framework de Avaliação

Cada tool é avaliada em **5 dimensões** (0-20 pontos cada):

| Dimensão | Peso | Pergunta Chave |
|----------|------|----------------|
| **PROPÓSITO** | 20% | A tool faz o que sua descrição promete? |
| **PROFUNDIDADE** | 20% | Vai além do básico? Testa conexões reais? |
| **CONFIABILIDADE** | 20% | Trata erros? Tem fallbacks? Timeouts? |
| **INTEGRAÇÃO** | 20% | Conversa com outras tools? Usa cache? |
| **VALOR** | 20% | O output ajuda na tomada de decisão? |

#### Níveis de Profundidade

| Nível | Descrição | Exemplo |
|-------|-----------|---------|
| 1 | Apenas verifica existência | `fs.existsSync(path)` |
| 2 | Lê e retorna dados | `fs.readFileSync(path)` |
| 3 | Testa conexões reais | `await supabase.from('x').select()` |
| 4 | Auto-corrige problemas | Rename corrupted file, retry |
| 5 | Orquestra outras tools | Sugere `mycelium_triggers` |

### Etapa 4: Classificação

| Nota | Status | Ação Recomendada |
|------|--------|------------------|
| 0-40 | 🔴 CRÍTICO | Reescrever urgente |
| 41-60 | 🟡 BÁSICO | Melhorar significativamente |
| 61-80 | 🟢 BOM | Ajustes pontuais |
| 81-100 | ⭐ EXCELENTE | Modelo a seguir |

### Etapa 5: Priorização

Ordenar por: **Impacto × Facilidade**

| Tool | Impacto | Facilidade | Prioridade |
|------|---------|------------|------------|
| system_diagnostic | Alto | Média | **P0** |
| get_tasks_summary | Alto | Alta | **P1** |
| validate_entropy | Baixo | Alta | **P2** |

---

## 🏗️ Padrão de Implementação

### Template: Tool Padrão Mycelium

```typescript
async function myTool(args: ToolArgs): Promise<ToolResult> {
  // ========================================
  // 1. VALIDAÇÃO DE ENTRADA
  // ========================================
  if (!args?.required_param) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ error: "Missing required_param" })
      }],
      isError: true
    };
  }

  // ========================================
  // 2. CACHE CHECK (se aplicável)
  // ========================================
  const cacheKey = `tool_name:${args.param}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ ...cached, _meta: { cached: true } })
      }]
    };
  }

  // ========================================
  // 3. EXECUÇÃO PARALELA (quando possível)
  // ========================================
  const [resultA, resultB] = await Promise.all([
    fetchDataA().catch(e => ({ error: e.message })),
    fetchDataB().catch(e => ({ error: e.message }))
  ]);

  // ========================================
  // 4. PROCESSAMENTO COM FALLBACK
  // ========================================
  let finalResult;
  try {
    finalResult = processData(resultA, resultB);
  } catch (e) {
    // Fallback: usar dados parciais ou defaults
    finalResult = {
      partial: true,
      data: resultA.error ? resultB : resultA
    };
  }

  // ========================================
  // 5. CACHE SET
  // ========================================
  cache.set(cacheKey, finalResult, TTL_SECONDS);

  // ========================================
  // 6. MYCELIUM TRIGGERS (auto-regulação)
  // ========================================
  const triggers: string[] = [];
  if (finalResult.hasIssues) {
    triggers.push("search_telemetry_logs");
  }
  if (finalResult.needsValidation) {
    triggers.push("validate_handoff");
  }

  // ========================================
  // 7. RETORNO ESTRUTURADO
  // ========================================
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        ...finalResult,
        _meta: {
          cached: false,
          timestamp: new Date().toISOString(),
          version: "1.0.0",
          mycelium_triggers: triggers.length > 0 ? triggers : undefined
        }
      }, null, 2)
    }]
  };
}
```

---

## ✅ Checklist Pré-Deploy

Antes de fazer merge de uma nova tool ou modificação:

### Obrigatório
- [ ] Tool tem `try/catch` em TODAS as operações externas
- [ ] Tool tem fallback para cenários de falha
- [ ] Tool retorna JSON estruturado (não strings soltas)
- [ ] Tool inclui `_meta.timestamp` no output
- [ ] Tool está documentada no `ListToolsRequestSchema`
- [ ] Descrição da tool é precisa e útil

### Recomendado
- [ ] Tool usa cache quando apropriado (SimpleCache)
- [ ] Tool considera `mycelium_triggers` se apropriado
- [ ] Tool usa execução paralela quando possível (`Promise.all`)
- [ ] Tool tem timeout em chamadas externas

### Proibido
- [ ] ❌ Retornar apenas `true/false` sem contexto
- [ ] ❌ Ignorar erros silenciosamente
- [ ] ❌ Hardcode de paths (usar constantes)
- [ ] ❌ Assumir que recursos externos estão disponíveis

---

## 🌐 Conceito Mycelium

### O que é?

Mycelium é o padrão de **interconexão** entre tools. Assim como a rede de fungos
conecta árvores em uma floresta, nossas tools devem se comunicar e colaborar.

### Mycelium Triggers

Uma tool pode sugerir que outra seja executada em sequência:

```typescript
// Em system_diagnostic
if (connectivity.supabase.status === "FAIL") {
  mycelium_triggers.push("search_telemetry_logs");
}

if (overall.score < 50) {
  mycelium_triggers.push("get_tasks_summary");
  mycelium_triggers.push("validate_handoff");
}
```

O **agente** (Cascade) lê esses triggers e decide se executa.

### Diagrama de Interconexões

```
                    ┌─────────────────────┐
                    │  system_diagnostic  │ ← Hub Central
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│    HEALTH     │    │     DATA      │    │    ACTION     │
│  mcp_status   │    │search_knowledge│   │   add_task    │
│validate_handoff│   │search_telemetry│   │compile_nexus  │
│get_windsurfrules│  │get_tasks_summary│  │detect_patterns│
└───────────────┘    └───────────────┘    └───────────────┘
        │                      │                      │
        └──────────────────────┴──────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │    MYCELIUM BUS     │
                    │  (Event Triggers)   │
                    └─────────────────────┘
```

---

## 📊 Métricas de Sucesso

| Métrica | Antes | Meta |
|---------|-------|------|
| Tools Críticas (< 50) | 4 | 0 |
| Tools Básicas (50-60) | 7 | 2 |
| Tools Boas (61-80) | 12 | 15 |
| Tools Excelentes (81+) | 4 | 10 |
| Avg Score | 62 | 75+ |
| Tools com Mycelium | 0 | 10+ |

---

## 🔄 Manutenção

- **Revisão:** Trimestral
- **Responsável:** Cascade + o mantenedor
- **Localização:** `.guarani/standards/`

---

*"Tools não são ilhas. São nós de uma rede viva."*
