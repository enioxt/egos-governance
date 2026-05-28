#!/usr/bin/env bun
import { execSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, readdirSync, readlinkSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

type Status = "ok" | "warn" | "fail";

type CheckResult = {
  category: string;
  item: string;
  status: Status;
  detail?: string;
  evidence?: string;
};

type EgosHomeManifest = {
  shared_guarani?: string[];
  shared_workflows?: string[];
  repos?: Record<string, { path: string; mode?: string; hooks?: boolean }>;
};

type ClaudeRuntimeManifest = {
  hooks?: {
    triggers?: Array<{ script?: string; enabled?: boolean }>;
  };
};

const ALLOWED_LOCAL_CLAUDE_SETTING_KEYS = new Set(["model"]);

const args = new Set(process.argv.slice(2));
const jsonMode = args.has("--json");
const quietMode = args.has("--quiet");
const ROOT = resolve(import.meta.dir, "..");
const HOME = process.env.HOME ?? "";
const EGOS_HOME = HOME ? resolve(HOME, ".egos") : "";
const CLAUDE_HOME = HOME ? resolve(HOME, ".claude") : "";

const governanceSyncPath = join(ROOT, "scripts", "governance-sync.sh");
const governanceSyncSource = readFileSync(governanceSyncPath, "utf-8");
const egosHomeRoot = join(ROOT, "scripts", "egos-home");
const egosHomeManifestPath = join(egosHomeRoot, "manifest.json");
const claudeRuntimeRoot = join(ROOT, "scripts", "claude-runtime");
const claudeManifestPath = join(claudeRuntimeRoot, "manifest.json");
const claudeSettingsPath = join(claudeRuntimeRoot, "settings.json");
const egosHomeManifest = JSON.parse(readFileSync(egosHomeManifestPath, "utf-8")) as EgosHomeManifest;
const claudeManifest = JSON.parse(readFileSync(claudeManifestPath, "utf-8")) as ClaudeRuntimeManifest;
const claudeSettings = JSON.parse(readFileSync(claudeSettingsPath, "utf-8")) as Record<string, unknown>;
const results: CheckResult[] = [];

const truthMap = {
  kernel: {
    root: ROOT,
    governance_sync: "scripts/governance-sync.sh",
    shared_home_source: "scripts/egos-home/",
    shared_home_manifest: "scripts/egos-home/manifest.json",
    claude_runtime_source: "scripts/claude-runtime/",
    claude_runtime_manifest: "scripts/claude-runtime/manifest.json",
    claude_runtime_settings: "scripts/claude-runtime/settings.json",
    telemetry_viewer: "scripts/claude-hook-telemetry.ts",
    evidence_gate_disseminator: "scripts/evidence-gate-disseminate.ts",
  },
  mirrors: {
    egos_home: EGOS_HOME,
    claude_home: CLAUDE_HOME,
  },
  leaf_repos: Object.entries(egosHomeManifest.repos ?? {})
    .filter(([, repo]) => repo.mode !== "mapped-only")
    .map(([name, repo]) => ({ name, path: repo.path, hooks: repo.hooks ?? false })),
};

function add(status: Status, category: string, item: string, detail?: string, evidence?: string): void {
  results.push({ category, item, status, detail, evidence });
}

function walkFiles(dir: string, base = dir): string[] {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith("_")) continue;
      files.push(...walkFiles(full, base));
      continue;
    }
    if (entry.isFile()) files.push(full.slice(base.length + 1));
  }
  return files.sort();
}

function normalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, normalizeJson(nested)]),
  );
}

function expandHome(value: string): string {
  return value.startsWith("~/") ? join(HOME, value.slice(2)) : value;
}

function extractShellList(variableName: string): string[] {
  const pattern = new RegExp(`${variableName}="([^"]+)"`);
  const match = governanceSyncSource.match(pattern);
  if (!match) return [];
  return match[1].split(/\s+/).map((part) => part.trim()).filter(Boolean);
}

