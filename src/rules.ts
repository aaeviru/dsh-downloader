import type { Candidate } from './candidate.ts'

/** Automatic submission policy using case-insensitive title substrings and a per-round candidate limit. */
export interface RuleConfig {
  readonly keywords: readonly string[]
  readonly maxPerRound: number
  readonly autoSubmit: boolean
}

/**
 * Choose which candidates this round may submit. Pure; never mutates its input.
 * @param candidates - Candidates in selection priority order.
 * @param config - Keyword matches, round limit, and automatic-submission switch.
 * @returns Matching candidates up to the limit, or an empty array when disabled or the limit is nonpositive.
 */
export function selectForSubmission(candidates: readonly Candidate[], config: RuleConfig): readonly Candidate[] {
  if (!config.autoSubmit || config.maxPerRound <= 0) return []
  const keywords = config.keywords.map(keyword => keyword.toLowerCase())
  return candidates.filter(candidate => keywords.some(keyword => candidate.title.toLowerCase().includes(keyword)))
    .slice(0, config.maxPerRound)
}
