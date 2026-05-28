#!/usr/bin/env bun
/**
 * relationship-mapper.ts — KBS-030
 * 
 * Adapter TypeScript para expor via Knowledge MCP:
 * - find_links (encontrar conexões entre entidades)
 * - cross_case_analysis (análise cruzada)
 * - analyze_network (análise de rede)
 * - detect_clusters (detecção de clusters)
 * - detect_anomalies (detecção de anomalias)
 * 
 * Adapter for exposing relationship analysis tools via Knowledge MCP.
 * (centrality scores + anomaly heuristics implemented in the backing Python API)
 */

import { writeFileSync } from "fs";
import { join } from "path";

const CONFIG = {
  version: "1.0.0",
  apiBaseUrl: process.env.EGOS_INTELIGENCIA_API || "http://localhost:8000",
  endpoints: {
    crossReference: "/api/v1/cross_reference",
    graph: "/api/v1/graph",
  },
};

// Types
interface Entity {
  id: string;
  type: string;
  name: string;
  attributes: Record<string, unknown>;
}

interface Relationship {
  source: string;
  target: string;
  type: string;
  strength: number;
  context?: string;
}

interface NetworkAnalysis {
  entities: Entity[];
  relationships: Relationship[];
  centrality: Record<string, number>;
  clusters: string[][];
  anomalies: Anomaly[];
}

interface Anomaly {
  entity: string;
  type: string;
  score: number;
  description: string;
}

// Mock implementations (real: call your backing FastAPI service)
function findLinks(entities: Entity[]): Relationship[] {
  const relationships: Relationship[] = [];
  
  // Simple link detection based on shared attributes
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const e1 = entities[i];
      const e2 = entities[j];
      
      // Check for shared email
      if (e1.attributes.email && e1.attributes.email === e2.attributes.email) {
        relationships.push({
          source: e1.id,
          target: e2.id,
          type: "SHARED_EMAIL",
          strength: 0.9,
          context: `Email compartilhado: ${e1.attributes.email}`,
        });
      }
      
      // Check for shared phone
      if (e1.attributes.phone && e1.attributes.phone === e2.attributes.phone) {
        relationships.push({
          source: e1.id,
          target: e2.id,
          type: "SHARED_PHONE",
          strength: 0.95,
          context: `Telefone compartilhado: ${e1.attributes.phone}`,
        });
      }
      
      // Check for shared address
      if (e1.attributes.address && e1.attributes.address === e2.attributes.address) {
        relationships.push({
          source: e1.id,
          target: e2.id,
          type: "SHARED_ADDRESS",
          strength: 0.85,
          context: `Endereço compartilhado`,
        });
      }
    }
  }
  
  return relationships;
}

function calculateCentrality(entities: Entity[], relationships: Relationship[]): Record<string, number> {
  const centrality: Record<string, number> = {};
  
  // Simple degree centrality
  for (const entity of entities) {
    const degree = relationships.filter(
      r => r.source === entity.id || r.target === entity.id
    ).length;
    centrality[entity.id] = degree;
  }
  
  return centrality;
}

function detectClusters(entities: Entity[], relationships: Relationship[]): string[][] {
  // Simple clustering: connected components
  const visited = new Set<string>();
  const clusters: string[][] = [];
  
  function dfs(entityId: string, cluster: string[]) {
    if (visited.has(entityId)) return;
    visited.add(entityId);
    cluster.push(entityId);
    
    for (const rel of relationships) {
      if (rel.source === entityId) dfs(rel.target, cluster);
      if (rel.target === entityId) dfs(rel.source, cluster);
    }
  }
  
  for (const entity of entities) {
    if (!visited.has(entity.id)) {
      const cluster: string[] = [];
      dfs(entity.id, cluster);
      if (cluster.length > 1) clusters.push(cluster);
    }
  }
  
  return clusters;
}