function isExecutable(path: string): boolean {
  try {
    return (statSync(path).mode & 0o111) !== 0;
  } catch {
    return false;
  }
}

function compareText(sourcePath: string, targetPath: string, category: string, item: string): void {
  if (!existsSync(sourcePath)) {
    add("fail", category, item, "kernel source missing", sourcePath);
    return;
  }
  if (!existsSync(targetPath)) {
    add("fail", category, item, "mirror file missing", targetPath);
    return;
  }
  const source = readFileSync(sourcePath, "utf-8");
  const target = readFileSync(targetPath, "utf-8");
  if (source === target) {
    add("ok", category, item, undefined, targetPath);
  } else {
    add("fail", category, item, "content drift detected", targetPath);
  }
}

function checkExecutableFile(path: string, category: string, item: string): void {
  if (!existsSync(path)) {
    add("fail", category, item, "file missing", path);
    return;
  }
  if (isExecutable(path)) {
    add("ok", category, item, undefined, path);
  } else {
    add("fail", category, item, "not executable", path);
  }
}

function compareClaudeSettings(sourcePath: string, targetPath: string): void {
  if (!existsSync(sourcePath)) {
    add("fail", "claude", "settings.json", "kernel source missing", sourcePath);
    return;
  }
  if (!existsSync(targetPath)) {
    add("fail", "claude", "settings.json", "mirror file missing", targetPath);
    return;
  }

  const source = JSON.parse(readFileSync(sourcePath, "utf-8")) as Record<string, unknown>;
  const target = JSON.parse(readFileSync(targetPath, "utf-8")) as Record<string, unknown>;
  const localOverrides = Object.keys(target).filter((key) => ALLOWED_LOCAL_CLAUDE_SETTING_KEYS.has(key) && !(key in source));
  const comparableTarget = { ...target };
  for (const key of localOverrides) delete comparableTarget[key];

  const sourceNormalized = JSON.stringify(normalizeJson(source));
  const targetNormalized = JSON.stringify(normalizeJson(comparableTarget));
  if (sourceNormalized === targetNormalized) {
    if (localOverrides.length > 0) {
      add("warn", "claude", "settings.json", `allowed local override(s): ${localOverrides.join(", ")}`, targetPath);
    } else {
      add("ok", "claude", "settings.json", undefined, targetPath);
    }
    return;
  }

  add("fail", "claude", "settings.json", "content drift detected", targetPath);
}

function checkResolvedSymlink(path: string, expectedTarget: string, category: string, item: string, allowRegularMatch = false): void {
  if (!existsSync(path)) {
    add("fail", category, item, "path missing", path);
    return;
  }

  const expected = resolve(expectedTarget);
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) {
    const actual = resolve(dirname(path), readlinkSync(path));
    if (actual === expected) {
      add("ok", category, item, undefined, path);
    } else {
      add("fail", category, item, `symlink target mismatch: ${actual}`, path);
    }
    return;
  }

  if (allowRegularMatch) {
    try {
      const local = readFileSync(path, "utf-8");
      const shared = readFileSync(expected, "utf-8");
      if (local === shared) {
        add("warn", category, item, "local copy matches shared content but is not symlinked", path);
      } else {
        add("fail", category, item, "local copy diverged from shared target", path);
      }
      return;
    } catch {
      add("fail", category, item, "non-symlink path could not be compared", path);
      return;
    }
  }

  add("fail", category, item, "expected symlink but found regular path", path);
}

function collectHookCommands(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const collected = new Set<string>();
  const stack: unknown[] = [value];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    if (Array.isArray(current)) {
      stack.push(...current);
      continue;
    }

    for (const nested of Object.values(current)) {
      if (nested && typeof nested === "object") stack.push(nested);
    }

    const record = current as Record<string, unknown>;
    if (typeof record.command === "string" && record.command.includes("~/.claude/hooks/")) {
      collected.add(expandHome(record.command));
    }
  }

  return [...collected].sort();
}

