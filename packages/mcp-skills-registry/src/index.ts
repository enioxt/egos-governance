#!/usr/bin/env bun
/**
 * @egos/mcp-skills-registry v0.1.0 (MCP-NEW-001)
 *
 * Unified skills discovery for EGOS — slash commands + personas + DPIO + agent skills.
 *
 * Codex MCP-FIX-007 sugeriu "skills-registry" como MCP útil que Claude proposta original
 * omitiu. Este pacote expõe todas as skills disponíveis em formato discoverable.
 *
 * Tools (5):
 * - list_slash_commands — local (.claude/commands/) + global (~/.claude/commands/)
 * - list_personas — docs/skills/personas/<vertical>/SKILL.md
 * - list_dpio_skills — docs/guides/dpio/<vertical>.md
 * - list_agent_skills — agents/skills/*.ts
 * - get_skill — fetch content by name + scope
 *
 * Resources:
 * - egos://skills/_index — JSON catalog with all categories
 *
 * SSOT: docs/agents/META_PROMPTS_INDEX.md
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join, basename, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import { trackMcpTool } from "@egos/shared/mcp-audit-lite";

const MCP_NAME = "egos-skills-registry";

const __dir = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dir, "../../..");
const HOME = homedir();

// ── Paths ──────────────────────────────────────────────────────────────────
const LOCAL_COMMANDS = join(REPO_ROOT, ".claude", "commands");
const GLOBAL_COMMANDS = join(HOME, ".claude", "commands");
const PERSONAS_DIR = join(REPO_ROOT, "docs", "skills", "personas");
const DPIO_DIR = join(REPO_ROOT, "docs", "guides", "dpio");
const AGENT_SKILLS_DIR = join(REPO_ROOT, "agents", "skills");

// ── Helpers ────────────────────────────────────────────────────────────────
function readSafe(path: string): string {
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8");
}

function extractFrontmatterDescription(content: string): string | null {
  const m = content.match(/^---\n([\s\S]+?)\n---/);
  if (!m) return null;
  const descLine = m[1].split("\n").find((l) => l.startsWith("description:"));
  if (!descLine) return null;
  return descLine.replace(/^description:\s*/, "").trim().replace(/^["']|["']$/g, "").slice(0, 200);
}

function listMdFiles(dir: string): Array<{ name: string; path: string; description: string }> {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const fullPath = join(dir, f);
      const content = readSafe(fullPath);
      return {
        name: basename(f, ".md"),
        path: fullPath,
        description: extractFrontmatterDescription(content) ?? "",
      };
    });
}

// ── MCP Server ─────────────────────────────────────────────────────────────
const server = new McpServer(
  { name: "egos-skills-registry", version: "0.1.0" },
  { capabilities: { tools: {}, resources: {} } }
);

// ── Tool 1: list_slash_commands ────────────────────────────────────────────
server.registerTool(
  "list_slash_commands",
  {
    description:
      "Lista slash commands disponíveis (local + global). Returns name + description + scope.",
    inputSchema: {
      scope: z.enum(["local", "global", "all"]).optional().describe("Filter by scope (default: all)"),
    } as any,
  },
  (async ({ scope = "all" }: { scope?: string }) => {
    return trackMcpTool(MCP_NAME, "list_slash_commands", async () => {
      const local = scope === "global" ? [] : listMdFiles(LOCAL_COMMANDS).map((c) => ({ ...c, scope: "local" }));
      const global = scope === "local" ? [] : listMdFiles(GLOBAL_COMMANDS).map((c) => ({ ...c, scope: "global" }));
      const all = [...local, ...global];
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ total: all.length, scope, commands: all }, null, 2),
          },
        ],
      };
    });
  }) as any
);

// ── Tool 2: list_personas ──────────────────────────────────────────────────
server.registerTool(
  "list_personas",
  {
    description: "Lista personas setoriais (advocacia, dentista, clinica, etc) em docs/skills/personas/.",
    inputSchema: {} as any,
  },
  (async () => {
    return trackMcpTool(MCP_NAME, "list_personas", async () => {
      const personas: Array<Record<string, unknown>> = [];
      if (existsSync(PERSONAS_DIR)) {
        for (const f of readdirSync(PERSONAS_DIR)) {
          const fullPath = join(PERSONAS_DIR, f);
          if (statSync(fullPath).isDirectory()) {
            const skillFile = join(fullPath, "SKILL.md");
            if (existsSync(skillFile)) {
              personas.push({
                vertical: f,
                path: skillFile,
                description: extractFrontmatterDescription(readSafe(skillFile)) ?? "",
              });
            }
          }
        }
      }
      return {
        content: [{ type: "text", text: JSON.stringify({ total: personas.length, personas }, null, 2) }],
      };
    });
  }) as any
);

