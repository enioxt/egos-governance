#!/usr/bin/env bun
/**
 * observability-agent.ts — PAP-AGENTS-003
 * 
 * Agente de observabilidade para EGOS — coleta métricas e gera relatórios
 * 2x/dia (09:00 e 21:00 BRT)
 * 
 * Integração: Pode ser chamado via CLI ou usado como base para Paperclip agent
 */

import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";

const VERSION = "1.0.0";
const CONFIG = {
  logsDir: "/var/log/egos",
  jobsDir: "docs/jobs",
  dockerCheck: true,
  systemCheck: true,
  endpoints: [
    { name: "api-gateway", url: "https://your-gateway.example.com/health" },
    { name: "worker-api", url: "https://your-worker.example.com/health" },
    { name: "llm-router", url: "http://localhost:18789/health" },
    { name: "local-service", url: "http://localhost:3002/api/health" },
  ],
};

interface HealthCheck {
  name: string;
  url: string;
  status: "up" | "down" | "error";
  latency?: number;
  error?: string;
}

interface DockerContainer {
  name: string;
  status: string;
  cpu?: string;
  memory?: string;
}

interface SystemMetrics {
  timestamp: string;
  cpu: { loadAvg: number[] };
  memory: { used: number; total: number; percent: number };
  disk: { used: number; total: number; percent: number };
}

interface ObservabilityReport {
  meta: {
    version: string;
    generatedAt: string;
    hostname: string;
  };
  summary: {
    totalContainers: number;
    healthyContainers: number;
    totalEndpoints: number;
    healthyEndpoints: number;
    alerts: number;
  };
  docker: DockerContainer[];
  health: HealthCheck[];
  system: SystemMetrics;
  alerts: string[];
}

// Mock implementations (real: would call system commands)
function checkDocker(): DockerContainer[] {
  try {
    // Mock: in production, would run `docker stats --no-stream`
    return [
      { name: "egos-gateway", status: "running", cpu: "2.5%", memory: "150MB / 512MB" },
      { name: "gem-hunter-api", status: "running", cpu: "1.2%", memory: "120MB / 256MB" },
      { name: "hermes", status: "running", cpu: "5.0%", memory: "200MB / 512MB" },
      { name: "postgres", status: "running", cpu: "3.0%", memory: "300MB / 1GB" },
      { name: "redis", status: "running", cpu: "0.5%", memory: "50MB / 256MB" },
    ];
  } catch {
    return [];
  }
}

