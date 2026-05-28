# Council Protocol — Orquestração Multi-LLM

> **Parent:** [OPUS_MODE_V1.md](OPUS_MODE_V1.md) §7
> **Versão:** 1.0.0 — 2026-04-23

## O que é

Protocolo para convocar múltiplos LLMs de providers diferentes (Claude + GPT + Gemini + outros) para decisões **irreversíveis** ou de alto impacto. Diferente da Banda Cognitiva (4 papéis no mesmo LLM), o Council usa **modelos diferentes** para garantir diversidade de viés.

## Quando convocar

### CONVOCA

- **Frozen zone changes** (`.husky/pre-commit`, `.guarani/orchestration/*`, `agents/runtime/*`)
- **Mudanças irreversíveis de dados** (drop table, migration que perde histórico, reset de tenant)
- **Estratégia comercial** (pivot de modelo de negócio, mudança de pricing)
- **Arquitetura de segurança** (RBAC, auth, crypto, credential handling)
- **Publicação externa** (artigo público, pitch investor, client-facing material)
- **Comando explícito:** `/council <questão>`

### NÃO CONVOCA

- Decisões reversíveis (mesmo que estruturais, se dá pra rollback facilmente)
- Implementação de features já decididas
- Debugging
- Respostas factuais

## Modelos no Council

### Tier 1 — Frontier (obrigatório para decisões críticas)

| Modelo | Provider | Quando |
|--------|----------|--------|
| Claude Opus 4.7 | Anthropic | Moderação e síntese final |
| GPT-5.4 | OpenAI | Crítica rigorosa, segunda opinião adversarial |
| Gemini 2.5 Pro | Google | Framing amplo, deep context |

### Tier 2 — Specialist (opcional, por tarefa)

| Modelo | Quando adicionar |
|--------|------------------|
| DeepSeek V3 | Decisões envolvendo cálculo matemático ou análise bulk |
| Grok 4 | Decisões que dependem de sentimento público atual (web real-time) |
| Qwen 2.5 72B | Decisões com PT-BR heavy ou contexto monorepo |

### Tier 3 — Fallback (backup se Tier 1 falhar)

- Claude Sonnet 4.6 (fallback de Opus)
- GPT-4o (fallback de GPT-5.4)
- Gemini 2.5 Flash (fallback de Pro)

## Protocolo de execução

### Fase 1 — Preparação

```yaml
council_request:
  id: <uuid>
  data: <ISO8601>
  questao: <pergunta em 1-3 frases, sem viés>
  contexto: <máx 500 palavras — evidências, estado atual>
  opcoes_identificadas: [<opção A>, <opção B>, ...]  # se houver
  criterio_decisao: <o que uma boa resposta precisa ter>
  restricoes: [<budget, tempo, legal, ética>]
  solicitante: <Enio | agente-interno>
  gate: <quem aprova decisão final>
```

**Regra de prompt:** a mesma questão vai para todos os modelos, SEM indicar que outros modelos receberão a mesma pergunta.

### Fase 2 — Submissão paralela

Três (ou mais) chamadas API concorrentes:
- Mesma `question` + `context` + `decision_criteria`
- Temperature 0.2-0.4 (não muito criativo, mas sem ser determinístico)
- Max tokens output: 2000
- Formato de resposta obrigatório:

```yaml
resposta:
  opcao_recomendada: <A | B | C | outra>
  argumentos:
    - <pro ponto>
  contra_argumentos:
    - <risco ou objeção>
  evidencias_consideradas: []
  confianca: alta | media | baixa
  condicoes_de_reavaliar: [<se X, revisite>]
  alternativa: <se a principal falhar>
```

### Fase 3 — Síntese

Executada pelo **agente principal** (Claude Sonnet/Opus no Claude Code):

```yaml
sintese_council:
  concordancia:
    - <ponto onde todos concordam>
  discordancia:
    - ponto: <tema>
      modelos_A: [<modelos que pensam assim>]
      modelos_B: [<modelos que discordam>]
      resolucao: <qual venceu e por quê>
  consenso_final: <se houver>
  divergencia_residual: <se não houver consenso>
  recomendacao_ao_usuario: <ação sugerida>
  evidencia_de_cada_modelo: {modelo: url_ou_log}
```

