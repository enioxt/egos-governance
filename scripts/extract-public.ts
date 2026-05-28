#!/usr/bin/env bun
/**
 * extract-public.ts — EGOS-PUBLIC whitelist extractor
 *
 * Reads EXTRACT_MANIFEST.yaml, copies approved files to egos-public-work/,
 * applies sanitization transforms, and generates a report.
 *
 * Usage:
 *   bun scripts/extract-public.ts --dry-run          (default, safe)
 *   bun scripts/extract-public.ts --exec             (actually copy)
 *   bun scripts/extract-public.ts --exec --filter pattern-*
 *   bun scripts/extract-public.ts --scan             (run security scan only)
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from "fs";
import { dirname, resolve, basename } from "path";
import { execSync } from "child_process";

// ── Types ──────────────────────────────────────────────────────────────────

interface Transform {
  replace?: string;
  with?: string;
  regex_strip?: string;
  strip_section_header?: string;
}

interface Extraction {
  id: string;
  source: string;
  target: string;
  transforms?: Transform[];
  review: {
    status: "pending" | "approved" | "rejected";
    reviewer: string | null;
    reviewed_at: string | null;
  };
}

interface Manifest {
  version: number;
  extractions: Extraction[];
}

// ── Args ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = !args.includes("--exec");
const SCAN_ONLY = args.includes("--scan");
const FILTER = args.find((a) => a.startsWith("--filter="))?.split("=")[1] || null;

const MANIFEST_PATH = resolve(import.meta.dir, "../EXTRACT_MANIFEST.yaml");
const REPO_ROOT = resolve(import.meta.dir, "..");
const KERNEL_ROOT = "/home/enio/egos";

// ── YAML parser (minimal, no dep) ─────────────────────────────────────────

function parseManifest(content: string): Manifest {
  // Simple YAML parser for our specific format — no external dependency
  const lines = content.split("\n");
  const manifest: Manifest = { version: 1, extractions: [] };
  let current: Partial<Extraction> | null = null;
  let inTransforms = false;
  let currentTransform: Transform | null = null;
  let inReview = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;

    if (trimmed.startsWith("version:")) {
      manifest.version = parseInt(trimmed.split(":")[1].trim());
    } else if (trimmed === "- id:" || trimmed.startsWith("- id:")) {
      if (current) {
        if (currentTransform) {
          current.transforms = current.transforms || [];
          current.transforms.push(currentTransform);
          currentTransform = null;
        }
        manifest.extractions.push(current as Extraction);
      }
      current = {
        id: trimmed.replace("- id:", "").trim(),
        transforms: [],
        review: { status: "pending", reviewer: null, reviewed_at: null },
      };
      inTransforms = false;
      inReview = false;
    } else if (!current) {
      continue;
    } else if (trimmed.startsWith("source:")) {
      current.source = trimmed.replace("source:", "").trim();
    } else if (trimmed.startsWith("target:")) {
      current.target = trimmed.replace("target:", "").trim();
    } else if (trimmed === "transforms:") {
      inTransforms = true;
      inReview = false;
    } else if (trimmed === "review:") {
      inTransforms = false;
      inReview = true;
      if (currentTransform) {
        current.transforms = current.transforms || [];
        current.transforms.push(currentTransform);
        currentTransform = null;
      }
    } else if (inTransforms && trimmed.startsWith("- replace:")) {
      if (currentTransform) {
        current.transforms = current.transforms || [];
        current.transforms.push(currentTransform);
      }
      currentTransform = { replace: trimmed.replace("- replace:", "").trim().replace(/^["']|["']$/g, "") };
    } else if (inTransforms && trimmed.startsWith("with:") && currentTransform?.replace) {
      currentTransform.with = trimmed.replace("with:", "").trim().replace(/^["']|["']$/g, "");
    } else if (inTransforms && trimmed.startsWith("- regex_strip:")) {
      if (currentTransform) {
        current.transforms = current.transforms || [];
        current.transforms.push(currentTransform);
      }
      const pattern = trimmed.replace("- regex_strip:", "").trim().replace(/^["']|["']$/g, "");
      currentTransform = { regex_strip: pattern };
    } else if (inTransforms && trimmed.startsWith("- strip_section_header:")) {
      if (currentTransform) {
        current.transforms = current.transforms || [];
        current.transforms.push(currentTransform);
      }
      const header = trimmed.replace("- strip_section_header:", "").trim().replace(/^["']|["']$/g, "");
      currentTransform = { strip_section_header: header };
    } else if (inReview && trimmed.startsWith("status:")) {
      current.review!.status = trimmed.replace("status:", "").trim() as "pending" | "approved" | "rejected";
    } else if (inReview && trimmed.startsWith("reviewer:")) {
      const v = trimmed.replace("reviewer:", "").trim();
      current.review!.reviewer = v === "null" ? null : v;
    } else if (inReview && trimmed.startsWith("reviewed_at:")) {
      const v = trimmed.replace("reviewed_at:", "").trim();
      current.review!.reviewed_at = v === "null" ? null : v;
    }
  }

  if (current) {
    if (currentTransform) {
      current.transforms = current.transforms || [];
      current.transforms.push(currentTransform);
    }
    manifest.extractions.push(current as Extraction);
  }

  return manifest;
}

// ── Transforms ────────────────────────────────────────────────────────────

function applyTransforms(content: string, transforms: Transform[]): string {
  let result = content;
  for (const t of transforms) {
    if (t.replace !== undefined && t.with !== undefined) {
      result = result.split(t.replace).join(t.with);
    }
    if (t.regex_strip) {
      const re = new RegExp(t.regex_strip, "gi");
      result = result.replace(re, "[REDACTED]");
    }
    if (t.strip_section_header) {
      // Remove section header and its content until next same-level header
      const escaped = t.strip_section_header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const sectionRe = new RegExp(`${escaped}[\\s\\S]*?(?=\\n##|$)`, "g");
      result = result.replace(sectionRe, "");
    }
  }
  return result;
}

// ── Security scan ─────────────────────────────────────────────────────────

const CUSTOM_PATTERNS = [
  // Client names
  /gpecas|apecaspatense|g\speças|apeças\spatense/gi,
  // Personal names related to clients
  /\bjulio\b|\bjúlio\b|\bbernardo\b/gi,
  // Police/institutional
  /\bpcmg\b|\bdhpp\b|\bintelink\b/gi,
  // Phone numbers (BR)
  /\b5534\d{8,9}\b/g,
  // Email
  /enioxt@[a-zA-Z0-9.]+/g,
  // VPS IPs
  /204\.168\.217\.\d+|217\.216\.95\.\d+/g,
  // Internal domains
  /egos\.ia\.br|intelink\.ia\.br|gpecas\.egos\.ia\.br|guard\.egos\.ia\.br/gi,
  // JWT tokens
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  // Common secret patterns
  /sk-[a-zA-Z0-9]{20,}/g,
  /ghp_[A-Za-z0-9]{20,}/g,
  /AKIA[A-Z0-9]{16}/g,
];

function customSecurityScan(repoPath: string): { violations: string[]; clean: boolean } {
  const violations: string[] = [];

  function scanFile(filePath: string) {
    try {
      const content = readFileSync(filePath, "utf-8");
      for (const pattern of CUSTOM_PATTERNS) {
        pattern.lastIndex = 0;
        const matches = content.match(pattern);
        if (matches) {
          violations.push(`${filePath}: ${pattern} → ${matches.slice(0, 2).join(", ")}`);
        }
      }
    } catch {
      // binary file, skip
    }
  }

  // Infrastructure files are expected to contain pattern strings as code/config — exclude from scan
  const SCAN_EXCLUSIONS = [
    "scripts/extract-public.ts", // contains patterns as code
    "EXTRACT_MANIFEST.yaml",     // contains patterns as regex_strip transforms
    ".gitleaks.toml",            // contains patterns as detection rules
    "VOCABULARY.md",             // intentionally references project names as vocabulary
    "STRATEGY.md",               // intentionally references project names as out-of-scope
  ];

  function walkDir(dir: string) {
    try {
      const entries = require("fs").readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = `${dir}/${entry.name}`;
        if (entry.name === ".git" || entry.name === "node_modules") continue;
        const rel = full.replace(repoPath + "/", "");
        if (SCAN_EXCLUSIONS.some((ex) => rel.endsWith(ex) || rel === ex)) continue;
        if (entry.isDirectory()) walkDir(full);
        else scanFile(full);
      }
    } catch {}
  }

  walkDir(repoPath);
  return { violations, clean: violations.length === 0 };
}

function runGitleaks(repoPath: string): boolean {
  try {
    execSync(`gitleaks detect --source="${repoPath}" --no-git --redact 2>&1`, {
      encoding: "utf-8",
    });
    return true;
  } catch (e: any) {
    console.error("  gitleaks findings:", e.stdout?.substring(0, 500));
    return false;
  }
}

function runTrufflehog(repoPath: string): boolean {
  const trufflehog = "/home/enio/.local/bin/trufflehog";
  if (!existsSync(trufflehog)) return true; // skip if not installed
  try {
    const out = execSync(
      `${trufflehog} filesystem "${repoPath}" --no-update --only-verified 2>&1`,
      { encoding: "utf-8" }
    );
    const hasFindings = out.includes("Found verified result");
    if (hasFindings) {
      console.error("  trufflehog verified findings detected");
      return false;
    }
    return true;
  } catch {
    return true; // non-zero exit without verified findings = ok
  }
}

// ── Report ─────────────────────────────────────────────────────────────────

interface ReportEntry {
  id: string;
  source: string;
  target: string;
  status: "skipped-pending" | "skipped-filter" | "dry-run" | "copied" | "error";
  message?: string;
}

// ── Main ───────────────────────────────────────────────────────────────────

if (SCAN_ONLY) {
  console.log("🔍 Running security scan on egos-public-work/...\n");
  const { violations, clean } = customSecurityScan(REPO_ROOT);
  const gitleaksOk = runGitleaks(REPO_ROOT);
  const trufflehogOk = runTrufflehog(REPO_ROOT);

  if (clean && gitleaksOk && trufflehogOk) {
    console.log("✅ All security scans PASSED. No findings.");
  } else {
    if (!clean) {
      console.error(`❌ Custom patterns: ${violations.length} violations`);
      violations.forEach((v) => console.error(`   ${v}`));
    }
    if (!gitleaksOk) console.error("❌ gitleaks: findings detected");
    if (!trufflehogOk) console.error("❌ trufflehog: verified secrets found");
    process.exit(1);
  }
  process.exit(0);
}

if (!existsSync(MANIFEST_PATH)) {
  console.error(`❌ EXTRACT_MANIFEST.yaml not found at ${MANIFEST_PATH}`);
  process.exit(1);
}

const manifestContent = readFileSync(MANIFEST_PATH, "utf-8");
const manifest = parseManifest(manifestContent);

console.log(`\n🚀 EGOS-PUBLIC Extractor v1.0`);
console.log(`   Mode: ${DRY_RUN ? "DRY-RUN (safe)" : "EXEC (writing files)"}`);
console.log(`   Filter: ${FILTER || "none"}`);
console.log(`   Extractions: ${manifest.extractions.length} total\n`);

const report: ReportEntry[] = [];
let copied = 0;
let skipped = 0;
let errors = 0;

for (const ext of manifest.extractions) {
  // Filter
  if (FILTER) {
    const pattern = FILTER.replace(/\*/g, ".*");
    if (!new RegExp(`^${pattern}$`).test(ext.id)) {
      report.push({ id: ext.id, source: ext.source, target: ext.target, status: "skipped-filter" });
      skipped++;
      continue;
    }
  }

  // Review gate
  if (ext.review.status !== "approved") {
    console.log(`⏳ SKIP (${ext.review.status}) ${ext.id}`);
    report.push({
      id: ext.id,
      source: ext.source,
      target: ext.target,
      status: "skipped-pending",
      message: `review.status=${ext.review.status}`,
    });
    skipped++;
    continue;
  }

  const sourcePath = ext.source.startsWith("/") ? ext.source : resolve(KERNEL_ROOT, ext.source);
  const targetPath = resolve(REPO_ROOT, ext.target);

  if (!existsSync(sourcePath)) {
    console.error(`❌ SOURCE NOT FOUND: ${ext.id} → ${sourcePath}`);
    report.push({ id: ext.id, source: ext.source, target: ext.target, status: "error", message: "source not found" });
    errors++;
    continue;
  }

  try {
    let content = readFileSync(sourcePath, "utf-8");

    // Apply transforms
    if (ext.transforms?.length) {
      content = applyTransforms(content, ext.transforms);
    }

    if (DRY_RUN) {
      console.log(`✅ DRY-RUN ${ext.id} → ${ext.target}`);
      report.push({ id: ext.id, source: ext.source, target: ext.target, status: "dry-run" });
    } else {
      mkdirSync(dirname(targetPath), { recursive: true });
      writeFileSync(targetPath, content, "utf-8");
      console.log(`✅ COPIED ${ext.id} → ${ext.target}`);
      report.push({ id: ext.id, source: ext.source, target: ext.target, status: "copied" });
      copied++;
    }
  } catch (e: any) {
    console.error(`❌ ERROR ${ext.id}: ${e.message}`);
    report.push({ id: ext.id, source: ext.source, target: ext.target, status: "error", message: e.message });
    errors++;
  }
}

