#!/usr/bin/env bun
/**
 * @egos/mcp-eval-runner v0.1.0 (MCP-F2-001)
 *
 * MCP Server — Behavioral eval runner + capability validator + promotion advisor.
 *
 * Consolidação pós-Codex MCP-FIX-007 (topologia "eval" domain):
 * - run_golden_cases (executa eval suite via @egos/eval-runner/mcp-runner)
 * - validate_cbc (valida CBC frontmatter contra _SCHEMA.json via ajv)
 * - list_capabilities (lista CBC files com filtros)
 * - propose_promotion (verifica critérios CAPABILITY_PROMOTION_RULES)
 * - capability_audit (detecta gaps — CBC sem eval, sem owner, etc)
 * - audit_drift (compara §N legacy vs CBC files)
 *
 * Resources:
 * - egos://capabilities/_index — lista todos CBC files com metadata
 * - egos://capabilities/{id} — conteúdo de um CBC específico
 *
 * SSOT: docs/governance/CAPABILITY_PROMOTION_RULES.md
 * Connect: { "mcpServers": { "egos-eval-runner": { "command": "bun", "args": ["packages/mcp-eval-runner/src/index.ts"] } } }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { trackMcpTool } from "@egos/shared/mcp-audit-lite";

const MCP_NAME = "egos-eval-runner";
import Ajv from "ajv";
import yaml from "js-yaml";
import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { runSuite, type MCPEvalSuite } from "@egos/eval-runner/mcp-runner";

// ── Paths ──────────────────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dir, "../../..");
const CBC_DIR = join(REPO_ROOT, "docs", "capabilities");
const CBC_SCHEMA_PATH = join(CBC_DIR, "_SCHEMA.json");
const EVAL_DIR = join(REPO_ROOT, "tests", "eval", "capabilities");
const REGISTRY_PATH = join(REPO_ROOT, "docs", "CAPABILITY_REGISTRY.md");

// ── Helpers ────────────────────────────────────────────────────────────────
function readSafe(path: string): string {
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8");
}

function listCbcFiles(): string[] {
  if (!existsSync(CBC_DIR)) return [];
  return readdirSync(CBC_DIR)
    .filter((f) => f.startsWith("CBC-") && f.endsWith(".md"))
    .map((f) => join(CBC_DIR, f));
}

function parseCbcFrontmatter(content: string): Record<string, unknown> | null {
  const match = content.match(/^---\n([\s\S]+?)\n---/);
  if (!match) return null;
  try {
    return yaml.load(match[1]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function loadSchema(): Record<string, unknown> | null {
  const raw = readSafe(CBC_SCHEMA_PATH);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function countLegacyNs(): number {
  const content = readSafe(REGISTRY_PATH);
  const matches = content.match(/^## §\d+/gm);
  return matches ? matches.length : 0;
}

// ── MCP Server ─────────────────────────────────────────────────────────────
const server = new McpServer(
  { name: "egos-eval-runner", version: "0.1.0" },
  { capabilities: { tools: {}, resources: {} } }
);

// ── Tool 1: validate_cbc ──────────────────────────────────────────────────
server.registerTool(
  "validate_cbc",
  {
    description:
      "Valida CBC frontmatter contra _SCHEMA.json (ajv). Retorna válido + errors. SSOT: docs/governance/CAPABILITY_PROMOTION_RULES.md",
    inputSchema: {
      cbc_id: z.string().describe("ID CBC (ex: CBC-EGOS-MCP-GOVERNANCE-001)"),
    } as any,
  },
  (async ({ cbc_id }: { cbc_id: string }) => {
    return trackMcpTool(MCP_NAME, "validate_cbc", async () => {
      const fileName = cbc_id.endsWith(".md") ? cbc_id : `${cbc_id}.md`;
      const filePath = join(CBC_DIR, fileName);
      const content = readSafe(filePath);

      if (!content) {
        return { content: [{ type: "text", text: JSON.stringify({ valid: false, error: `CBC file not found: ${fileName}` }) }] };
      }

      const frontmatter = parseCbcFrontmatter(content);
      if (!frontmatter) {
        return { content: [{ type: "text", text: JSON.stringify({ valid: false, error: "No valid YAML frontmatter" }) }] };
      }

      const schema = loadSchema();
      if (!schema) {
        return { content: [{ type: "text", text: JSON.stringify({ valid: false, error: "_SCHEMA.json not found or invalid" }) }] };
      }

      const ajv = new Ajv({ strict: false, allErrors: true });
      const validate = ajv.compile(schema);
      const valid = validate(frontmatter);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                valid,
                cbc_id,
                status: (frontmatter as any).status,
                maturity: (frontmatter as any).maturity,
                errors: validate.errors ?? [],
              },
              null,
              2
            ),
          },
        ],
      };
    });
  }) as any
);

// ── Tool 2: list_capabilities ─────────────────────────────────────────────
server.registerTool(
  "list_capabilities",
  {
    description:
      "Lista CBC files com filtros opcionais (status, project, domain). Returns CBC metadata array.",
    inputSchema: {
      status: z
        .enum(["experimental", "candidate", "alpha", "beta", "rc", "production", "deprecated", "all"])
        .optional()
        .describe("Filtrar por status (default: all)"),
      project: z.string().optional().describe("Filtrar por project field"),
    } as any,
  },
  (async ({ status = "all", project }: { status?: string; project?: string }) => {
    return trackMcpTool(MCP_NAME, "list_capabilities", async () => {
      const cbcFiles = listCbcFiles();
      const items: Array<Record<string, unknown>> = [];

      for (const file of cbcFiles) {
        const content = readSafe(file);
        const fm = parseCbcFrontmatter(content);
        if (!fm) continue;

        if (status !== "all" && fm.status !== status) continue;
        if (project && fm.project !== project) continue;

        items.push({
          id: fm.id,
          title: fm.title,
          status: fm.status,
          maturity: fm.maturity,
          project: fm.project,
          owner: (fm.ownership as any)?.owner ?? fm.verified_by,
          verified_at: fm.verified_at,
        });
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ filter: { status, project }, total: items.length, capabilities: items }, null, 2),
          },
        ],
      };
    });
  }) as any
);

// ── Tool 3: propose_promotion ─────────────────────────────────────────────
server.registerTool(
  "propose_promotion",
  {
    description:
      "Verifica critérios de promoção para próximo nível de maturidade (CAPABILITY_PROMOTION_RULES.md). Returns blockers + recommendation.",
    inputSchema: {
      cbc_id: z.string().describe("CBC ID"),
      target_level: z.enum(["candidate", "alpha", "beta", "rc", "production"]).describe("Target maturity level"),
    } as any,
  },
  (async ({ cbc_id, target_level }: { cbc_id: string; target_level: string }) => {
    return trackMcpTool(MCP_NAME, "propose_promotion", async () => {
      const fileName = cbc_id.endsWith(".md") ? cbc_id : `${cbc_id}.md`;
      const content = readSafe(join(CBC_DIR, fileName));
      if (!content) {
        return { content: [{ type: "text", text: JSON.stringify({ approved: false, error: "CBC not found" }) }] };
      }
      const fm = parseCbcFrontmatter(content);
      if (!fm) {
        return { content: [{ type: "text", text: JSON.stringify({ approved: false, error: "No frontmatter" }) }] };
      }

      const blockers: string[] = [];
      const ownership = (fm.ownership ?? {}) as Record<string, unknown>;
      const evidence = (fm.evidence ?? {}) as Record<string, unknown>;
      const behavioral = (evidence.behavioral_eval ?? {}) as Record<string, unknown>;

      if (target_level === "alpha") {
        if (!fm.interface) blockers.push("Missing interface (inputs/outputs declared)");
        if (!ownership.owner) blockers.push("Missing ownership.owner");
      }

      if (target_level === "beta") {
        if (!evidence.proof_type) blockers.push("Missing evidence.proof_type");
        const caseCount = (behavioral.case_count as number) ?? 0;
        if (caseCount < 3) blockers.push(`Behavioral eval has only ${caseCount} cases — minimum 3 (MCP-FIX-005)`);
        if (!fm.replicability) blockers.push("Missing replicability");
      }

      if (target_level === "rc") {
        if (!ownership.on_call) blockers.push("Missing ownership.on_call");
        if (behavioral.last_run_result !== "pass") blockers.push("Last eval run is not 'pass'");
      }

      if (target_level === "production") {
        if (!fm.risk_assessment) blockers.push("Missing risk_assessment (threat model)");
        if (!ownership.on_call) blockers.push("Missing ownership.on_call");
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                cbc_id,
                current_status: fm.status,
                target_level,
                approved: blockers.length === 0,
                blockers,
                recommendation:
                  blockers.length === 0
                    ? `Ready for promotion to ${target_level}. Update maturity_history + status fields.`
                    : `${blockers.length} blocker(s) — address before promotion.`,
              },
              null,
              2
            ),
          },
        ],
      };
    });
  }) as any
);

// ── Tool 4: run_golden_cases ──────────────────────────────────────────────
server.registerTool(
  "run_golden_cases",
  {
    description:
      "Executa golden cases de uma capability via @egos/eval-runner/mcp-runner. Returns results array.",
    inputSchema: {
      cbc_id: z.string().describe("CBC ID (eval file deve existir em tests/eval/capabilities/)"),
    } as any,
  },
  (async ({ cbc_id }: { cbc_id: string }) => {
    return trackMcpTool(MCP_NAME, "run_golden_cases", async () => {
      const baseName = cbc_id.replace(/-001$/, "").replace(/\.md$/, "");
      const evalFile = join(EVAL_DIR, `${baseName}.eval.ts`);

      if (!existsSync(evalFile)) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: `Eval file not found: ${evalFile}`, hint: "Create suite in tests/eval/capabilities/" }),
            },
          ],
        };
      }

      const mod = await import(evalFile);
      const suite: MCPEvalSuite | undefined = mod.suite;
      if (!suite) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "Suite export not found in eval file" }) }] };
      }
      const results = await runSuite(suite);
      const passed = results.filter((r) => r.passed).length;
      const failed = results.filter((r) => !r.passed && r.severity === "block").length;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                cbc_id,
                total: results.length,
                passed,
                failed_block: failed,
                pass_rate: ((passed / results.length) * 100).toFixed(1) + "%",
                results,
              },
              null,
              2
            ),
          },
        ],
      };
    });
  }) as any
);

// ── Tool 5: capability_audit ──────────────────────────────────────────────
server.registerTool(
  "capability_audit",
  {
    description:
      "Audita CBC files: detecta gaps (sem eval, sem owner, schema invalid). Returns audit report.",
    inputSchema: {} as any,
  },
  (async () => {
    return trackMcpTool(MCP_NAME, "capability_audit", async () => {
      const cbcFiles = listCbcFiles();
      const schema = loadSchema();
      const ajv = schema ? new Ajv({ strict: false, allErrors: true }) : null;
      const validate = ajv && schema ? ajv.compile(schema) : null;

      const audit = {
        total_cbc: cbcFiles.length,
        missing_owner: [] as string[],
        missing_eval_file: [] as string[],
        schema_invalid: [] as string[],
        production_without_threat_model: [] as string[],
        beta_plus_without_eval: [] as string[],
      };

      for (const file of cbcFiles) {
        const content = readSafe(file);
        const fm = parseCbcFrontmatter(content);
        if (!fm) continue;

        const id = fm.id as string;
        const ownership = (fm.ownership ?? {}) as Record<string, unknown>;
        const evidence = (fm.evidence ?? {}) as Record<string, unknown>;

        if (!ownership.owner) audit.missing_owner.push(id);
        if (fm.status === "production" && !fm.risk_assessment) audit.production_without_threat_model.push(id);

        if (["beta", "rc", "production"].includes(fm.status as string)) {
          const evalPath = (evidence as any).behavioral_eval?.golden_cases_path;
          if (!evalPath || !existsSync(join(REPO_ROOT, evalPath))) {
            audit.beta_plus_without_eval.push(id);
          }
          const baseName = id.replace(/-001$/, "");
          const expected = join(EVAL_DIR, `${baseName}.eval.ts`);
          if (!existsSync(expected)) audit.missing_eval_file.push(id);
        }

        if (validate && !validate(fm)) audit.schema_invalid.push(id);
      }

      return {
        content: [{ type: "text", text: JSON.stringify(audit, null, 2) }],
      };
    });
  }) as any
);

// ── Tool 6: audit_drift ───────────────────────────────────────────────────
server.registerTool(
  "audit_drift",
  {
    description: "Compara §N legacy entries vs CBC canonical files. Returns drift score.",
    inputSchema: {} as any,
  },
  (async () => {
    return trackMcpTool(MCP_NAME, "audit_drift", async () => {
      const legacyCount = countLegacyNs();
      const cbcCount = listCbcFiles().length;
      const migrationPct = legacyCount > 0 ? ((cbcCount / legacyCount) * 100).toFixed(1) : "100.0";

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                legacy_sections: legacyCount,
                cbc_files: cbcCount,
                migration_pct: `${migrationPct}%`,
                drift_report: "docs/capabilities/_drift-report.md",
                recommendation:
                  cbcCount < legacyCount * 0.5
                    ? "Migration <50% — execute MCP-DECISION-005 (orgânico ou batch)"
                    : "Migration on track",
              },
              null,
              2
            ),
          },
        ],
      };
    });
  }) as any
);

// ── Resources: egos://capabilities/_index ─────────────────────────────────
server.resource(
  "capabilities-index",
  "egos://capabilities/_index",
  {
    description: "Index of all CBC capability files with metadata",
    mimeType: "application/json",
  },
  async () => {
    const cbcFiles = listCbcFiles();
    const entries: Array<Record<string, unknown>> = [];
    for (const file of cbcFiles) {
      const fm = parseCbcFrontmatter(readSafe(file));
      if (!fm) continue;
      entries.push({
        id: fm.id,
        title: fm.title,
        status: fm.status,
        file: basename(file),
      });
    }
    return {
      contents: [
        {
          uri: "egos://capabilities/_index",
          text: JSON.stringify({ total: entries.length, capabilities: entries }, null, 2),
          mimeType: "application/json",
        },
      ],
    };
  }
);

// ── Bootstrap ──────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
