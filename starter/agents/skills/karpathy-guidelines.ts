/**
 * Karpathy Guidelines Skill — EGOS-K003
 *
 * Implements the 4 Karpathy Principles for code quality and decision making:
 * 1. Think Before Coding — explicit reasoning before implementation
 * 2. Simplicity First — minimum code that solves the problem
 * 3. Surgical Changes — modify ONLY what was requested
 * 4. Goal-Driven Execution — know success criteria before starting
 *
 * This skill can be invoked by agents to validate their approach before
 * executing code changes or architectural decisions.
 *
 * INTEGRATION POLICY (INV-STAB-005 — 2026-05-21):
 *   `agents/runtime/runner.ts` is a FROZEN ZONE (CLAUDE.md §Arquitetura).
 *   This skill is NOT integrated into runner.ts by design — invoke via:
 *   (1) Programmatic import: `import { validateKarpathy } from '../skills/karpathy-guidelines'`
 *   (2) CLI standalone: `KARPATHY_PLAN="..." KARPATHY_COMPLEXITY=moderate KARPATHY_LINES=50 \
 *       KARPATHY_CRITERIA="test|metric" bun agents/skills/karpathy-guidelines.ts`
 *   Future hook integration → `.husky/pre-commit` or `scripts/check-karpathy-pre-agent.ts`
 *   (does not require runner.ts modification).
 *
 * Usage:
 *   import { validateKarpathy } from '../skills/karpathy-guidelines';
 *   const result = validateKarpathy({ plan, complexity, estimatedLines });
 */

export interface KarpathyValidation {
  principle: 'think-before-coding' | 'simplicity-first' | 'surgical-changes' | 'goal-driven';
  passed: boolean;
  score: number; // 0-100
  feedback: string[];
  recommendation: string;
}

export interface ValidationInput {
  plan?: string;
  complexity?: 'trivial' | 'simple' | 'moderate' | 'complex' | 'critical';
  estimatedLines?: number;
  actualLines?: number;
  requestedChange?: string;
  actualChanges?: string[];
  successCriteria?: string[];
  dependencies?: string[];
}

// ─── Principle 1: Think Before Coding ─────────────────────
function validateThinkBeforeCoding(input: ValidationInput): KarpathyValidation {
  const feedback: string[] = [];
  let score = 100;

  if (!input.plan || input.plan.length < 50) {
    feedback.push('❌ No explicit plan provided. State goal, dependencies, expected output.');
    score -= 40;
  } else if (!input.plan.includes('goal') && !input.plan.includes('objective')) {
    feedback.push('⚠️ Plan lacks explicit goal statement.');
    score -= 20;
  }

  if (!input.dependencies || input.dependencies.length === 0) {
    feedback.push('⚠️ Dependencies not enumerated. May miss critical blockers.');
    score -= 15;
  }

  return {
    principle: 'think-before-coding',
    passed: score >= 70,
    score: Math.max(0, score),
    feedback,
    recommendation: score >= 70
      ? '✅ Good planning. Proceed with implementation.'
      : '⛔ STOP: Plan unclear. Write explicit goal + dependencies + expected output before coding.',
  };
}

// ─── Principle 2: Simplicity First ────────────────────────
function validateSimplicityFirst(input: ValidationInput): KarpathyValidation {
  const feedback: string[] = [];
  let score = 100;

  const estimated = input.estimatedLines || 0;
  const actual = input.actualLines || estimated;

  // Hard limits from evidence-gate.ts (EVG-008)
  if (actual > 500) {
    feedback.push(`❌ ${actual} LOC exceeds 500-line hard limit. Must justify or split.`);
    score -= 50;
  } else if (actual > 300) {
    feedback.push(`⚠️ ${actual} LOC exceeds 300-line warning threshold. Ask: is this minimal?`);
    score -= 25;
  }

  // Complexity alignment
  const complexityLimits: Record<string, number> = {
    'trivial': 20,
    'simple': 100,
    'moderate': 200,
    'complex': 400,
    'critical': 500,
  };

  const limit = input.complexity ? complexityLimits[input.complexity] : 300;
  if (actual > limit * 1.5) {
    feedback.push(`⚠️ ${actual} LOC is ${(actual/limit).toFixed(1)}x the typical limit for ${input.complexity} tasks.`);
    score -= 20;
  }

  return {
    principle: 'simplicity-first',
    passed: score >= 70,
    score: Math.max(0, score),
    feedback,
    recommendation: score >= 70
      ? '✅ Simplicity maintained. Code is appropriately sized.'
      : `⛔ COMPLEXITY ALERT: ${actual} LOC. Consider: (1) split into smaller functions, (2) remove speculative abstractions, (3) DRY is not an excuse for bad abstraction.`,
  };
}