add("ok", "truth", "kernel root", ROOT, ROOT);
for (const [item, relativePath] of Object.entries(truthMap.kernel)) {
  if (item === "root") continue;
  const absolutePath = join(ROOT, relativePath);
  add(existsSync(absolutePath) ? "ok" : "fail", "kernel", item.replaceAll("_", " "), existsSync(absolutePath) ? undefined : "kernel surface missing", absolutePath);
}

if (!EGOS_HOME) {
  add("fail", "shared-home", "home env", "HOME env not available");
} else if (!existsSync(EGOS_HOME)) {
  add("fail", "shared-home", "mirror root", "~/.egos missing", EGOS_HOME);
} else {
  add("ok", "shared-home", "mirror root", undefined, EGOS_HOME);
  for (const rel of extractShellList("HOME_META_FILES")) {
    compareText(join(egosHomeRoot, rel), join(EGOS_HOME, rel), "shared-home", `home ${rel}`);
  }
  compareText(join(egosHomeRoot, "sync.sh"), join(EGOS_HOME, "sync.sh"), "shared-home", "home sync.sh");
  checkExecutableFile(join(EGOS_HOME, "sync.sh"), "shared-home", "home sync.sh executable");

  for (const rel of walkFiles(join(ROOT, ".guarani"))) {
    compareText(join(ROOT, ".guarani", rel), join(EGOS_HOME, "guarani", rel), "shared-home", `guarani ${rel}`);
  }
  for (const rel of walkFiles(join(ROOT, ".windsurf", "workflows"))) {
    compareText(join(ROOT, ".windsurf", "workflows", rel), join(EGOS_HOME, "workflows", rel), "shared-home", `workflow ${rel}`);
  }
  for (const rel of walkFiles(join(egosHomeRoot, "hooks"))) {
    const targetPath = join(EGOS_HOME, "hooks", rel);
    compareText(join(egosHomeRoot, "hooks", rel), targetPath, "shared-home", `hook ${rel}`);
    checkExecutableFile(targetPath, "shared-home", `hook ${rel} executable`);
  }
  for (const rel of extractShellList("CANONICAL_DOCS")) {
    compareText(join(ROOT, "docs", rel), join(EGOS_HOME, "docs", rel), "shared-home", `doc ${rel}`);
  }
}

if (!CLAUDE_HOME) {
  add("fail", "claude", "home env", "HOME env not available");
} else if (!existsSync(CLAUDE_HOME)) {
  add("fail", "claude", "runtime root", "~/.claude missing", CLAUDE_HOME);
} else {
  add("ok", "claude", "runtime root", undefined, CLAUDE_HOME);
  compareClaudeSettings(claudeSettingsPath, join(CLAUDE_HOME, "settings.json"));
  compareText(claudeManifestPath, join(CLAUDE_HOME, "manifest.json"), "claude", "manifest.json");

  for (const rel of walkFiles(join(claudeRuntimeRoot, "hooks"))) {
    const targetPath = join(CLAUDE_HOME, "hooks", rel);
    compareText(join(claudeRuntimeRoot, "hooks", rel), targetPath, "claude", `hook ${rel}`);
    checkExecutableFile(targetPath, "claude", `hook ${rel} executable`);
  }

  for (const command of collectHookCommands(claudeSettings)) {
    if (existsSync(command)) {
      add(isExecutable(command) ? "ok" : "fail", "claude", `settings hook ${command.split("/").pop() ?? command}`, isExecutable(command) ? undefined : "hook command exists but is not executable", command);
    } else {
      add("fail", "claude", `settings hook ${command.split("/").pop() ?? command}`, "settings references missing hook command", command);
    }
  }

  for (const trigger of claudeManifest.hooks?.triggers ?? []) {
    if (!trigger.enabled || !trigger.script) continue;
    const targetPath = join(CLAUDE_HOME, "hooks", trigger.script);
    if (existsSync(targetPath)) {
      add(isExecutable(targetPath) ? "ok" : "fail", "claude", `trigger ${trigger.script}`, isExecutable(targetPath) ? undefined : "trigger hook exists but is not executable", targetPath);
    } else {
      add("fail", "claude", `trigger ${trigger.script}`, "manifest trigger missing in ~/.claude/hooks", targetPath);
    }
  }
}

