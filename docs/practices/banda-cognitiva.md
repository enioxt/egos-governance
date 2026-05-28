# Banda Cognitiva — Framework dos 4 Papéis

> **Parent:** [OPUS_MODE_V1.md](OPUS_MODE_V1.md) §4
> **Versão:** 1.0.0 — 2026-04-23
> **Modo implementação:** Hierárquico sequencial (escolha aprovada 2026-04-23)

## O que é

Um protocolo de revisão interna antes de decisões importantes. Quatro papéis que o agente assume em **sequência** (não paralelo), cada um lendo o output do anterior, terminando com uma síntese do Maestro.

## Quando ativar

### ATIVA

- Mudanças estruturais (arquitetura, migrations, frozen zones)
- Decisões de produto/monetização (pricing, canais, distribuição)
- Trade-offs com múltiplas opções viáveis sem resposta óbvia
- Antes de publicação externa (artigo, X post, material para cliente)
- Comandos explícitos: `/banda <questão>` ou "pensa bem", "me dá segunda opinião", "critica"

### NÃO ATIVA

- Bugs simples, typos, formatação
- Refactors triviais
- Respostas factuais ("o que é X?")
- Tarefas com resposta óbvia
- Operações rotineiras já definidas em SSOT

## Os 4 papéis

### 1. Crítico Extremo (executa primeiro)

**Postura:** adversarial construtivo. Não está tentando ser legal.

**Perguntas obrigatórias:**
- O que pode dar errado nesta decisão?
- Existe risco de segurança ou privacidade?
- Cria dependência frágil? De qual lado?
- Risco de alucinação ou falsa confiança?
- Duplicamos algo que já existe no ecossistema?
- Pode quebrar deploy, dados ou fluxo de trabalho?
- Qual o pior cenário em 30/90/365 dias?
- Como isso falha sob carga, erro ou malícia?

**Output:**
```yaml
critico:
  riscos: [lista priorizada — maior risco primeiro]
  pior_cenario: <descrição concreta>
  duplicacoes_detectadas: [se houver]
  dependencias_frageis: []
  recomendacao: ABORTAR | MITIGAR | SEGUIR_COM_RESSALVAS
  ressalvas: [se aplicável]
```

### 2. Apoiador Máximo (lê a crítica, executa em seguida)

**Postura:** maximizar o potencial. Não ignora a crítica — responde a ela.

**Perguntas obrigatórias:**
- Qual o maior potencial desta ideia?
- Como as falhas apontadas pelo Crítico viram features?
- Como aproveitar o que já existe no EGOS?
- Como isso fortalece estruturalmente o ecossistema?
- Como vira regra, ferramenta ou fluxo reusável?
- Que efeito de rede isso pode criar?
- Que habilidade nova o Enio/sistema ganha?

**Output:**
```yaml
apoiador:
  potencial_maximo: <descrição>
  falhas_do_critico_respondidas:
    - falha: <do crítico>
      resposta: <como vira feature>
  reuso_egos: [o que já existe que se conecta]
  efeito_rede: <se houver>
  recomendacao: AMPLIFICAR | EXECUTAR | REFINAR_PRIMEIRO
```

### 3. Questionador (lê os dois)

**Postura:** socrático. Não defende nenhum lado — questiona as premissas.

**Perguntas obrigatórias:**
- Por que fazer assim?
- Existe caminho mais simples que resolve 80%?
- O objetivo está claro ou estamos em fuga?
- Estamos resolvendo causa ou sintoma?
- Isso respeita ética, autonomia e governança do EGOS?
- O que está implícito que precisamos explicitar?
- Que pergunta ninguém fez ainda?

**Output:**
```yaml
questionador:
  premissas_implicitas: []
  caminho_mais_simples: <se existir>
  causa_vs_sintoma: <análise>
  questoes_nao_feitas: []
  alinhamento_egos: OK | TENSAO | CONTRADICAO
  reformulacao_sugerida: <se houver>
```

### 4. Maestro (síntese final)

**Postura:** executivo. Lê os 3 outputs anteriores e decide.

**Não defende nenhum dos anteriores.** Seu papel é destilar.

**Output (formato obrigatório):**
```yaml
decisao:
  contexto: <o que estamos decidindo em 1 frase>
  evidencias:
    - <file:line ou fonte verificável>
  critica_principal: <do Crítico — 1 linha>
  potencial_principal: <do Apoiador — 1 linha>
  duvida_principal: <do Questionador — 1 linha>
  acao_escolhida: <concreta, com estimativa de tempo>
  acao_rejeitada: <o que NÃO fazer e por quê>
  ressalvas_aplicadas: [do Crítico, se MITIGAR]
  proximo_passo: <concreto, executável imediatamente>
  prioridade: 1 | 2 | 3 | 5 | 8
  gate_decisao: <quem precisa aprovar antes de executar>
```

## Apresentação ao usuário

**Regra:** mostre apenas o output do Maestro. Os 3 primeiros são raciocínio interno.

Se o usuário quiser ver os 3 passos, expandir sob demanda:
- "mostra a crítica" → expande seção 1
- "mostra o apoiador" → expande seção 2
- "mostra as premissas" → expande seção 3

## Implementação técnica

### Opção escolhida: (c) Hierárquico sequencial

```
┌─────────────┐
│ Crítico     │ (1ª chamada LLM)
└─────┬───────┘
      ▼
┌─────────────┐
│ Apoiador    │ (2ª — recebe output do Crítico)
└─────┬───────┘
      ▼
┌─────────────┐
│ Questionador│ (3ª — recebe os 2 anteriores)
└─────┬───────┘
      ▼
┌─────────────┐
│ Maestro     │ (4ª — síntese)
└─────────────┘
```

**Custo:** 4 chamadas LLM. Tempo: ~15-30s dependendo do modelo.

**Modelo recomendado por papel:**
- Crítico → GPT-5.4 (rigoroso, enxerga riscos)
- Apoiador → Claude Sonnet 4.6 (construtivo)
- Questionador → Gemini 2.5 Pro (boa em framing)
- Maestro → Claude Opus 4.7 (síntese complexa)

**Modo econômico** (quando usar): se todos os 4 rodarem em Claude Sonnet 4.6 — custo ~$0.20 por Banda. Acima disso (council mode): ~$1-3 por Banda com modelos diferentes.

## Comandos

| Comando | Ação |
|---------|------|
| `/banda <questão>` | Executa Banda completa, mostra só síntese |
| `/banda --verbose <questão>` | Mostra os 4 outputs |
| `/banda --economico <questão>` | Roda tudo em Sonnet (barato) |
| `/banda --council <questão>` | Cada papel em modelo diferente (caro, max quality) |

## Registro

Toda execução da Banda salva em:
- `docs/banda/YYYY-MM-DD-<slug>.yaml`
- Row em `kb_pages` category `meta/banda` tenant=`enio`

Isso permite análise futura: "em quais decisões a Banda discordou do Enio? Onde ela estava certa?"

---

*Sacred Code: 000.111.369.963.1618*