// ─── Principle 3: Surgical Changes ──────────────────────
function validateSurgicalChanges(input: ValidationInput): KarpathyValidation {
  const feedback: string[] = [];
  let score = 100;

  if (!input.requestedChange) {
    feedback.push('⚠️ Original request not documented. Cannot verify surgical precision.');
    score -= 15;
  }

  if (input.actualChanges && input.requestedChange) {
    const unrelated = input.actualChanges.filter(c =>
      !c.toLowerCase().includes(input.requestedChange!.toLowerCase()) &&
      !input.requestedChange!.toLowerCase().split(' ').some(word =>
        c.toLowerCase().includes(word) && word.length > 4
      )
    );

    if (unrelated.length > 0) {
      feedback.push(`❌ ${unrelated.length} unrelated changes detected: ${unrelated.join(', ')}`);
      score -= 30;
    }

    if (input.actualChanges.length > 5) {
      feedback.push(`⚠️ ${input.actualChanges.length} files changed. Surgical changes should touch <5 files.`);
      score -= 20;
    }
  }

  return {
    principle: 'surgical-changes',
    passed: score >= 70,
    score: Math.max(0, score),
    feedback,
    recommendation: score >= 70
      ? '✅ Surgical precision maintained. Only requested changes implemented.'
      : '⛔ SCOPE CREEP: Unrelated changes detected. Create separate PR for drive-by improvements.',
  };
}

// ─── Principle 4: Goal-Driven Execution ─────────────────
function validateGoalDriven(input: ValidationInput): KarpathyValidation {
  const feedback: string[] = [];
  let score = 100;

  if (!input.successCriteria || input.successCriteria.length === 0) {
    feedback.push('❌ No success criteria defined. Cannot verify goal achievement.');
    score -= 45;
  } else {
    if (input.successCriteria.some(c => c.includes('seems') || c.includes('appears'))) {
      feedback.push('⚠️ Success criteria are fuzzy ("seems", "appears"). Use measurable validation.');
      score -= 20;
    }

    if (input.successCriteria.length < 2) {
      feedback.push('⚠️ Only 1 success criterion. Add tests, edge cases, or integration checks.');
      score -= 15;
    }
  }

  return {
    principle: 'goal-driven',
    passed: score >= 70,
    score: Math.max(0, score),
    feedback,
    recommendation: score >= 70
      ? '✅ Goal-driven approach. Success criteria are clear and measurable.'
      : '⛔ GOAL UNCLEAR: Define explicit success criteria (tests, metrics, validation steps) before declaring done.',
  };
}

// ─── Main Export ─────────────────────────────────────────
export function validateKarpathy(input: ValidationInput): KarpathyValidation[] {
  return [
    validateThinkBeforeCoding(input),
    validateSimplicityFirst(input),
    validateSurgicalChanges(input),
    validateGoalDriven(input),
  ];
}

export function validateAll(input: ValidationInput): {
  allPassed: boolean;
  overallScore: number;
  results: KarpathyValidation[];
} {
  const results = validateKarpathy(input);
  const overallScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
  const allPassed = results.every(r => r.passed);

  return { allPassed, overallScore, results };
}

// ─── CLI Runner ───────────────────────────────────────────
if (import.meta.main) {
  const input: ValidationInput = {
    plan: process.env.KARPATHY_PLAN || '',
    complexity: (process.env.KARPATHY_COMPLEXITY as any) || 'moderate',
    estimatedLines: parseInt(process.env.KARPATHY_LINES || '0'),
    successCriteria: process.env.KARPATHY_CRITERIA?.split('|') || [],
  };

  const { allPassed, overallScore, results } = validateAll(input);

  console.log(`\n🎯 Karpathy Principles Validation — Overall: ${overallScore}/100 ${allPassed ? '✅' : '❌'}\n`);

  for (const r of results) {
    const emoji = r.passed ? '✅' : '❌';
    console.log(`${emoji} ${r.principle}: ${r.score}/100`);
    for (const f of r.feedback) {
      console.log(`   ${f}`);
    }
  }

  console.log(`\n${allPassed ? '✅ All principles satisfied. Proceed with confidence.' : '⛔ Some principles violated. Review feedback above.'}`);
  process.exit(allPassed ? 0 : 1);
}
