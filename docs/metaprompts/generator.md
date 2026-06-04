# Metaprompt Generator — Concept & API Reference

> **Version:** 1.0.0 · **Updated:** 2026-06-03

---

## What it is

The EGOS Metaprompt Generator is a lightweight, stateless REST API that produces
structured prompts on demand. You send a template type and a task description; the API
returns a complete, ready-to-use prompt that embeds EGOS operating principles
automatically.

It solves a concrete problem: different agents and tools producing prompts ad-hoc
diverge in quality. The generator ensures every operation starts from a validated
structure — explicit assumptions, verification gates, minimum code — without copy-paste
errors.

**Key constraint:** the generator does not store state, does not access files from the
host filesystem at runtime, and does not expose any internal configuration. Templates
are strings compiled into the API code itself.

---

## Endpoints

### GET /api/v1/meta-prompts

List available templates. No authentication. CORS open.

**Request:**
```bash
curl https://your-api-host/api/v1/meta-prompts
```

**Response (200):**
```json
{
  "version": "1.0",
  "count": 6,
  "templates": [
    { "id": "task",      "title": "Task execution",            "description": "Structured prompt to implement a concrete task with verification gates." },
    { "id": "review",    "title": "Code / change review",      "description": "Adversarial review prompt that surfaces risks and unverified claims." },
    { "id": "research",  "title": "Research / investigation",  "description": "Prompt to investigate an open question and report findings with sources." },
    { "id": "inception", "title": "Project inception",         "description": "Prompt to scope a new project/domain before writing any code." },
    { "id": "premortem", "title": "Premortem",                 "description": "Assume the decision already failed; work backwards to mitigations." },
    { "id": "grok",      "title": "Signal Hunter",             "description": "Prompt optimized for real-time social/web search with structured output." }
  ],
  "usage": {
    "generate": "POST /api/v1/meta-prompts/generate",
    "body": { "type": "task|review|research|inception|premortem|grok", "task": "string (required)", "context": "string (optional)" }
  }
}
```

---

### POST /api/v1/meta-prompts/generate

Generate a structured prompt from a template.

**Request body:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `type` | string | yes (default: `task`) | One of the 6 template IDs |
| `task` | string | yes | Not empty, max 4000 chars |
| `context` | string | no | Inserted into the `## Context` block |

**Example (task):**
```bash
curl -X POST https://your-api-host/api/v1/meta-prompts/generate \
  -H "Content-Type: application/json" \
  -d '{"type":"task","task":"Add pagination to the orders list endpoint","context":"Using Fastify + Postgres, existing endpoint is GET /api/v1/orders"}'
```

**Example (premortem):**
```bash
curl -X POST https://your-api-host/api/v1/meta-prompts/generate \
  -H "Content-Type: application/json" \
  -d '{"type":"premortem","task":"Deploy new multi-tenant migration to production on Friday evening"}'
```

**Response (200):**
```json
{
  "type":   "task",
  "title":  "Task execution",
  "prompt": "# Task\nAdd pagination to the orders list endpoint\n\n## Context\n..."
}
```

**Errors:**

| HTTP | Cause |
|------|-------|
| 400 | Invalid JSON body |
| 400 | `task` field absent or empty |
| 400 | `task` > 4000 chars |
| 400 | Unknown `type` |

---

## The six public templates

### `task` — Task execution

Generates a prompt for implementing a concrete task with verification gates.

**Output sections:** `# Task` / `## Context` (if provided) / `## Plan` / `## Execute` / `## Verify` / `Operating principles`

**Key rule:** the `## Verify` section requires real proof before marking DONE — a test
result, curl output, or metric. Not having evidence = `[CONCEPT]`.

### `review` — Code / change review

Adversarial review that surfaces risks and unverified claims.

**Output sections:** `# Review target` / `## Review checklist` / `## Output` / `Operating principles`

**Key rule:** requires findings ordered CRITICAL / HIGH / MODERATE / LOW with `file:line`
as proof.

### `research` — Research / investigation

Investigates an open question and reports findings with classified sources.

**Output sections:** `# Research question` / `## Method` / `## Report` / `Operating principles`

**Key rule:** every claim must be classified CONFIRMED / INFERRED / HYPOTHESIS. No
source = PHANTOM, not INFERRED.

### `inception` — Project inception

Scopes a new project or domain before writing any code.

