#!/usr/bin/env bun
/**
 * RATIO-ABSORB-002 — Citation Verification
 *
 * Verifica se citações de documentos/processo existem na KB do tenant.
 * Evita citação inventada (hallucination).
 *
 * Padrão Ratio: 5-layer matching (exact → strong → weak → unverified)
 * Vault integration [GROK-EVD-004]: promove Claim → VerifiedKnowledge quando ≥2 fontes.
 *
 * Usage: bun agents/skills/citation-verifier.ts [command] [options]
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { verifyClaimInVault, VAULT_ENABLED, VAULT_TENANT_ID } from './vault-integration';

interface CitationCheck {
  citation: string;
  docId: string | null;
  verified: boolean;
  level: 'exact' | 'strong' | 'weak' | 'unverified';
  source: string | null;
}

/**
 * Extract doc_id from citation text
 * Supports formats:
 * - "Processo nº 12345/2024"
 * - "doc_id: abc123"
 * - "[VERIFICAR: 12345]"
 */
function extractDocId(citation: string): string | null {
  // Pattern: Processo nº XXXXX/YYYY
  const processoMatch = citation.match(/Processo nº\s+(\d+[\/\.\-]?\d*)/i);
  if (processoMatch) return processoMatch[1].replace(/[^\w]/g, '');
  
  // Pattern: doc_id: XXX
  const docIdMatch = citation.match(/doc_id[:\s]+([\w\-]+)/i);
  if (docIdMatch) return docIdMatch[1];
  
  // Pattern: [VERIFICAR: XXX]
  const verificarMatch = citation.match(/\[VERIFICAR:\s*([\w\-]+)\]/i);
  if (verificarMatch) return verificarMatch[1];
  
  return null;
}

/**
 * Check if doc_id exists in KB (simplified — real impl queries Supabase)
 */
function checkInKB(docId: string, tenantId: string): { found: boolean; source: string | null } {
  // MVP: Check local mock data
  // Real implementation: query Supabase `kb_pages` where tenant_id = $1 AND doc_id = $2
  
  const mockKB: Record<string, string[]> = {
    'tenant-demo': ['12345', 'abc123', 'processo-2024-001'],
  };
  
  const tenantKB = mockKB[tenantId] || [];
  const found = tenantKB.includes(docId);
  
  return {
    found,
    source: found ? `kb_pages/${tenantId}/${docId}` : null,
  };
}

/**
 * Verify citation with 4-level matching
 */
function verifyCitation(citation: string, tenantId: string): CitationCheck {
  const docId = extractDocId(citation);
  
  if (!docId) {
    return {
      citation,
      docId: null,
      verified: false,
      level: 'unverified',
      source: null,
    };
  }
  
  const kbCheck = checkInKB(docId, tenantId);

  if (kbCheck.found) {
    return {
      citation,
      docId,
      verified: true,
      level: 'exact',
      source: kbCheck.source,
    };
  }

  // TODO: Implement strong match (normalized) and weak match (fuzzy)
  // For MVP, exact match only

  return {
    citation,
    docId,
    verified: false,
    level: 'unverified',
    source: null,
  };
}

/**
 * Vault-backed citation check [GROK-EVD-004].
 * Checks evidence_verified_knowledge + evidence_claims for the assertion.
 * Promotes to VerifiedKnowledge (via API) when ≥2 independent sources found.
 * No-op if VAULT_ENABLED = false.
 */
async function verifyClaimWithVault(
  citation: string,
  tenantId: string
): Promise<CitationCheck & { vault_verified?: boolean; vault_evidence_ids?: string[] }> {
  const base = verifyCitation(citation, tenantId);

  if (!VAULT_ENABLED) return base;

  try {
    const vaultResult = await verifyClaimInVault({ claim_text: citation, tenant_id: tenantId });
    if (vaultResult.found && vaultResult.verified) {
      return {
        ...base,
        verified: true,
        level: 'exact',
        source: vaultResult.evidence_ids[0] ?? null,
        vault_verified: true,
        vault_evidence_ids: vaultResult.evidence_ids,
      };
    }
  } catch (e) {
    // Vault check failure is non-blocking
    console.error(`[citation-verifier] vault check failed: ${e}`);
  }

  return base;
}

/**
 * Format citation with verification mark
 */
function formatCitation(check: CitationCheck): string {
  if (check.verified) {
    return `[VERIFICADO: ${check.docId}] ${check.citation}`;
  } else if (check.docId) {
    return `[NÃO_VERIFICADO: ${check.docId}] ${check.citation}`;
  } else {
    return `[SEM_ID] ${check.citation}`;
  }
}

/**
 * Main CLI
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  switch (command) {
    case 'verify': {
      const citation = args[1];
      const tenantId = args[2] || 'tenant-demo';
      
      if (!citation) {
        console.log('Usage: bun citation-verifier.ts verify "citation text" [tenant_id]');
        process.exit(1);
      }
      
      const result = verifyCitation(citation, tenantId);
      console.log('\n📋 Citation Verification\n');
      console.log(`Original: ${result.citation}`);
      console.log(`Doc ID: ${result.docId || 'not found'}`);
      console.log(`Level: ${result.level}`);
      console.log(`Verified: ${result.verified ? '✅' : '❌'}`);
      console.log(`Source: ${result.source || 'N/A'}`);
      console.log(`\nFormatted: ${formatCitation(result)}\n`);
      break;
    }
    
    case 'batch': {
      const citations = [
        'Segundo o Processo nº 12345/2024, a parte ré...',
        'Conforme doc_id: abc123, o entendimento é...',
        'O STF decidiu no processo 99999/2023 que...', // não existe
        '[VERIFICAR: processo-2024-001] A decisão foi...',
      ];
      
      console.log('\n📋 Batch Verification\n');
      citations.forEach(c => {
        const result = verifyCitation(c, 'tenant-demo');
        console.log(`${result.verified ? '✅' : '❌'} ${formatCitation(result).slice(0, 70)}...`);
      });
      console.log('');
      break;
    }
    
    default: {
      console.log(`
RATIO-ABSORB-002 — Citation Verification

Commands:
  verify "citation" [tenant]  Verify single citation
  batch                       Run test batch

Examples:
  bun citation-verifier.ts verify "Processo nº 12345/2024"
  bun citation-verifier.ts verify "Conforme doc_id: abc123..." tenant-x

Levels:
  exact       → doc_id found in KB
  strong      → normalized match (TODO)
  weak        → fuzzy match (TODO)
  unverified  → not found
`);
    }
  }
}

main();
