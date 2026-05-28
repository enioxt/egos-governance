#!/usr/bin/env bun
/**
 * @egos/mcp-governance — EGOS-087
 * MCP server (stdio) for SSOT drift check, task listing, agent status, repo health.
 *
 * Connect via Claude Code settings.json:
 *   { "mcpServers": { "egos-governance": { "command": "bun", "args": ["/path/to/packages/mcp-governance/src/index.ts"] } } }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { trackMcpTool } from "@egos/shared/mcp-audit-lite";

const MCP_NAME = "egos-governance";

// ── Paths ──────────────────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dir, "../../..");
const AGENTS_JSON = join(REPO_ROOT, "agents/registry/agents.json");
const TASKS_MD = join(REPO_ROOT, "TASKS.md");

// Meta-prompts available as MCP resources (egos://meta-prompts/{name})
const META_PROMPTS: Record<string, { file: string; description: string }> = {
  start:     { file: ".claude/commands/start.md",     description: "Session initialization v6.9 — 7 layers of context loading" },
  end:       { file: ".claude/commands/end.md",       description: "Session finalization — handoff + commit + push" },
  inception: { file: ".claude/commands/inception.md", description: "Project inception gate — 8-source recon before new project" },
  bootstrap: { file: "docs/EGOS_BOOTSTRAP.md",        description: "Canonical SSOT v1.1.0 — Dual Pursuit + architecture" },
  agents:    { file: "AGENTS.md",                     description: "Cross-IDE rules v2.0.0 — Claude/Cursor/Codex/Copilot" },
  capabilities: { file: "docs/CAPABILITY_REGISTRY.md", description: "75+ capabilities with status and paths" },
};

// ── Helpers ────────────────────────────────────────────────────────────────
function readFileSafe(path: string): string {
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8");
}

function execSafe(cmd: string, cwd: string = REPO_ROOT): string {
  try {
    return execSync(cmd, { cwd, encoding: "utf8", timeout: 10_000 }).trim();
  } catch {
    return "";
  }
}

function parseTasks(content: string): Array<{ id: string; status: string; text: string }> {
  const tasks: Array<{ id: string; status: string; text: string }> = [];
  const lines = content.split("\n");
  const taskRe = /^- \[([ xX])\] (EGOS-\d+[^:]*)?:?\s*(.+)/;
  for (const line of lines) {
    const m = line.match(taskRe);
    if (!m) continue;
    const checked = m[1].trim().toLowerCase() === "x";
    const id = m[2]?.trim() ?? "";
    const text = m[3]?.trim() ?? "";
    tasks.push({ id, status: checked ? "done" : "pending", text });
  }
  return tasks;
}

// ── MCP Server ─────────────────────────────────────────────────────────────
const server = new McpServer(
  { name: "egos-governance", version: "0.2.0" },
  { capabilities: { tools: {}, resources: {} } }
);

// ── Meta-Prompt Resources (egos://meta-prompts/{name}) ─────────────────────
// Exposes key EGOS meta-prompts as MCP resources so LLMs with authenticated
// GitHub MCP connectors (Grok, ChatGPT, Gemini, Cursor) can discover them
// without knowing the exact file path in the private repo.
for (const [name, meta] of Object.entries(META_PROMPTS)) {
  const filePath = join(REPO_ROOT, meta.file);
  server.resource(
    `meta-prompt-${name}`,
    `egos://meta-prompts/${name}`,
    { description: meta.description, mimeType: "text/markdown" },
    async () => {
      const content = readFileSafe(filePath);
      if (!content) {
        return { contents: [{ uri: `egos://meta-prompts/${name}`, text: `Resource not found: ${meta.file}`, mimeType: "text/plain" }] };
      }
      return { contents: [{ uri: `egos://meta-prompts/${name}`, text: content, mimeType: "text/markdown" }] };
    }
  );
}

// Tool 0: list_meta_prompts (discovery — works even for clients without resource support)
server.registerTool(
  "list_meta_prompts",
  {
    description: "List available EGOS meta-prompts with their URIs and descriptions. Use get_meta_prompt to fetch content.",
    inputSchema: {},
  },
  async () => trackMcpTool(MCP_NAME, "list_meta_prompts", async () => {
    const items = Object.entries(META_PROMPTS).map(([name, meta]) => ({
      name,
      uri: `egos://meta-prompts/${name}`,
      file: meta.file,
      description: meta.description,
      exists: existsSync(join(REPO_ROOT, meta.file)),
    }));
    return { content: [{ type: "text", text: JSON.stringify({ meta_prompts: items, total: items.length }, null, 2) }] };
  })
);

// Tool 0b: get_meta_prompt (fallback for clients that don't support resources)
server.registerTool(
  "get_meta_prompt",
  {
    description: "Fetch the content of an EGOS meta-prompt by name. Available: start, end, inception, bootstrap, agents, capabilities.",
    inputSchema: {
      name: z.enum(["start", "end", "inception", "bootstrap", "agents", "capabilities"])
        .describe("Meta-prompt name"),
    } as any,
  },
  (async ({ name }: { name: string }) => {
    return trackMcpTool(MCP_NAME, "get_meta_prompt", async () => {
      const meta = META_PROMPTS[name];
      if (!meta) return { content: [{ type: "text", text: `Unknown meta-prompt: ${name}` }] };
      const content = readFileSafe(join(REPO_ROOT, meta.file));
      if (!content) return { content: [{ type: "text", text: `File not found: ${meta.file}` }] };
      return { content: [{ type: "text", text: content }] };
    });
  }) as any
);

// Tool 1: ssot_drift_check
server.registerTool(
  "ssot_drift_check",
  {
    description:
      "Check SSOT drift: compares agents.json registry with tasks in TASKS.md. Returns list of agents with no corresponding task, tasks with no agent owner, and pending high-priority items.",
    inputSchema: {},
  },
  async () => trackMcpTool(MCP_NAME, "ssot_drift_check", async () => {
    const agentsRaw = readFileSafe(AGENTS_JSON);
    const tasksContent = readFileSafe(TASKS_MD);
    const agents: Array<{ id: string; status: string; owner?: string }> =
      agentsRaw ? JSON.parse(agentsRaw).agents ?? [] : [];
    const tasks = parseTasks(tasksContent);

    const taskIds = new Set(tasks.map((t) => t.id).filter(Boolean));
    const agentIds = new Set(agents.map((a) => a.id));

    // Agents with no task reference
    const untracked = agents
      .filter((a) => !taskIds.has(a.id))
      .map((a) => ({ id: a.id, status: a.status }));

    // Pending tasks (EGOS-xxx form)
    const pending = tasks.filter((t) => t.status === "pending" && t.id);

    // Tasks referencing no agent
    const orphaned = tasks.filter(
      (t) => t.id && !agentIds.has(t.id.toLowerCase().replace(/-/g, "_"))
    );

    const result = {
      checked_at: new Date().toISOString(),
      total_agents: agents.length,
      total_tasks: tasks.length,
      pending_tasks: pending.length,
      untracked_agents: untracked,
      orphaned_tasks: orphaned.slice(0, 20),
      drift_score: untracked.length + orphaned.length,
    };
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  })
);

// Tool 2: list_tasks
server.registerTool(
  "list_tasks",
  {
    description:
      "List tasks from TASKS.md filtered by status. Returns task id, status, and description.",
    // zod v4 ZodOptional incompatible with MCP SDK ZodRawShapeCompat (v3-typed) — cast.
    inputSchema: {
      status: z
        .enum(["pending", "done", "all"])
        .optional()
        .describe("Filter by status (default: pending)"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe("Max tasks to return (default: 50)"),
    } as any,
  },
  (async ({ status = "pending", limit = 50 }: { status?: string; limit?: number }) => {
    return trackMcpTool(MCP_NAME, "list_tasks", async () => {
      const content = readFileSafe(TASKS_MD);
      const all = parseTasks(content);
      const filtered =
        status === "all" ? all : all.filter((t) => t.status === status);
      const result = {
        filter: status,
        total_matching: filtered.length,
        tasks: filtered.slice(0, limit),
      };
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    });
  }) as any
);

// Tool 3: agent_status
server.registerTool(
  "agent_status",
  {
    description:
      "Returns EGOS agent registry health: total agents, by kind, by status, risk levels, and active entrypoints.",
    inputSchema: {
      filter_kind: z
        .string()
        .optional()
        .describe("Filter agents by kind (tool | monitor | router | daemon)"),
    } as any,
  },
  (async ({ filter_kind }: { filter_kind?: string }) => {
    return trackMcpTool(MCP_NAME, "agent_status", async () => {
      const raw = readFileSafe(AGENTS_JSON);
      if (!raw) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "agents.json not found" }) }],
        };
      }
      const registry = JSON.parse(raw);
      let agents: Array<Record<string, unknown>> = registry.agents ?? [];
      if (filter_kind) {
        agents = agents.filter((a) => a["kind"] === filter_kind);
      }

      const byKind: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      const byRisk: Record<string, number> = {};
      for (const a of agents) {
        const k = String(a["kind"] ?? "unknown");
        const s = String(a["status"] ?? "unknown");
        const r = String(a["risk_level"] ?? "unknown");
        byKind[k] = (byKind[k] ?? 0) + 1;
        byStatus[s] = (byStatus[s] ?? 0) + 1;
        byRisk[r] = (byRisk[r] ?? 0) + 1;
      }

      const result = {
        registry_version: registry.version,
        updated: registry.updated,
        total: agents.length,
        by_kind: byKind,
        by_status: byStatus,
        by_risk: byRisk,
        agents: agents.map((a) => ({
          id: a["id"],
          kind: a["kind"],
          status: a["status"],
          risk_level: a["risk_level"],
          entrypoint: a["entrypoint"],
        })),
      };
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    });
  }) as any
);

// Tool 4: repo_health
server.registerTool(
  "repo_health",
  {
    description:
      "Returns EGOS repo health score: TASKS.md line count, last commit age, git status, and governance sync state.",
    inputSchema: {},
  },
  async () => trackMcpTool(MCP_NAME, "repo_health", async () => {
    const tasksContent = readFileSafe(TASKS_MD);
    const lineCount = tasksContent.split("\n").length;
    const tasks = parseTasks(tasksContent);
    const pendingCount = tasks.filter((t) => t.status === "pending").length;
    const doneCount = tasks.filter((t) => t.status === "done").length;

    const lastCommitAge = execSafe(
      'git log -1 --format="%ar" HEAD'
    );
    const lastCommitHash = execSafe("git log -1 --format=%h HEAD");
    const lastCommitMsg = execSafe("git log -1 --format=%s HEAD");
    const branch = execSafe("git rev-parse --abbrev-ref HEAD");
    const uncommitted = execSafe("git status --porcelain").split("\n").filter(Boolean).length;

    // Governance files existence check
    const governanceFiles = [
      "AGENTS.md",
      "TASKS.md",
      ".guarani/mcp-config.json",
      "agents/registry/agents.json",
      "docs/SYSTEM_MAP.md",
    ];
    const govSync = governanceFiles.map((f) => ({
      file: f,
      exists: existsSync(join(REPO_ROOT, f)),
    }));
    const missingGov = govSync.filter((g) => !g.exists).map((g) => g.file);

    // Scoring: 100 - penalties
    let score = 100;
    if (pendingCount > 20) score -= 10;
    if (uncommitted > 10) score -= 10;
    if (missingGov.length > 0) score -= missingGov.length * 5;

    const result = {
      checked_at: new Date().toISOString(),
      repo_root: REPO_ROOT,
      branch,
      last_commit: { hash: lastCommitHash, message: lastCommitMsg, age: lastCommitAge },
      tasks_md: { line_count: lineCount, pending: pendingCount, done: doneCount },
      uncommitted_files: uncommitted,
      governance_sync: { all_present: missingGov.length === 0, missing: missingGov },
      health_score: Math.max(0, score),
    };
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  })
);

// ── Bootstrap ──────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