### Fase 4 — Gate humano

Council **nunca decide sozinho**. Output final sempre vai para o usuário (Enio) com:
- Síntese (1-2 parágrafos)
- Tabela de concordância/discordância
- Ação recomendada
- Botão: "aprovo" / "revisa ponto X" / "pula esta decisão"

**Só após aprovação explícita, o agente executa.**

### Fase 5 — Registro

Tudo salvo em:
- `docs/quorum/YYYY-MM-DD-<slug>/` com 1 arquivo por modelo + síntese
- Row em `kb_pages` category `meta/council` tenant=`enio`
- Commit no repo com reference ao council ID

Exemplo de estrutura:
```
docs/quorum/2026-04-23-should-opus-mode-replace-claude-md/
├── README.md                          # questão + síntese final
├── claude-opus-4-7.md                 # resposta bruta
├── gpt-5.4.md
├── gemini-2.5-pro.md
├── deepseek-v3.md                     # se foi adicionado
└── synthesis.md                       # análise cruzada do agente
```

## Custos reais

| Configuração | Custo por council | Tempo |
|--------------|-------------------|-------|
| 3 frontier (Opus+GPT5.4+Gemini Pro) | ~$2-4 | 30-60s |
| 3 frontier + 1 specialist | ~$3-5 | 45-90s |
| 5 modelos (incl. fallbacks) | ~$5-10 | 60-120s |
| Modo econômico (3× Sonnet com prompts variados) | ~$0.30 | 15-30s |

## Exemplos de uso

**Exemplo 1 — Decisão irreversível (migration destrutiva):**
```
/council Devemos fazer DROP da tabela kb_pages_v1 após migrar 369 páginas para kb_pages v2? Há 30 dias de dados que não foram incluídos por erro.
```
→ Council convoca 3 modelos → detecta risco → síntese recomenda backup antes de drop.

**Exemplo 2 — Estratégia comercial:**
```
/council Vale a pena começar caminho C2 (LLM vertical) agora ou esperar 5 clientes em C1?
```
→ Council com especialistas em startups → síntese com cálculos.

**Exemplo 3 — Frozen zone:**
```
/council Podemos adicionar novo check no pre-commit que bloqueia commit se TASKS.md > 1000 linhas?
```
→ Council avalia impacto em governance.

## Implementação técnica

### Backend

`scripts/council.ts`:
```typescript
interface CouncilRequest {
  question: string;
  context: string;
  decisionCriteria: string;
  models: Array<'claude-opus-4-7' | 'gpt-5.4' | 'gemini-2.5-pro' | ...>;
}

async function runCouncil(req: CouncilRequest): Promise<CouncilResponse> {
  const responses = await Promise.all(
    req.models.map(model => callModel(model, req))
  );
  const synthesis = await synthesize(responses); // Claude Sonnet
  await saveToQuorum(req, responses, synthesis);
  return { synthesis, responses, council_id };
}
```

**Providers via OpenRouter** (recomendado): 1 API key para todos. Ver §7 de OPUS_MODE_V1.md.

### UI no HQ

Endpoint `/enio/council` exibe:
- Lista de councils passados (últimos 20)
- Click → abre com os 3 outputs + síntese + decisão tomada + resultado observado

### Gate de execução

Council que resulta em "executar ação" gera task em TASKS.md com ID `COUNCIL-<slug>-<N>` até o Enio aprovar.

## Falha e fallback

Se um modelo não responder em 90s:
1. Retry uma vez
2. Se falhar de novo: substitui pelo Tier 3 fallback
3. Se 2+ modelos falharem: notifica Enio, pausa council, não decide

Nunca "decide com menos modelos" silenciosamente — se o protocolo não executou completo, o usuário precisa saber.

---

*Sacred Code: 000.111.369.963.1618*