// ── Tool 3: list_dpio_skills ───────────────────────────────────────────────
server.registerTool(
  "list_dpio_skills",
  {
    description: "Lista DPIO skills setoriais (qualification questions per vertical) em docs/guides/dpio/.",
    inputSchema: {} as any,
  },
  (async () => {
    return trackMcpTool(MCP_NAME, "list_dpio_skills", async () => {
      const dpios = listMdFiles(DPIO_DIR);
      return {
        content: [{ type: "text", text: JSON.stringify({ total: dpios.length, dpios }, null, 2) }],
      };
    });
  }) as any
);

// ── Tool 4: list_agent_skills ──────────────────────────────────────────────
server.registerTool(
  "list_agent_skills",
  {
    description: "Lista agent skills TypeScript em agents/skills/*.ts (background workers).",
    inputSchema: {} as any,
  },
  (async () => {
    return trackMcpTool(MCP_NAME, "list_agent_skills", async () => {
      const skills: Array<Record<string, unknown>> = [];
      if (existsSync(AGENT_SKILLS_DIR)) {
        for (const f of readdirSync(AGENT_SKILLS_DIR)) {
          if (!f.endsWith(".ts")) continue;
          const fullPath = join(AGENT_SKILLS_DIR, f);
          const content = readSafe(fullPath);
          const firstComment = content.match(/^\/\*\*\s*\n\s*\*\s*(.+)\n/);
          skills.push({
            name: basename(f, ".ts"),
            path: fullPath,
            description: firstComment ? firstComment[1].trim() : "",
          });
        }
      }
      return {
        content: [{ type: "text", text: JSON.stringify({ total: skills.length, agent_skills: skills }, null, 2) }],
      };
    });
  }) as any
);

// ── Tool 5: get_skill ──────────────────────────────────────────────────────
server.registerTool(
  "get_skill",
  {
    description: "Fetch content de uma skill específica por scope + name.",
    inputSchema: {
      scope: z.enum(["slash-local", "slash-global", "persona", "dpio", "agent"]),
      name: z.string().describe("Skill name (sem extensão)"),
    } as any,
  },
  (async ({ scope, name }: { scope: string; name: string }) => {
    return trackMcpTool(MCP_NAME, "get_skill", async () => {
      let filePath = "";
      switch (scope) {
        case "slash-local":
          filePath = join(LOCAL_COMMANDS, `${name}.md`);
          break;
        case "slash-global":
          filePath = join(GLOBAL_COMMANDS, `${name}.md`);
          break;
        case "persona":
          filePath = join(PERSONAS_DIR, name, "SKILL.md");
          break;
        case "dpio":
          filePath = join(DPIO_DIR, `${name}.md`);
          break;
        case "agent":
          filePath = join(AGENT_SKILLS_DIR, `${name}.ts`);
          break;
      }
      const content = readSafe(filePath);
      if (!content) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Skill not found: ${scope}/${name}`, expected_path: filePath }) }],
        };
      }
      return {
        content: [{ type: "text", text: content }],
      };
    });
  }) as any
);

// ── Resource: egos://skills/_index ─────────────────────────────────────────
server.resource(
  "skills-index",
  "egos://skills/_index",
  {
    description: "Unified catalog of all EGOS skills (slash commands + personas + DPIO + agents)",
    mimeType: "application/json",
  },
  async () => {
    const slashLocal = listMdFiles(LOCAL_COMMANDS);
    const slashGlobal = listMdFiles(GLOBAL_COMMANDS);
    const personas: string[] = [];
    if (existsSync(PERSONAS_DIR)) {
      for (const f of readdirSync(PERSONAS_DIR)) {
        if (statSync(join(PERSONAS_DIR, f)).isDirectory()) personas.push(f);
      }
    }
    const dpios = listMdFiles(DPIO_DIR).map((d) => d.name);
    const agents = existsSync(AGENT_SKILLS_DIR)
      ? readdirSync(AGENT_SKILLS_DIR).filter((f) => f.endsWith(".ts")).map((f) => basename(f, ".ts"))
      : [];

    const catalog = {
      summary: {
        slash_local: slashLocal.length,
        slash_global: slashGlobal.length,
        personas: personas.length,
        dpios: dpios.length,
        agent_skills: agents.length,
      },
      slash_commands: {
        local: slashLocal.map((c) => c.name),
        global: slashGlobal.map((c) => c.name),
      },
      personas,
      dpios,
      agent_skills: agents,
    };

    return {
      contents: [
        {
          uri: "egos://skills/_index",
          text: JSON.stringify(catalog, null, 2),
          mimeType: "application/json",
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
