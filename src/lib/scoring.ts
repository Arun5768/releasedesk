import type { EvidenceCheck } from './types';
export function calculateScore(checks: EvidenceCheck[]): { score: number | null; coverage: number } {
  const total = checks.reduce((sum, c) => sum + c.weight, 0);
  const known = checks.filter(c => c.status !== 'unknown');
  const weight = known.reduce((sum, c) => sum + c.weight, 0);
  const earned = known.reduce((sum, c) => sum + c.weight * (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.5 : 0), 0);
  return { score: weight ? Math.round(earned / weight * 100) : null, coverage: total ? Math.round(weight / total * 100) : 0 };
}
