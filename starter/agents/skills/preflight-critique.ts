#!/usr/bin/env bun
/**
 * EGOS-ARCH-013 — Pre-flight Critique Formal
 * ATRiAN como gate accept/revise/reject antes de qualquer build
 * 
 * Usage: bun agents/skills/preflight-critique.ts [--task TASK_TYPE] [--exec]
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface CritiqueResult {
  decision: 'accept' | 'revise' | 'reject';
  score: number;  // 0-100
  dimensions: {
    ethics: number;      // ATRiAN: ethics check
    lgpd: number;         // ATRiAN: PII-BR compliance
    bias: number;         // ATRiAN: bias detection
    rights: number;       // ATRiAN: copyright, IP
    feasibility: number;  // Technical feasibility
    evidence: number;     // Evidence backing claims
  };
  reasons: string[];
}

interface TaskIntent {
  type: string;
  description: string;
  scope: 'trivial' | 'simple' | 'moderate' | 'complex' | 'critical';
  estimatedImpact: string;
}

/**
 * Scoring thresholds
 */
const THRESHOLDS = {
  accept: 75,   // Score >= 75 → Accept
  revise: 50,   // Score 50-74 → Revise
  // Score < 50 → Reject
};

/**
 * ATRiAN Ethical Check
 */
function checkATRiAN(intent: TaskIntent): { passed: boolean; score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 100;
  
  // Ethics check
  if (intent.description.match(/scraping|scrape/i) && !intent.description.match(/public|permissible/i)) {
    issues.push('⚠️  Potential unauthorized data scraping — verify data source permissions');
    score -= 20;
  }
  
  // LGPD/PII check
  if (intent.description.match(/cpf|cnpj|email|phone|personal|pii/i)) {
    issues.push('⚠️  PII detected — ensure LGPD compliance and masking');
    score -= 15;
  }
  
  // Bias check
  if (intent.scope === 'complex' && !intent.description.match(/review|validate|check/i)) {
    issues.push('⚠️  Complex task without validation step — bias risk');
    score -= 10;
  }
  
  // Rights check
  if (intent.description.match(/copy|clone|fork/i) && !intent.description.match(/license|permissible|open.source/i)) {
    issues.push('⚠️  IP/copyright considerations — verify licensing');
    score -= 15;
  }
  
  return { passed: score >= 70, score, issues };
}

/**
 * Technical Feasibility Check
 */
function checkFeasibility(intent: TaskIntent): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 100;
  
  // Scope vs complexity alignment
  if (intent.scope === 'trivial' && intent.description.length > 200) {
    issues.push('⚠️  Description length suggests complexity > trivial scope');
    score -= 15;
  }
  
  if (intent.scope === 'critical' && !intent.description.match(/test|verify|validate/i)) {
    issues.push('⚠️  Critical task without explicit verification — risky');
    score -= 20;
  }
  
  return { score, issues };
}

/**
 * Evidence Check
 */
function checkEvidence(intent: TaskIntent): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 100;
  
  // Claims without evidence
  if (intent.description.match(/faster|better|improve|optimize/i) && 
      !intent.description.match(/benchmark|metric|measure|test/i)) {
    issues.push('⚠️  Improvement claims without metrics — evidence needed');
    score -= 15;
  }
  
  return { score, issues };
}

/**
 * Run pre-flight critique
 */
function runCritique(intent: TaskIntent): CritiqueResult {
  const atr = checkATRiAN(intent);
  const tech = checkFeasibility(intent);
  const evd = checkEvidence(intent);
  
  const dimensions = {
    ethics: Math.max(0, Math.min(100, atr.score)),
    lgpd: Math.max(0, Math.min(100, intent.description.match(/pii|personal/i) ? 60 : 100)),
    bias: Math.max(0, Math.min(100, 100 - (intent.scope === 'complex' ? 10 : 0))),
    rights: Math.max(0, Math.min(100, 100 - (intent.description.match(/copy|clone/i) ? 15 : 0))),
    feasibility: tech.score,
    evidence: evd.score,
  };
  
  // Weighted average
  const weights = { ethics: 0.25, lgpd: 0.20, bias: 0.15, rights: 0.15, feasibility: 0.15, evidence: 0.10 };
  const overallScore = Math.round(
    Object.entries(dimensions).reduce((sum, [k, v]) => sum + v * weights[k as keyof typeof weights], 0)
  );
  
  // Decision
  let decision: CritiqueResult['decision'];
  if (overallScore >= THRESHOLDS.accept) {
    decision = 'accept';
  } else if (overallScore >= THRESHOLDS.revise) {
    decision = 'revise';
  } else {
    decision = 'reject';
  }
  
  // Collect all reasons
  const reasons = [...atr.issues, ...tech.issues, ...evd.issues];
  if (overallScore < 100) {
    reasons.unshift(`Overall score: ${overallScore}/100`);
  }
  
  return { decision, score: overallScore, dimensions, reasons };
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  if (command === 'help') {
    console.log('EGOS-ARCH-013 — Pre-flight Critique Formal\n');
    console.log('Usage:');
    console.log('  bun preflight-critique.ts [task-type] [description] [scope]');
    console.log('\nExample:');
    console.log('  bun preflight-critique.ts refactor "Refactor auth.ts" moderate');
    console.log('\nScopes: trivial, simple, moderate, complex, critical');
    return;
  }
  
  // Parse intent from CLI
  const intent: TaskIntent = {
    type: args[0] || 'task',
    description: args[1] || '',
    scope: (args[2] as TaskIntent['scope']) || 'moderate',
    estimatedImpact: args[3] || 'medium',
  };
  
  if (!intent.description) {
    // Try to read from stdin or use a default test
    intent.description = 'Test task for pre-flight critique validation';
  }
  
  console.log('🛫 EGOS Pre-flight Critique\n');
  console.log(`Task: ${intent.type}`);
  console.log(`Scope: ${intent.scope}`);
  console.log(`Description: ${intent.description.slice(0, 60)}${intent.description.length > 60 ? '...' : ''}`);
  console.log();
  
  const result = runCritique(intent);
  
  // Display results
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log(`║  DECISION: ${result.decision.toUpperCase().padEnd(8)}  Score: ${result.score}/100        ║`);
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Ethics:    ${result.dimensions.ethics}%    LGPD:    ${result.dimensions.lgpd}%          ║`);
  console.log(`║  Bias:      ${result.dimensions.bias}%    Rights:  ${result.dimensions.rights}%          ║`);
  console.log(`║  Feasible:  ${result.dimensions.feasibility}%    Evidence:${result.dimensions.evidence}%          ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();
  
  if (result.reasons.length > 0) {
    console.log('Feedback:');
    for (const reason of result.reasons) {
      console.log(`  ${reason}`);
    }
  }
  
  console.log();
  if (result.decision === 'accept') {
    console.log('✅ Proceed with build');
  } else if (result.decision === 'revise') {
    console.log('🔄 Revise approach before proceeding');
  } else {
    console.log('❌ Rejected — address issues before retrying');
    process.exit(1);
  }
}

main().catch(console.error);