**Output sections:** `# New initiative` / `## Inception questions` / `## Output` / `Operating principles`

**Key rule:** forces scope decisions first — MVP slice, out-of-scope list, riskiest
hypothesis. Does not generate code.

### `premortem` — Premortem

Assumes the decision already failed 6 months from now; works backwards to mitigations.

**Output sections:** `# Decision under review` / `## Premise` / `## Failure modes (minimum 5)` / `## Mitigations` / `## Gate` / `Operating principles`

**Key rule:** minimum 5 failure modes. Any mode with Probability × Severity ≥ Medium ×
Medium requires a mitigation with a preventive action, a sentinel, a rollback, and an
owner.

**Red Zone:** use before any irreversible decision (production deploy, architectural
change, public release).

### `grok` — Signal Hunter

Optimised for tools with real-time web/social access. Produces a structured Markdown
table of signals found.

**Output sections:** search strategy / table `Name | URL | Category | Stars/Likes | Description | Date` / `### Context & Takeaways`

**Key rule:** other LLMs can use this template but the quality of results depends on
whether the LLM has actual real-time search capability.

---

## Operating principles embedded in every template

All six templates include the following block verbatim. It is non-negotiable and must
survive any adaptation unchanged:

```
Operating principles (EGOS):
1. Understanding > Production — if complexity exceeds understanding, simplify or pause.
2. State assumptions before implementing anything ambiguous.
3. Minimum code — nothing speculative; only what was asked.
4. Evidence-first — every "done" claim needs a verifiable proof (test, curl, metric).
5. Touch only what you must — match existing style.
```

---

## Hosting the generator yourself

The generator is intentionally simple: no database, no file I/O at runtime, no external
service calls. Templates are strings in source code with a `build(task, context)` method.

To port it to your stack:

1. Read the source implementation thoroughly before writing anything.
2. Create one function (or class) per template that takes `task: string` and
   `context: string` and returns the prompt as a `string`.
3. Add a list endpoint that returns template metadata.
4. Add a generate endpoint that routes by `type` and returns `{ type, title, prompt }`.
5. Add input validation: `task` required, max 4000 chars, type must be one of the
   known values.
6. Run a real smoke test before declaring it done:

```bash
curl -X POST http://localhost:PORT/api/v1/meta-prompts/generate \
  -H "Content-Type: application/json" \
  -d '{"type":"task","task":"smoke test"}' \
  | grep -q '"prompt"' && echo "PASS" || echo "FAIL"
```

**What to preserve:** the operating principles block must be verbatim in every generated
prompt. The section names (`# Task`, `## Verify`, etc.) should be consistent so
downstream parsers work correctly. Everything else can be adapted to your conventions.

**What to adapt:** HTTP framework, routing style, response envelope shape, auth (if
needed), rate limiting, and any domain-specific additions to the templates.

---

## Using the generator with external LLMs

The generated prompt is a self-contained instruction. Copy it and send it as a system
prompt or as the first user message to any LLM.

```bash
# Generate and pipe to your LLM tool
curl -s -X POST https://your-api-host/api/v1/meta-prompts/generate \
  -H "Content-Type: application/json" \
  -d '{"type":"premortem","task":"Your decision here"}' \
  | jq -r .prompt
```

Read the prompt before forwarding it. Remove any section that does not apply to your
context. A vague `task` field produces a vague prompt — garbage in, garbage out.

---

## Anti-copy-paste checklist

Before using a generated prompt or porting this generator to your project:

- [ ] I read the generated prompt before forwarding it to an LLM.
- [ ] I filled `task` with a specific, concrete description.
- [ ] I added real context in the `context` field (stack, constraints, frozen zones).
- [ ] I did not paste secrets, private IPs, or personal data into `task` or `context`.
- [ ] I verified that every file path mentioned in the prompt exists in my repo.
- [ ] The five operating principles are verbatim in the adapted templates.
- [ ] I ran a real smoke test on the ported generator (not just "it compiled").

---

## Drift control

If you maintain a local copy of the generator, keep the template IDs and section names
in sync with any documentation that references them. A useful practice is to add a
pre-commit check that compares the list of template IDs in the code against the list in
any manifest or documentation file.

Currently, the EGOS reference implementation does not have an automated drift gate for
this — synchronisation is manual. If you add one, document it here.

---

*EGOS Framework · docs/metaprompts/generator.md · open for use and adaptation*