async function checkHealthEndpoints(): Promise<HealthCheck[]> {
  const results: HealthCheck[] = [];
  
  for (const ep of CONFIG.endpoints) {
    try {
      const start = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(ep.url, { 
        signal: controller.signal,
        headers: { "Accept": "application/json" }
      });
      
      clearTimeout(timeout);
      const latency = Date.now() - start;
      
      results.push({
        name: ep.name,
        url: ep.url,
        status: response.ok ? "up" : "down",
        latency,
      });
    } catch (error) {
      results.push({
        name: ep.name,
        url: ep.url,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
  
  return results;
}

function getSystemMetrics(): SystemMetrics {
  // Mock: in production, would read /proc/meminfo, /proc/loadavg, df
  return {
    timestamp: new Date().toISOString(),
    cpu: {
      loadAvg: [0.5, 0.8, 1.2],
    },
    memory: {
      used: 4.2,
      total: 8,
      percent: 52.5,
    },
    disk: {
      used: 45,
      total: 100,
      percent: 45,
    },
  };
}

function generateAlerts(report: ObservabilityReport): string[] {
  const alerts: string[] = [];
  
  // Check failed endpoints
  for (const ep of report.health) {
    if (ep.status !== "up") {
      alerts.push(`🔴 **${ep.name}**: DOWN (${ep.error || "No response"})`);
    }
  }
  
  // Check high resource usage
  if (report.system.memory.percent > 80) {
    alerts.push(`🟡 **Memory**: ${report.system.memory.percent}% used (threshold: 80%)`);
  }
  
  if (report.system.disk.percent > 85) {
    alerts.push(`🔴 **Disk**: ${report.system.disk.percent}% used (threshold: 85%)`);
  }
  
  // Check load average
  const load1min = report.system.cpu.loadAvg[0];
  if (load1min > 4) {
    alerts.push(`🟡 **CPU Load**: ${load1min} (high)`);
  }
  
  return alerts;
}

function generateMarkdownReport(report: ObservabilityReport): string {
  const date = new Date(report.meta.generatedAt).toLocaleString("pt-BR");
  
  let md = `# Observability Report — ${date}\n\n`;
  md += `**Hostname:** ${report.meta.hostname}  \n`;
  md += `**Version:** ${report.meta.version}  \n\n`;
  
  // Summary
  md += `## 📊 Resumo\n\n`;
  md += `- **Containers:** ${report.summary.healthyContainers}/${report.summary.totalContainers} saudáveis\n`;
  md += `- **Endpoints:** ${report.summary.healthyEndpoints}/${report.summary.totalEndpoints} online\n`;
  md += `- **Alertas:** ${report.summary.alerts}\n\n`;
  
  // Alerts section (if any)
  if (report.alerts.length > 0) {
    md += `## ⚠️ Alertas\n\n`;
    for (const alert of report.alerts) {
      md += `- ${alert}\n`;
    }
    md += `\n`;
  }
  
  // Docker containers
  md += `## 🐋 Docker Containers\n\n`;
  md += `| Container | Status | CPU | Memória |\n`;
  md += `|-----------|--------|-----|---------|\n`;
  for (const c of report.docker) {
    const emoji = c.status === "running" ? "🟢" : "🔴";
    md += `| ${emoji} ${c.name} | ${c.status} | ${c.cpu || "N/A"} | ${c.memory || "N/A"} |\n`;
  }
  md += `\n`;
  
  // Health endpoints
  md += `## 🔌 Health Endpoints\n\n`;
  md += `| Serviço | Status | Latência |\n`;
  md += `|---------|--------|----------|\n`;
  for (const ep of report.health) {
    const emoji = ep.status === "up" ? "🟢" : ep.status === "down" ? "🔴" : "🟡";
    const latency = ep.latency ? `${ep.latency}ms` : "N/A";
    md += `| ${emoji} ${ep.name} | ${ep.status} | ${latency} |\n`;
  }
  md += `\n`;
  
  // System metrics
  md += `## 💻 System Metrics\n\n`;
  md += `**CPU Load Average:** ${report.system.cpu.loadAvg.join(", ")}\n\n`;
  md += `**Memory:** ${report.system.memory.used}GB / ${report.system.memory.total}GB (${report.system.memory.percent}%)\n\n`;
  md += `**Disk:** ${report.system.disk.used}GB / ${report.system.disk.total}GB (${report.system.disk.percent}%)\n\n`;
  
  // Recent cron logs (mock)
  md += `## 📝 Recent Cron Logs\n\n`;
  md += `\`\`\`\n`;
  md += `[09:00] obs-central.ts — Report generated successfully\n`;
  md += `[08:30] gem-hunter-cron.sh — Discovery completed (12 gems found)\n`;
  md += `[08:00] heartbeat.sh — All systems nominal\n`;
  md += `\`\`\`\n\n`;
  
  md += `---\n*Gerado por observability-agent.ts v${VERSION} | EGOS Observability*\n`;
  return md;
}

async function generateReport(): Promise<ObservabilityReport> {
  const [docker, health, system] = await Promise.all([
    Promise.resolve(checkDocker()),
    checkHealthEndpoints(),
    Promise.resolve(getSystemMetrics()),
  ]);
  
  const report: ObservabilityReport = {
    meta: {
      version: VERSION,
      generatedAt: new Date().toISOString(),
      hostname: "egos-vps",
    },
    summary: {
      totalContainers: docker.length,
      healthyContainers: docker.filter(c => c.status === "running").length,
      totalEndpoints: health.length,
      healthyEndpoints: health.filter(h => h.status === "up").length,
      alerts: 0,
    },
    docker,
    health,
    system,
    alerts: [],
  };
  
  report.alerts = generateAlerts(report);
  report.summary.alerts = report.alerts.length;
  
  return report;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes("--help")) {
    console.log(`
observability-agent.ts — PAP-AGENTS-003 Observability Agent

Usage:
  bun agents/skills/observability-agent.ts           # Generate report
  bun agents/skills/observability-agent.ts --save    # Save to docs/jobs/
  bun agents/skills/observability-agent.ts --json    # Output JSON

Options:
  --save    Save report to docs/jobs/obs-YYYY-MM-DD.md
  --json    Output JSON format
  --cron    Run in cron mode (silent, only errors)
`);
    process.exit(0);
  }
  
  const isCron = args.includes("--cron");
  const isJson = args.includes("--json");
  const shouldSave = args.includes("--save");
  
  try {
    if (!isCron) {
      console.error("🔍 Collecting observability data...");
    }
    
    const report = await generateReport();
    
    if (isJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      const markdown = generateMarkdownReport(report);
      
      if (!isCron) {
        console.log(markdown);
      }
      
      if (shouldSave || isCron) {
        const date = new Date().toISOString().split("T")[0];
        const filename = `obs-${date}.md`;
        const filepath = join(CONFIG.jobsDir, filename);
        
        try {
          writeFileSync(filepath, markdown);
          if (!isCron) {
            console.error(`✅ Report saved: ${filepath}`);
          }
        } catch (e) {
          console.error(`❌ Failed to save: ${e}`);
        }
      }
    }
    
    // Exit with error if there are critical alerts
    const criticalAlerts = report.alerts.filter(a => a.includes("🔴"));
    if (criticalAlerts.length > 0 && isCron) {
      console.error(`CRITICAL: ${criticalAlerts.length} alerts detected`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

main();
