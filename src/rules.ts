import type { Candidate } from './candidate.ts'

export interface RuleConfig {
  readonly keywords: readonly string[]
  readonly maxPerRound: number
  readonly autoSubmit: boolean
}

/** Choose which candidates this round may submit. Pure; never mutates its input. */
export function selectForSubmission(candidates: readonly Candidate[], config: RuleConfig): readonly Candidate[] {
  if (!config.autoSubmit || config.maxPerRound <= 0) return []
  const keywords = config.keywords.map(keyword => keyword.toLowerCase())
  return candidates.filter(candidate => keywords.some(keyword => candidate.title.toLowerCase().includes(keyword)))
    .slice(0, config.maxPerRound)
}