function detectAnomalies(entities: Entity[], relationships: Relationship[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const centrality = calculateCentrality(entities, relationships);
  
  // High centrality anomaly (hub entity)
  const maxCentrality = Math.max(...Object.values(centrality));
  for (const [entityId, score] of Object.entries(centrality)) {
    if (score > maxCentrality * 0.8 && score > 3) {
      const entity = entities.find(e => e.id === entityId);
      anomalies.push({
        entity: entityId,
        type: "HIGH_CENTRALITY",
        score: score / maxCentrality,
        description: `${entity?.name || entityId} é um hub central (${score} conexões)`,
      });
    }
  }
  
  // Isolated entity anomaly
  for (const entity of entities) {
    const degree = centrality[entity.id] || 0;
    if (degree === 0) {
      anomalies.push({
        entity: entity.id,
        type: "ISOLATED",
        score: 1.0,
        description: `${entity.name} está isolado (sem conexões)`,
      });
    }
  }
  
  return anomalies;
}

function analyzeNetwork(entities: Entity[]): NetworkAnalysis {
  const relationships = findLinks(entities);
  const centrality = calculateCentrality(entities, relationships);
  const clusters = detectClusters(entities, relationships);
  const anomalies = detectAnomalies(entities, relationships);
  
  return {
    entities,
    relationships,
    centrality,
    clusters,
    anomalies,
  };
}

function generateMarkdownReport(analysis: NetworkAnalysis): string {
  let md = `# Relatório de Análise de Rede\n\n`;
  md += `**Entidades:** ${analysis.entities.length}  \n`;
  md += `**Relacionamentos:** ${analysis.relationships.length}  \n`;
  md += `**Clusters:** ${analysis.clusters.length}  \n`;
  md += `**Anomalias:** ${analysis.anomalies.length}  \n\n`;
  
  md += `## Centralidade\n\n`;
  md += `| Entidade | Grau |\n`;
  md += `|----------|------|\n`;
  const sortedCentrality = Object.entries(analysis.centrality)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  for (const [entityId, score] of sortedCentrality) {
    const entity = analysis.entities.find(e => e.id === entityId);
    md += `| ${entity?.name || entityId} | ${score} |\n`;
  }
  
  md += `\n## Relacionamentos\n\n`;
  md += `| Origem | Tipo | Destino | Força |\n`;
  md += `|--------|------|---------|-------|\n`;
  for (const rel of analysis.relationships.slice(0, 20)) {
    const source = analysis.entities.find(e => e.id === rel.source);
    const target = analysis.entities.find(e => e.id === rel.target);
    md += `| ${source?.name || rel.source} | ${rel.type} | ${target?.name || rel.target} | ${(rel.strength * 100).toFixed(0)}% |\n`;
  }
  
  md += `\n## Anomalias Detectadas\n\n`;
  for (const anomaly of analysis.anomalies) {
    const emoji = anomaly.type === "HIGH_CENTRALITY" ? "🔴" : "🟡";
    md += `${emoji} **${anomaly.type}** — ${anomaly.description} (score: ${(anomaly.score * 100).toFixed(0)}%)\n\n`;
  }
  
  md += `\n---\n*Gerado por relationship-mapper.ts v${CONFIG.version}*\n`;
  return md;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes("--help")) {
    console.log(`
relationship-mapper.ts — KBS-030 Relationship Mapper

Usage:
  bun agents/skills/relationship-mapper.ts --entities <file.json>
  bun agents/skills/relationship-mapper.ts --demo

Options:
  --entities <file>  JSON file with entities array
  --demo             Run with demo data
  --output <file>    Save report to file
`);
    process.exit(0);
  }
  
  let entities: Entity[] = [];
  
  if (args.includes("--demo")) {
    // Demo data
    entities = [
      { id: "1", type: "Person", name: "João Silva", attributes: { email: "joao@email.com", phone: "11999999999" } },
      { id: "2", type: "Person", name: "Maria Souza", attributes: { email: "joao@email.com" } }, // Shared email
      { id: "3", type: "Person", name: "Pedro Santos", attributes: { phone: "11999999999" } }, // Shared phone
      { id: "4", type: "Company", name: "Empresa A", attributes: { cnpj: "12.345.678/0001-00" } },
      { id: "5", type: "Person", name: "Isolado", attributes: {} }, // Isolated
    ];
  } else if (args.includes("--entities")) {
    const filePath = args[args.indexOf("--entities") + 1];
    const data = await import("fs").then(fs => fs.readFileSync(filePath, "utf-8"));
    entities = JSON.parse(data);
  }
  
  const analysis = analyzeNetwork(entities);
  const report = generateMarkdownReport(analysis);
  
  console.log(report);
  
  if (args.includes("--output")) {
    const outputPath = args[args.indexOf("--output") + 1];
    writeFileSync(outputPath, report);
    console.error(`✅ Saved to: ${outputPath}`);
  }
}

main().catch(console.error);
