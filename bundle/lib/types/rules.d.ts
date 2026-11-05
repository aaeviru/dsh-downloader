import type { Candidate } from './candidate.ts';
export interface RuleConfig {
    readonly keywords: readonly string[];
    readonly maxPerRound: number;
    readonly autoSubmit: boolean;
}
/** Choose which candidates this round may submit. Pure; never mutates its input. */
export declare function selectForSubmission(candidates: readonly Candidate[], config: RuleConfig): readonly Candidate[];
//# sourceMappingURL=rules.d.ts.map