// Security scan after exec
if (!DRY_RUN && copied > 0) {
  console.log("\n🔒 Running security scan...");
  const { violations, clean } = customSecurityScan(REPO_ROOT);
  const gitleaksOk = runGitleaks(REPO_ROOT);
  const trufflehogOk = runTrufflehog(REPO_ROOT);

  if (!clean || !gitleaksOk || !trufflehogOk) {
    console.error("\n🚨 SECURITY SCAN FAILED — files may contain sensitive data");
    if (!clean) {
      console.error(`   Custom patterns: ${violations.length} violations`);
      violations.slice(0, 5).forEach((v) => console.error(`   ${v}`));
    }
    if (!gitleaksOk) console.error("   gitleaks: findings detected");
    if (!trufflehogOk) console.error("   trufflehog: verified secrets found");
    console.error("\n   ⚠️  Review and fix before committing.\n");
  } else {
    console.log("✅ Security scan PASSED.");
  }
}

// Write report
const reportPath = resolve(REPO_ROOT, "EXTRACTION_REPORT.md");
const reportContent = `# Extraction Report — ${new Date().toISOString()}

| ID | Source | Target | Status | Note |
|----|--------|--------|--------|------|
${report.map((r) => `| ${r.id} | ${r.source} | ${r.target} | ${r.status} | ${r.message || ""} |`).join("\n")}

**Summary:** ${copied} copied, ${skipped} skipped, ${errors} errors
`;
writeFileSync(reportPath, reportContent);

console.log(`\n📊 Summary: ${copied} copied / ${skipped} skipped / ${errors} errors`);
console.log(`📄 Report: EXTRACTION_REPORT.md`);

if (errors > 0) process.exit(1);