for (const [name, repo] of Object.entries(egosHomeManifest.repos ?? {})) {
  if (repo.mode === "mapped-only") continue;
  const repoPath = repo.path;
  if (!existsSync(repoPath)) {
    add("warn", "leaf", `${name} repo`, "repo path missing locally", repoPath);
    continue;
  }

  const dotEgosPath = join(repoPath, ".egos");
  checkResolvedSymlink(dotEgosPath, EGOS_HOME, "leaf", `${name} .egos link`);

  const windsurfStart = join(repoPath, ".windsurf", "workflows", "start.md");
  if (existsSync(join(repoPath, ".windsurf"))) {
    checkResolvedSymlink(windsurfStart, join(EGOS_HOME, "workflows", "start.md"), "leaf", `${name} .windsurf/start`, true);
  }

  const agentStart = join(repoPath, ".agent", "workflows", "start.md");
  if (existsSync(join(repoPath, ".agent"))) {
    checkResolvedSymlink(agentStart, join(EGOS_HOME, "workflows", "start.md"), "leaf", `${name} .agent/start`, true);
  }

  if (repo.hooks) {
    const hookPath = join(repoPath, ".git", "hooks", "pre-commit");
    if (!existsSync(hookPath)) {
      add("warn", "leaf", `${name} pre-commit`, "pre-commit hook missing", hookPath);
      continue;
    }

    const stat = lstatSync(hookPath);
    if (stat.isSymbolicLink()) {
      const resolved = resolve(dirname(hookPath), readlinkSync(hookPath));
      const expected = join(EGOS_HOME, "hooks", "pre-commit");
      if (resolved === resolve(expected)) {
        add("ok", "leaf", `${name} pre-commit`, undefined, hookPath);
      } else {
        add("fail", "leaf", `${name} pre-commit`, `hook symlink target mismatch: ${resolved}`, hookPath);
      }
      continue;
    }

    if (isExecutable(hookPath)) {
      add("warn", "leaf", `${name} pre-commit`, "local executable hook preserved", hookPath);
    } else {
      add("fail", "leaf", `${name} pre-commit`, "local hook exists but is not executable", hookPath);
    }
  }
}

try {
  execSync("git rev-parse --is-inside-work-tree", { cwd: ROOT, stdio: "ignore" });
} catch {
  add("warn", "workspace", "git context", "runtime smoke executed outside git work tree", ROOT);
}

const ok = results.filter((result) => result.status === "ok").length;
const warn = results.filter((result) => result.status === "warn").length;
const fail = results.filter((result) => result.status === "fail").length;
const summary = {
  total: results.length,
  ok,
  warn,
  fail,
  exit_code: fail > 0 ? 1 : 0,
};

if (jsonMode) {
  console.log(JSON.stringify({ checked_at: new Date().toISOString(), truth_map: truthMap, summary, results }, null, 2));
  process.exit(summary.exit_code);
}

const show = (status: Status) => {
  for (const result of results.filter((entry) => entry.status === status)) {
    const icon = status === "ok" ? "✅" : status === "warn" ? "⚠️" : "❌";
    console.log(`${icon} [${result.category}] ${result.item}${result.detail ? ` — ${result.detail}` : ""}`);
  }
};

console.log(`EGOS Runtime Smoke — ${ok} ok / ${warn} warn / ${fail} fail`);
if (quietMode && fail > 0) {
  const sample = results.filter((entry) => entry.status === "fail").slice(0, 5);
  for (const result of sample) {
    console.log(`❌ [${result.category}] ${result.item}${result.detail ? ` — ${result.detail}` : ""}`);
  }
} else {
  show("fail");
}
if (!quietMode) {
  show("warn");
  show("ok");
}

process.exit(summary.exit_code);
